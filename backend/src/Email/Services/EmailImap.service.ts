import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { simpleParser } from "mailparser";
import * as imaps from "imap-simple";
import { google } from "googleapis";
import { EmailAccountConfig } from "@Database/Table/Email/EmailAccountConfig.entity";
import { EmailCampaign } from "@Database/Table/Email/EmailCampaign.entity";
import { EmailLog } from "@Database/Table/Email/EmailLog.entity";
import { lead, LeadStatus, LeadSource } from "@Database/Table/Lead/lead";
import { lead_activity } from "@Database/Table/Lead/lead_activity";
import { EncryptionService } from "@Service/Encryption.service";
import { EmailAIService } from "./EmailAI.service";
import { EmailService } from "./Email.service";

@Injectable()
export class EmailImapService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EmailImapService.name);
  private timer: NodeJS.Timeout | null = null;
  private isPolling = false;

  constructor(
    private readonly encryptionService: EncryptionService,
    private readonly emailService: EmailService,
    private readonly aiService: EmailAIService
  ) {}

  onModuleInit() {
    // Start background poller every 60 seconds
    this.timer = setInterval(() => {
      this.pollInbox().catch((err) => this.logger.debug(`Email sync pass: ${err.message}`));
    }, 60000);
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
        existingLead.name = fromName || fromEmail.split("@")[0];
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
        // Existing lead: update phone and company if captured from email reply
        let updatedDetails = false;
        if (!existingLead.phone && extractedPhone) {
          existingLead.phone = extractedPhone;
          updatedDetails = true;
          this.logger.log(`📱 [PHONE NUMBER CAPTURED FROM EMAIL REPLY]: ${existingLead.name} -> ${extractedPhone}`);
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
    tenantId: string
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
        // Use intelligent AI Copilot with thread context
        const draft = await this.aiService.generateDraft(
          {
            from_email: fromEmail,
            subject,
            incoming_body: bodyText,
            lead_name: leadRecord?.name || fromEmail.split("@")[0],
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
        },
        "ai_auto_responder",
        true,
        tenantId
      );

      this.logger.log(`🤖 [AFTER-REPLY AUTOMATION DISPATCHED] To: ${fromEmail} | Subject: "${replySubject}"`);
    } catch (err: any) {
      this.logger.warn(`After-reply automation could not be sent: ${err.message}`);
    }
  }

  // Public sync endpoint method
  async syncNow(tenantId: string = "default") {
    return await this.pollInbox();
  }

  // Master Inbox Polling: Supports Google Gmail API and IMAP
  async pollInbox() {
    if (this.isPolling) return { synced: 0, status: "already_running" };
    this.isPolling = true;
    let syncedCount = 0;

    try {
      const config = await EmailAccountConfig.findOne({ where: { is_active: true } });
      if (!config) {
        return { synced: 0, status: "no_active_config" };
      }

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

        // Search for unread messages in INBOX
        const listRes = await gmail.users.messages.list({
          userId: "me",
          q: "is:unread label:INBOX",
          maxResults: 15,
        });

        const messages = listRes.data.messages || [];

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

            // Skip self-sent emails
            if (fromEmail.toLowerCase() === config.email_address.toLowerCase()) {
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
              // 1. Auto-Link or Create Lead in CRM & Extract Phone Number
              const { leadRecord, extractedPhone } = await this.findOrCreateLeadFromEmail(
                fromEmail,
                fromName,
                bodyText,
                subjectHeader,
                config.tenant_id
              );

              // 2. Save Inbound EmailLog
              const log = new EmailLog();
              log.tenant_id = config.tenant_id;
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
              await this.triggerAutoReply(
                fromEmail,
                subjectHeader,
                bodyText,
                leadRecord,
                !!(extractedPhone || leadRecord?.phone),
                config.tenant_id
              );
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
    } catch (err: any) {
      this.logger.debug(`Inbox polling skipped/failed: ${err.message}`);
    } finally {
      this.isPolling = false;
    }

    return { synced: syncedCount, status: "idle" };
  }
}
