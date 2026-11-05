import { redactSecrets } from "@Helper/Redact";
import { markFailed, noteFailure, noteSuccess } from "@Service/Integrations/IntegrationStatus";
import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { ModuleRef } from "@nestjs/core";
import { simpleParser } from "mailparser";
import * as imaps from "imap-simple";
import { google } from "googleapis";
import { EmailAccountConfig } from "@Database/Table/Email/EmailAccountConfig.entity";
import { EmailCampaign } from "@Database/Table/Email/EmailCampaign.entity";
import { EmailLog } from "@Database/Table/Email/EmailLog.entity";
import { lead, LeadStatus, LeadSource } from "@Database/Table/Lead/lead";
import { lead_activity } from "@Database/Table/Lead/lead_activity";
import { WhatsAppConversation } from "@Database/Table/WhatsApp/WhatsAppConversation.entity";
import { ConversationAgentState } from "@Database/Table/Agent/ConversationAgentState.entity";
import { EncryptionService } from "@Service/Encryption.service";
import { EmailAIService } from "./EmailAI.service";
import { EmailService } from "./Email.service";
import { AgentOrchestratorService } from "../../AgentOrchestrator/Services/AgentOrchestrator.service";

@Injectable()
export class EmailImapService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EmailImapService.name);
  private timer: NodeJS.Timeout | null = null;
  private isPolling = false;

  constructor(
    private readonly encryptionService: EncryptionService,
    private readonly emailService: EmailService,
    private readonly aiService: EmailAIService,
    private readonly orchestrator: AgentOrchestratorService,
    private readonly events: EventEmitter2,
    private readonly moduleRef: ModuleRef
  ) {}

  onModuleInit() {
    // Start background poller every 15 seconds
    this.timer = setInterval(() => {
      this.pollInbox().catch((err) => this.logger.debug(`Email sync pass: ${err.message}`));
    }, 15000);
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  // Smart Regex Extractor for phone numbers in email bodies & signatures
  extractPhoneNumber(text: string): string | null {
    if (!text) return null;

    // Pattern 1: Explicit labels like "Phone: +91 98765 43210", "Mobile: 555-123-4567", "WhatsApp: ..."
    const labeledRegex = /(?:phone|mobile|cell|tel|contact|whatsapp|ph|call|m)[\s:=-]+([+]?[0-9\s().-]{10,20})/i;
    const labeledMatch = text.match(labeledRegex);
    if (labeledMatch && labeledMatch[1]) {
      const digits = labeledMatch[1].replace(/\D/g, "");
      if (digits.length >= 10 && digits.length <= 15) {
        return labeledMatch[1].trim();
      }
    }

    // Pattern 2: Standalone numbers like +91 9876543210, +1 (555) 123-4567, 9876543210
    const phoneRegex = /(?:(?:\+|00)\d{1,3}[\s.-]?)?(?:\(?\d{2,5}\)?[\s.-]?)?\d{3,5}[\s.-]?\d{3,5}/g;
    const matches = text.match(phoneRegex);
    if (matches) {
      for (const match of matches) {
        const digits = match.replace(/\D/g, "");
        // Filter out dates (e.g. 20261018), zip codes, or small numbers
        if (digits.length >= 10 && digits.length <= 14 && !digits.startsWith("202")) {
          return match.trim();
        }
      }
    }

    return null;
  }

  // Smart Regex Extractor for company / organization names from bodies and domains
  extractCompanyName(fromEmail: string, bodyText: string): string | null {
    if (!fromEmail && !bodyText) return null;

    // Pattern 1: Body signature lines like "Company: Acme Corp", "Org: Tech Solutions"
    const compRegex = /(?:company|organization|firm|agency|business|corp)[\s:=-]+([A-Za-z0-9\s&.-]{2,40})/i;
    const match = bodyText.match(compRegex);
    if (match && match[1]) {
      return match[1].trim();
    }

    // Pattern 2: Professional corporate domain (excluding generic public providers)
    if (fromEmail && fromEmail.includes("@")) {
      const domain = fromEmail.split("@")[1]?.toLowerCase();
      const genericDomains = [
        "gmail.com", "googlemail.com", "yahoo.com", "ymail.com", "hotmail.com",
        "outlook.com", "live.com", "icloud.com", "mail.com", "zoho.com", "proton.me", "protonmail.com"
      ];
      if (domain && !genericDomains.includes(domain)) {
        const parts = domain.split(".");
        if (parts.length >= 2) {
          const compName = parts[0];
          return compName.charAt(0).toUpperCase() + compName.slice(1);
        }
      }
    }
    return null;
  }

  // Smart Regex Extractor for candidate/person full name from email body
  extractPersonName(bodyText: string): string | null {
    if (!bodyText) return null;

    // Pattern 1: Explicit labels like "Full Name :- Kavipriya Ashok", "Name: Kavipriya", etc.
    const nameRegex = /(?:full\s*name|candidate\s*name|my\s*name\s*is|name)[\s:=-]+([A-Za-z\s.]{2,40})/i;
    const match = bodyText.match(nameRegex);
    if (match && match[1]) {
      const candidate = match[1].trim().split(/[\r\n]/)[0].trim();
      if (candidate.length >= 2 && !/^(the|developer|engineer|tester|none|na|n\/a|is)$/i.test(candidate)) {
        return candidate;
      }
    }

    // Pattern 2: Sign-off signatures like "Best regards,\nKavi Priya" or "Thanks,\nKavipriya Ashok"
    const signoffRegex = /(?:regards|best\s*regards|warm\s*regards|thanks|thank\s*you|sincerely)[,\s\r\n]+([A-Za-z\s.]{2,35})/i;
    const signoffMatch = bodyText.match(signoffRegex);
    if (signoffMatch && signoffMatch[1]) {
      const candidate = signoffMatch[1].trim().split(/[\r\n]/)[0].trim();
      if (candidate.length >= 2 && !/^(team|sharyx|all|hiring|recruitment|hr)$/i.test(candidate)) {
        return candidate;
      }
    }

    return null;
  }

  // Extract scheduled date/time slot from email reply, thread, or lead CRM record
  extractScheduledSlot(replyHtml: string, bodyText: string, leadRecord?: lead | null): string {
    if (leadRecord?.preferred_interview_slot && leadRecord.preferred_interview_slot.trim().length > 3) {
      return leadRecord.preferred_interview_slot.trim();
    }

    const cleanText = `${replyHtml} ${bodyText}`
      .replace(/<[^>]+>/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ");

    // Pattern 1: Explicit slot labels like "Date & Time: ...", "Slot: ...", "Scheduled for: ..."
    const labelMatch = cleanText.match(
      /(?:Date\s*&?\s*Time|Scheduled\s+for|Interview\s+Slot|Slot|Timing)[\s:*_–-]+([A-Za-z0-9,:\s/–-]{4,55}?(?:IST|GMT|AM|PM|am|pm))/i
    );
    if (labelMatch && labelMatch[1]) {
      const slot = labelMatch[1].trim();
      return /IST|GMT/i.test(slot) ? slot : `${slot} IST (GMT+5:30)`;
    }

    // Pattern 2: Explicit date & time mentions (e.g. "Monday, Nov 3 at 11:00 AM", "24th Oct at 3:00 PM")
    const dateMatch = cleanText.match(
      /(?:(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*[\s,]+)?(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s,]+[0-9]{1,2}(?:st|nd|rd|th)?(?:[\s,]+[0-9]{4})?(?:[\s,]+(?:at\s+)?[0-9]{1,2}(?::[0-9]{2})?\s*(?:AM|PM|am|pm))?/i
    );
    if (dateMatch && dateMatch[0] && dateMatch[0].length >= 6) {
      const slot = dateMatch[0].trim();
      return /IST|GMT/i.test(slot) ? slot : `${slot} IST (GMT+5:30)`;
    }

    // Pattern 3: Relative weekday or day mentions (e.g. "Tomorrow at 11:00 AM", "Friday at 3 PM")
    const relMatch = cleanText.match(
      /(?:tomorrow|today|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s+at\s+[0-9]{1,2}(?::[0-9]{2})?\s*(?:AM|PM|am|pm)?/i
    );
    if (relMatch && relMatch[0]) {
      const slot = relMatch[0].trim();
      return `${slot.charAt(0).toUpperCase() + slot.slice(1)} IST (GMT+5:30)`;
    }

    return "Tomorrow at 11:00 AM IST (GMT+5:30)";
  }

  // Extract applied role or position title from subject, thread, or CRM lead
  extractAppliedRole(subject: string, bodyText: string, replyHtml: string, leadRecord?: lead | null): string {
    if (leadRecord?.job_title && leadRecord.job_title.trim().length > 1) {
      return leadRecord.job_title.trim();
    }

    const cleanText = `${subject} ${bodyText} ${replyHtml}`
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ");

    const standardRoles = [
      "AI Solutions Engineer",
      "Full Stack Developer",
      "Frontend Developer",
      "Backend Developer",
      "Software Engineer",
      "Developer",
      "Business Development Executive",
      "Sales Specialist",
      "Product Designer",
      "QA Automation Engineer",
      "HR Recruiter",
      "DevOps Engineer",
    ];
    for (const r of standardRoles) {
      if (new RegExp(`\\b${r}\\b`, "i").test(cleanText)) {
        return r;
      }
    }

    const rolePattern = /\b(?:interview for|applied for|applying for|position of|role of|job profile|position|role)[\s:*_–-]+([A-Za-z0-9\s/&.-]{3,30}?)(?=[,.\n\r<]|at\s|on\s|$)/i;
    const match = cleanText.match(rolePattern);
    if (match && match[1]) {
      const candidate = match[1].trim();
      if (!/^(the|a|an|your|this|our|scheduled|interview|demo|meeting|dear)$/i.test(candidate)) {
        return candidate;
      }
    }

    return "Candidate Role";
  }

  // Smart Candidate Phone Resolution across Lead, Email Body/Signature, WhatsApp, and Agent State
  async resolveCandidatePhone(
    bodyText: string,
    replyHtml: string,
    leadRecord: lead | null,
    fromEmail: string,
    tenantId: string = "default"
  ): Promise<string | null> {
    // 1. Extracted from incoming body text (highest priority: explicit candidate input)
    const phoneFromBody = this.extractPhoneNumber(bodyText);
    if (phoneFromBody) return phoneFromBody;

    // 2. Direct phone on CRM lead
    if (leadRecord?.phone && leadRecord.phone.trim().length >= 8) {
      return leadRecord.phone.trim();
    }

    // 3. Extracted from outbound reply text
    const phoneFromReply = this.extractPhoneNumber(replyHtml);
    if (phoneFromReply) return phoneFromReply;

    // 4. Look up in ConversationAgentState (cross-channel memory)
    try {
      const state = await ConversationAgentState.findOne({
        where: [
          { conversation_ref: fromEmail.toLowerCase() },
          { customer_email: fromEmail.toLowerCase() },
        ],
        order: { updated_on: "DESC" },
      });
      if (state?.customer_phone && state.customer_phone.trim().length >= 8) {
        return state.customer_phone.trim();
      }
      if (state?.collected_slots?.phone) {
        return String(state.collected_slots.phone).trim();
      }
      if (state?.collected_slots?.mobile) {
        return String(state.collected_slots.mobile).trim();
      }
    } catch {}

    // 5. Look up in WhatsAppConversation by customer name
    try {
      if (leadRecord?.name) {
        const waConv = await WhatsAppConversation.findOne({
          where: { customer_name: leadRecord.name, tenant_id: tenantId },
          order: { updated_on: "DESC" },
        });
        if (waConv?.customer_phone && waConv.customer_phone.trim().length >= 8) {
          return waConv.customer_phone.trim();
        }
      }
    } catch {}

    return null;
  }

  // Find or Create Lead in CRM with extracted details (mirroring WhatsApp automation)
  async findOrCreateLeadFromEmail(
    fromEmail: string,
    fromName: string,
    bodyText: string,
    subject: string,
    tenantId: string = "default"
  ): Promise<{ leadRecord: lead; extractedPhone: string | null; extractedCompany: string | null }> {
    const extractedPhone = this.extractPhoneNumber(bodyText);
    const extractedCompany = this.extractCompanyName(fromEmail, bodyText);
    const extractedName = this.extractPersonName(bodyText);
    let existingLead: lead | null = null;

    try {
      // 1. Try finding by email
      existingLead = await lead.findOne({
        where: { email: fromEmail, status: true },
      });

      // 2. If not found by email and we extracted a phone number, try by phone
      if (!existingLead && extractedPhone) {
        existingLead = await lead.findOne({
          where: { phone: extractedPhone, status: true },
        });
      }

      if (!existingLead) {
        // Create brand new Lead from inbound email
        existingLead = new lead();
        existingLead.name = extractedName || fromName || fromEmail.split("@")[0];
        existingLead.email = fromEmail;
        existingLead.phone = extractedPhone || null;
        existingLead.company_name = extractedCompany || null;
        existingLead.source = LeadSource.EMAIL;
        existingLead.lead_status = LeadStatus.NEW;
        existingLead.score = extractedPhone ? 75 : 60;
        existingLead.notes = `Inbound Inquiry via Email: "${subject}"${extractedPhone ? ` | Extracted Phone: ${extractedPhone}` : ""}${extractedCompany ? ` | Company: ${extractedCompany}` : ""}`;
        existingLead.tenant_id = tenantId;
        existingLead.created_by_id = "email_inbound";
        existingLead.created_on = new Date();
        await existingLead.save();

        this.logger.log(`🎯 [NEW LEAD CREATED FROM EMAIL] Name: ${existingLead.name} | Email: ${existingLead.email} | Phone: ${existingLead.phone || "None"} | Company: ${existingLead.company_name || "None"}`);

        // Insert first activity record
        const act = new lead_activity();
        act.lead_id = existingLead.id;
        act.activity_type = "EMAIL";
        act.title = "Inbound Email Inquiry";
        act.description = `From: ${fromEmail}${extractedPhone ? ` | Phone: ${extractedPhone}` : ""}${extractedCompany ? ` | Company: ${extractedCompany}` : ""}\nSubject: ${subject}`;
        act.performer_name = existingLead.name;
        act.tenant_id = tenantId;
        act.created_by_id = "email_inbound";
        act.created_on = new Date();
        await act.save();
      } else {
        // Existing lead: update name, phone and company if captured from email reply
        let updatedDetails = false;
        if (extractedName && existingLead.name !== extractedName) {
          this.logger.log(`👤 [NAME UPDATED FROM EMAIL BODY]: ${existingLead.name} -> ${extractedName}`);
          existingLead.name = extractedName;
          updatedDetails = true;
        }
        if (extractedPhone && existingLead.phone !== extractedPhone) {
          this.logger.log(`📱 [PHONE NUMBER CAPTURED FROM EMAIL REPLY]: ${existingLead.name} -> ${extractedPhone}`);
          existingLead.phone = extractedPhone;
          updatedDetails = true;
        }
        if (!existingLead.company_name && extractedCompany) {
          existingLead.company_name = extractedCompany;
          updatedDetails = true;
          this.logger.log(`🏢 [COMPANY NAME CAPTURED FROM EMAIL REPLY]: ${existingLead.name} -> ${extractedCompany}`);
        }
        existingLead.last_contacted_at = new Date();
        await existingLead.save();

        const act = new lead_activity();
        act.lead_id = existingLead.id;
        act.activity_type = "EMAIL";
        act.title = `Inbound Email Reply: ${subject}`;
        act.description = `Reply received: ${bodyText.slice(0, 250)}${extractedPhone ? ` | Captured Phone: ${extractedPhone}` : ""}`;
        act.performer_name = existingLead.name || fromEmail;
        act.tenant_id = existingLead.tenant_id || tenantId;
        act.created_by_id = "email_inbound";
        act.created_on = new Date();
        await act.save();
      }
    } catch (leadErr: any) {
      this.logger.warn(`Could not auto-link lead: ${leadErr.message}`);
    }

    return { leadRecord: existingLead!, extractedPhone, extractedCompany };
  }

  // Trigger automatic AI reply or after_reply Campaign Sequence
  private async triggerAutoReply(
    fromEmail: string,
    subject: string,
    bodyText: string,
    leadRecord: lead | null,
    hasPhone: boolean,
    tenantId: string,
    threadId?: string,
    inReplyTo?: string
  ) {
    const aiConfig = await this.aiService.getConfig(tenantId);
    if (!aiConfig || !aiConfig.auto_reply_enabled) return;

    try {
      // 1. Fetch recent conversation thread to provide rich context to AI
      let recentThread: EmailLog[] = [];
      try {
        recentThread = await EmailLog.find({
          where: [
            { to_email: fromEmail, tenant_id: tenantId },
            { from_email: fromEmail, tenant_id: tenantId },
          ],
          order: { created_on: "DESC" },
          take: 4,
        });
      } catch {}

      const conversationHistory = recentThread
        .reverse()
        .map((m) => ({
          direction: m.direction || "inbound",
          body: m.body_text || m.subject,
        }));

      // 2. Check if a customized 'after_reply' email campaign is configured
      const activeCampaign = await EmailCampaign.findOne({
        where: {
          tenant_id: tenantId,
          trigger_event: "after_reply",
          is_active: true,
        },
      });

      let replySubject = subject.startsWith("Re:") ? subject : `Re: ${subject || "Inquiry"}`;
      let replyHtml = "";

      if (activeCampaign && activeCampaign.html_template) {
        // Variable interpolation for campaign template
        let templated = activeCampaign.html_template;
        const recipientName = leadRecord?.name || fromEmail.split("@")[0];
        const company = leadRecord?.company_name || "your company";
        templated = templated.replace(/{{name}}/g, recipientName);
        templated = templated.replace(/{{company}}/g, company);
        templated = templated.replace(/{{subject}}/g, subject);

        replySubject = activeCampaign.subject.replace(/{{name}}/g, recipientName);
        replyHtml = `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b;">${templated}</div>`;
      } else {
        // 2. Autonomous AI Responder logic using configured Email AI Brain
        const draft = await this.aiService.generateDraft(
          {
            from_email: fromEmail,
            subject,
            incoming_body: bodyText,
            lead_name: this.extractPersonName(bodyText) || leadRecord?.name || fromEmail.split("@")[0],
            conversation_history: conversationHistory,
            has_phone: hasPhone,
            phone_number: leadRecord?.phone || undefined,
            company_name: leadRecord?.company_name || undefined,
          },
          tenantId
        );

        if (!draft?.draft) return;
        replySubject = draft.subject;
        replyHtml = `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b;">${draft.draft.replace(/\n/g, "<br/>")}</div>`;
      }

      // 3. Dispatch outbound reply via Gmail REST API
      await this.emailService.sendEmail(
        {
          to: fromEmail,
          subject: replySubject,
          html: replyHtml,
          lead_id: leadRecord?.id,
          bypassValidation: true,
          threadId,
          inReplyTo,
        },
        "ai_auto_responder",
        true,
        tenantId
      );

      this.logger.log(`🤖 [AFTER-REPLY AUTOMATION DISPATCHED] To: ${fromEmail} | Subject: "${replySubject}"`);

      // After interview / demo scheduled with Google Meet: trigger automated call via connected voice platform
      const hasGMeet = /meet\.google\.com/i.test(replyHtml);
      const isInterview = /(?:interview|candidate|job|applicant|hiring|application|vacancy|resume)/i.test(
        `${subject} ${bodyText} ${replySubject} ${replyHtml}`
      );
      const isBooking = hasGMeet || /(?:interview|demo|meeting)[\s\w]*(?:confirmed|scheduled|booked|invite)/i.test(replyHtml);

      if (isBooking) {
        const resolvedPhone = await this.resolveCandidatePhone(bodyText, replyHtml, leadRecord, fromEmail, tenantId);

        if (resolvedPhone) {
          // If lead record exists but didn't have phone saved, save it now!
          if (leadRecord && !leadRecord.phone) {
            leadRecord.phone = resolvedPhone;
            await leadRecord.save().catch(() => {});
          }

          const meetMatch = replyHtml.match(/https:\/\/meet\.google\.com\/[a-z0-9-]+/i);
          const meetUrl = meetMatch ? meetMatch[0] : (leadRecord?.interview_link || "https://meet.google.com");

          const scheduledSlot = this.extractScheduledSlot(replyHtml, bodyText, leadRecord);
          const appliedRole = this.extractAppliedRole(subject, bodyText, replyHtml, leadRecord);
          const customerName = leadRecord?.name || fromEmail.split("@")[0];

          // Persist slot and meet link to lead record for CRM synchronization
          if (leadRecord) {
            if (!leadRecord.preferred_interview_slot) leadRecord.preferred_interview_slot = scheduledSlot;
            if (!leadRecord.interview_link) leadRecord.interview_link = meetUrl;
            if (isInterview && !leadRecord.job_title && appliedRole !== "Candidate Role") leadRecord.job_title = appliedRole;
            await leadRecord.save().catch(() => {});
          }

          const reason = isInterview
            ? `Interview for ${appliedRole} scheduled for ${scheduledSlot}`
            : `Product demo scheduled for ${scheduledSlot}`;

          const emailSummary = `Email thread with ${fromEmail} | ${
            isInterview ? 'Interview Invitation' : 'Demo Booking'
          } | Role: ${appliedRole} | Scheduled Slot: ${scheduledSlot} | Meet Link: ${meetUrl}`;

          this.events.emit("voice.call.requested", {
            tenantId,
            phone: resolvedPhone,
            customerName,
            scheduledType: isInterview ? "interview" : "demo",
            reason,
            meetingSlot: scheduledSlot,
            meetUrl,
            leadId: leadRecord?.id,
            agentKey: isInterview ? "recruitment" : "sales",
            appliedRole,
            customVariables: {
              applied_role: appliedRole,
              meeting_slot: scheduledSlot,
              meet_url: meetUrl,
              email_summary: emailSummary,
              scheduled_slot: scheduledSlot,
              role: appliedRole,
              discussion_points: isInterview
                ? `Confirming interview attendance for ${appliedRole} on ${scheduledSlot}. Google Meet: ${meetUrl}. Addressing candidate questions.`
                : `Confirming product demo on ${scheduledSlot}. Google Meet: ${meetUrl}.`,
            },
          });

          this.logger.log(
            `📞 [VOICE CALL TRIGGERED AFTER EMAIL INTERVIEW SCHEDULED] Dispatched call to ${resolvedPhone} | Role: "${appliedRole}" | Slot: "${scheduledSlot}" | Meet: ${meetUrl}`
          );

          // Omnichannel sync: Dispatch interview confirmation & Google Meet link to WhatsApp as well!
          try {
            const { WhatsAppService } = await import("../../WhatsApp/Services/WhatsApp.service");
            const waService = this.moduleRef.get(WhatsAppService, { strict: false });
            const waText = `Hello ${customerName}! 👋\n\nYour interview for the *${appliedRole}* role has been confirmed for *${scheduledSlot}*.\n\n🎥 *Google Meet Link*: ${meetUrl}\n\nWe have also sent the confirmation details to your email (${fromEmail}). Looking forward to speaking with you! 🚀`;
            await waService.sendMessage({
              to: resolvedPhone,
              text: waText,
              message_type: "text",
            }, "system", true, tenantId);
            this.logger.log(`💬 [WHATSAPP CONFIRMATION TRIGGERED FROM EMAIL] Sent meet link to WhatsApp: ${resolvedPhone}`);
          } catch (waErr: any) {
            this.logger.warn(`Could not dispatch WhatsApp confirmation from email flow: ${waErr.message}`);
          }
        } else {
          this.logger.warn(
            `📞 [VOICE CALL SKIPPED] ${fromEmail} scheduled ${
              isInterview ? "interview" : "demo"
            }, but no phone number could be resolved from email body, CRM lead, or WhatsApp threads.`
          );
        }
      }
    } catch (err: any) {
      this.logger.warn(`After-reply automation could not be sent: ${err.message}`);
    }
  }

  // Public sync endpoint method
  async syncNow(tenantId: string = "default") {
    return await this.pollInbox();
  }

  // Helper to filter out bounce notifications, system bots, daemons, and no-reply emails
  private isSystemOrAutomatedEmail(
    fromEmail: string,
    subject: string,
    headers: Array<{ name?: string; value?: string }> = []
  ): boolean {
    const emailLower = (fromEmail || "").toLowerCase();
    const subjectLower = (subject || "").toLowerCase();

    // 1. Senders to ignore
    const systemSenders = [
      "mailer-daemon",
      "postmaster",
      "no-reply",
      "noreply",
      "donotreply",
      "do-not-reply",
      "bounce",
      "notifications@",
      "notification@",
      "alert@",
      "alerts@",
      "automated@",
      "system@",
    ];
    if (systemSenders.some((s) => emailLower.includes(s))) {
      return true;
    }

    // 2. Subject keywords indicating delivery failures / system notices / vacation
    const systemSubjects = [
      "delivery status notification",
      "undeliverable",
      "returned mail",
      "failure notice",
      "mail delivery failed",
      "automatic reply",
      "out of office",
      "auto-reply",
      "delivery failure",
    ];
    if (systemSubjects.some((s) => subjectLower.includes(s))) {
      return true;
    }

    // 3. Automated headers
    const autoSubmitted = headers.find((h) => h.name?.toLowerCase() === "auto-submitted")?.value?.toLowerCase();
    if (autoSubmitted && autoSubmitted !== "no") {
      return true;
    }

    const precedence = headers.find((h) => h.name?.toLowerCase() === "precedence")?.value?.toLowerCase();
    if (precedence && ["bulk", "junk", "auto_reply"].includes(precedence)) {
      return true;
    }

    const xAutoReply = headers.find((h) => h.name?.toLowerCase() === "x-autoreply")?.value?.toLowerCase();
    if (xAutoReply === "yes") {
      return true;
    }

    const xSharyx = headers.find((h) => h.name?.toLowerCase() === "x-sharyx-auto-reply")?.value?.toLowerCase();
    if (xSharyx === "true") {
      return true;
    }

    return false;
  }

  // Master Inbox Polling: Supports Google Gmail API and IMAP. EVERY active mailbox (one per tenant) is polled, and
  // each result updates that tenant's email_imap status (login fails => Failed, timeout => Degraded, works => Connected).
  async pollInbox() {
    if (this.isPolling) return { synced: 0, status: "already_running" };
    this.isPolling = true;
    let total = 0;

    try {
      // Default (unchanged behaviour): the first active mailbox only. EMAIL_POLL_ALL_MAILBOXES=true polls every
      // tenant's mailbox (the correct multi-tenant behaviour) - opt-in because it starts reading and auto-replying
      // on every connected mailbox of the environment it is switched on in.
      const configs = process.env.EMAIL_POLL_ALL_MAILBOXES === "true"
        ? await EmailAccountConfig.find({ where: { is_active: true } })
        : ([await EmailAccountConfig.findOne({ where: { is_active: true } })].filter(Boolean) as EmailAccountConfig[]);
      if (!configs.length) {
        return { synced: 0, status: "no_active_config" };
      }
      for (const config of configs) {
        try {
          const r: any = await this.pollOneMailbox(config);
          total += r?.synced || 0;
          if (r?.status === "insufficient_scopes") {
            await markFailed(
              config.tenant_id,
              "email_imap",
              "GMAIL_SCOPES",
              "Google is connected but without permission to read your inbox. Reconnect Google and tick every permission box.",
              config.email_address
            );
          } else if (r && (r.provider || r.status === "idle")) {
            if (r.provider) void noteSuccess(config.tenant_id, "email_imap", config.email_address);
          }
        } catch (err: any) {
          this.logger.debug(`Inbox polling skipped/failed for tenant ${config.tenant_id}: ${redactSecrets(err.message)}`);
          await noteFailure(config.tenant_id, "email_imap", err, config.email_address);
        }
      }
      return { synced: total, status: "ok" };
    } catch (err: any) {
      this.logger.debug(`Inbox polling skipped/failed: ${redactSecrets(err.message)}`);
    } finally {
      this.isPolling = false;
    }

    return { synced: total, status: "idle" };
  }

  /** One tenant's mailbox: Gmail API or IMAP. Throws on connection/auth errors (the caller turns them into status). */
  private async pollOneMailbox(config: EmailAccountConfig): Promise<{ synced: number; provider?: string; status?: string }> {
    let syncedCount = 0;
    // ── MODE A: GOOGLE GMAIL API (HTTPS 443) ──────────────────────────
    if (config.provider === "google-email" && config.refresh_token) {
      let decryptedRefreshToken = config.refresh_token;
      try {
        decryptedRefreshToken = this.encryptionService.Decrypt(config.refresh_token);
      } catch {
        decryptedRefreshToken = config.refresh_token;
      }

      const oauth2Client = new google.auth.OAuth2(
        config.client_id || process.env.GOOGLE_CLIENT_ID,
        config.client_secret || process.env.GOOGLE_CLIENT_SECRET
      );
      oauth2Client.setCredentials({ refresh_token: decryptedRefreshToken });
      const gmail = google.gmail({ version: "v1", auth: oauth2Client });

      let messages: any[] = [];
      try {
        // Search for recent incoming messages in INBOX
        const listRes = await gmail.users.messages.list({
          userId: "me",
          q: "label:INBOX",
          maxResults: 20,
        });
        messages = listRes.data.messages || [];
      } catch (apiErr: any) {
        if (apiErr.message?.includes('insufficient authentication scopes') || apiErr.code === 403) {
          // User account only has login/identity scopes, not full Gmail reading scopes
          return { synced: 0, status: "insufficient_scopes" };
        }
        throw apiErr;
      }

      for (const item of messages) {
        if (!item.id) continue;
        try {
          const msg = await gmail.users.messages.get({
            userId: "me",
            id: item.id,
            format: "full",
          });

          const headers = msg.data.payload?.headers || [];
          const fromHeader = headers.find((h) => h.name?.toLowerCase() === "from")?.value || "";
          const subjectHeader = headers.find((h) => h.name?.toLowerCase() === "subject")?.value || "No Subject";
          const messageIdHeader = headers.find((h) => h.name?.toLowerCase() === "message-id")?.value || `gmail_${item.id}`;

          // Parse From header: e.g. "John Doe <john@company.com>"
          let fromEmail = fromHeader;
          let fromName = fromHeader;
          const match = fromHeader.match(/^(.*?)\s*<(.+?)>$/);
          if (match) {
            fromName = match[1].replace(/["']/g, "").trim();
            fromEmail = match[2].trim();
          }

          const isSelfSent = fromEmail.toLowerCase() === (config.email_address || "").toLowerCase();

          // Skip bounces, system alerts, mailer-daemon, and no-reply messages
          if (this.isSystemOrAutomatedEmail(fromEmail, subjectHeader, headers)) {
            this.logger.log(`🛡️ [EMAIL FILTER] Ignored system/no-reply email from ${fromEmail} | Subject: "${subjectHeader}"`);
            // Mark as read so we don't process it every poll
            try {
              await gmail.users.messages.modify({
                userId: "me",
                id: item.id,
                requestBody: { removeLabelIds: ["UNREAD"] },
              });
            } catch {}
            continue;
          }

          // Extract plain text body
          let bodyText = "";
          let bodyHtml = "";
          const parts = msg.data.payload?.parts;
          if (parts && parts.length > 0) {
            for (const p of parts) {
              if (p.mimeType === "text/plain" && p.body?.data) {
                bodyText = Buffer.from(p.body.data, "base64").toString("utf-8");
              }
              if (p.mimeType === "text/html" && p.body?.data) {
                bodyHtml = Buffer.from(p.body.data, "base64").toString("utf-8");
              }
            }
          } else if (msg.data.payload?.body?.data) {
            bodyText = Buffer.from(msg.data.payload.body.data, "base64").toString("utf-8");
          }

          // Check if already processed
          const exists = await EmailLog.findOne({ where: { message_id: messageIdHeader } });
          if (!exists) {
            const targetTenant = config.tenant_id;

            // 1. Auto-Link or Create Lead in CRM & Extract Phone Number
            const { leadRecord, extractedPhone } = await this.findOrCreateLeadFromEmail(
              fromEmail,
              fromName,
              bodyText,
              subjectHeader,
              targetTenant
            );

            // 2. Save Inbound EmailLog
            const log = new EmailLog();
            log.tenant_id = targetTenant;
            log.lead_id = leadRecord?.id || null;
            log.from_email = fromEmail;
            log.to_email = config.email_address;
            log.subject = subjectHeader;
            log.body_text = bodyText;
            log.body_html = bodyHtml || `<p>${bodyText}</p>`;
            log.direction = "inbound";
            log.delivery_status = "received";
            log.message_id = messageIdHeader;
            log.created_by_id = "gmail_api_sync";
            log.created_on = new Date();
            await log.save();
            syncedCount++;

            // 3. Mark message as read in Gmail (safe execution)
            try {
              await gmail.users.messages.modify({
                userId: "me",
                id: item.id,
                requestBody: { removeLabelIds: ["UNREAD"] },
              });
            } catch (modifyErr: any) {
              this.logger.debug(`Could not update unread label: ${modifyErr.message}`);
            }

            // 4. Trigger Autonomous AI Reply
            const isAiAutoReplyLoop =
              subjectHeader.toLowerCase().includes("[ai auto-reply]") ||
              headers.some((h) => (h.name?.toLowerCase() === "x-sharyx-auto-reply" && h.value?.toLowerCase() === "true") || (h.name?.toLowerCase() === "auto-submitted" && h.value?.toLowerCase() !== "no"));

            // Check if this message was actually generated by the system's own outbound dispatch
            const wasDispatchedBySystem = await EmailLog.findOne({
              where: { message_id: messageIdHeader, direction: "outbound" },
            });

            // Allow self-sent testing if it's a genuine user message and not an outbound bot echo
            const isBotEcho = wasDispatchedBySystem || isAiAutoReplyLoop || (isSelfSent && (bodyText.includes("Best regards,\nSharyx") || bodyText.includes("Sharyx AI Team") || bodyText.includes("Sharyx Talent Acquisition")));

            if (!isBotEcho) {
              this.logger.log(`🤖 Triggering AI Auto-Reply for inbound email from: ${fromEmail} | Subject: "${subjectHeader}"`);
              await this.triggerAutoReply(
                fromEmail,
                subjectHeader,
                bodyText,
                leadRecord,
                !!(extractedPhone || leadRecord?.phone),
                targetTenant,
                msg.data.threadId || undefined,
                messageIdHeader || undefined
              );
            } else {
              this.logger.log(`🛡️ Skipping auto-reply for system outbound/bot echo from: ${fromEmail}`);
            }
          }
        } catch (msgErr: any) {
          this.logger.warn(`Could not process Gmail message ${item.id}: ${msgErr.message}`);
        }
      }

      return { synced: syncedCount, provider: "google-email" };
    }

    // ── MODE B: STANDARD IMAP POLLER ──────────────────────────────────
    if (config.imap_host && config.smtp_user) {
      let password = config.smtp_password;
      try {
        password = this.encryptionService.Decrypt(config.smtp_password);
      } catch {
        // Plain text fallback
      }

      const imapConfig: imaps.ImapSimpleOptions = {
        imap: {
          user: config.smtp_user,
          password: password,
          host: config.imap_host,
          port: config.imap_port || 993,
          tls: config.use_ssl ?? true,
          authTimeout: 5000,
        },
      };

      const connection = await imaps.connect(imapConfig);
      await connection.openBox("INBOX");

      const searchCriteria = ["UNSEEN"];
      const fetchOptions = {
        bodies: ["HEADER", "TEXT", ""],
        markSeen: true,
      };

      const messages = await connection.search(searchCriteria, fetchOptions);

      for (const item of messages) {
        const all = item.parts.find((part) => part.which === "");
        const id = item.attributes.uid;
        const idHeader = `Imap-UID: ${id}`;

        if (all) {
          const parsed = await simpleParser(all.body);
          const fromEmail = parsed.from?.value?.[0]?.address || "unknown@client.com";
          const fromName = parsed.from?.value?.[0]?.name || fromEmail.split("@")[0];
          const subject = parsed.subject || "No Subject";
          const bodyText = parsed.text || "";
          const bodyHtml = (parsed.html as string) || `<p>${bodyText}</p>`;
          const messageId = parsed.messageId || `${idHeader}`;

          // Skip self-sent emails
          if (fromEmail.toLowerCase() === config.email_address?.toLowerCase()) {
            continue;
          }

          // Skip bounces, system alerts, mailer-daemon, and no-reply messages
          if (this.isSystemOrAutomatedEmail(fromEmail, subject)) {
            this.logger.log(`🛡️ [EMAIL FILTER] Ignored system/no-reply email from ${fromEmail} | Subject: "${subject}"`);
            continue;
          }

          // Check if already processed
          const exists = await EmailLog.findOne({ where: { message_id: messageId } });
          if (!exists) {
            // 1. Auto-Link / Create Lead in CRM with extracted Phone
            const { leadRecord, extractedPhone } = await this.findOrCreateLeadFromEmail(
              fromEmail,
              fromName,
              bodyText,
              subject,
              config.tenant_id
            );

            // 2. Save Inbound EmailLog
            const log = new EmailLog();
            log.tenant_id = config.tenant_id;
            log.lead_id = leadRecord?.id || null;
            log.from_email = fromEmail;
            log.to_email = config.email_address;
            log.subject = subject;
            log.body_text = bodyText;
            log.body_html = bodyHtml;
            log.direction = "inbound";
            log.delivery_status = "received";
            log.message_id = messageId;
            log.created_by_id = "imap_poller";
            log.created_on = new Date();
            await log.save();
            syncedCount++;

            // 3. Trigger Autonomous AI Reply
            await this.triggerAutoReply(
              fromEmail,
              subject,
              bodyText,
              leadRecord,
              !!(extractedPhone || leadRecord?.phone),
              config.tenant_id
            );
          }
        }
      }

      await connection.end();
      return { synced: syncedCount, provider: "smtp_imap" };
    }

    return { synced: syncedCount, status: "idle" };
  }
}
