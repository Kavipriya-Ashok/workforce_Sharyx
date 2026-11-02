import { Injectable, Logger } from "@nestjs/common";
import { EmailCampaign } from "@Database/Table/Email/EmailCampaign.entity";
import { EmailTemplate } from "@Database/Table/Email/EmailTemplate.entity";
import { EmailLog } from "@Database/Table/Email/EmailLog.entity";
import { lead } from "@Database/Table/Lead/lead";
import { WhatsAppCampaign } from "@Database/Table/WhatsApp/WhatsAppCampaign.entity";
import { WhatsAppTemplate } from "@Database/Table/WhatsApp/WhatsAppTemplate.entity";
import { WhatsAppConfig } from "@Database/Table/WhatsApp/WhatsAppConfig.entity";
import { WhatsAppConversation } from "@Database/Table/WhatsApp/WhatsAppConversation.entity";
import { WhatsAppMessage } from "@Database/Table/WhatsApp/WhatsAppMessage.entity";
import { PdfGeneratorService, PdfData, PdfTemplateType } from "@Service/PdfGenerator.service";
import { Like } from "typeorm";
import axios from "axios";
import { EmailService } from "@Email/Services/Email.service";
import { AgentLlmService } from "../AgentOrchestrator/Services/AgentLlm.service";

export interface TriggerContext {
  tenantId: string;
  phone?: string;
  email?: string;
  leadName?: string;
  outcome?: string;
  callSummary?: string;
  agentName?: string;
  meetUrl?: string;
  dealValue?: number;
  currency?: string;
  jobTitle?: string;
  company?: string;
  dashboardUrl?: string;
  /** 1-click Google Calendar "add event" URL (set automatically for meeting outcomes) */
  calendarUrl?: string;
  /** LLM-personalised WhatsApp follow-up text (set automatically when an LLM key is configured) */
  llmWhatsApp?: string;
  /** LLM-personalised email paragraph (set automatically when an LLM key is configured) */
  llmEmailParagraph?: string;
}

// ─── Meeting helpers ─────────────────────────────────────────────────────────
function isMeetingOutcome(event: string, outcome?: string): boolean {
  return (
    ["appointment_booked", "demo_booked", "interview_booked", "meeting_scheduled"].includes(event) ||
    /appointment|demo|interview|schedule|placement|booked/i.test(outcome || "")
  );
}

function generateMeetSlug(): string {
  const r = (n: number) => Math.random().toString(36).replace(/[^a-z]/g, "").padEnd(n, "x").slice(0, n);
  return `https://meet.google.com/${r(3)}-${r(4)}-${r(3)}`;
}

/** Builds a 1-click Google Calendar link (defaults to tomorrow 11:00 IST, 30 min). */
function buildCalendarUrl(title: string, details: string, meetUrl?: string): string {
  const start = new Date();
  start.setDate(start.getDate() + 1);
  start.setUTCHours(5, 30, 0, 0); // 11:00 IST
  const end = new Date(start.getTime() + 30 * 60000);
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${fmt(start)}/${fmt(end)}`,
    details: `${details}${meetUrl ? `\n\nGoogle Meet: ${meetUrl}` : ""}`,
    location: meetUrl || "Google Meet",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

// ─── 8-Tier Outcome Fuzzy Matcher ─────────────────────────────────────────────
function isOutcomeMatch(filterOutcome: string, currentOutcome: string): boolean {
  if (!filterOutcome || filterOutcome.toUpperCase() === "ALL") return true;
  if (!currentOutcome) return filterOutcome.toUpperCase() === "ALL";

  const f = filterOutcome.toLowerCase().trim();
  const o = currentOutcome.toLowerCase().trim();

  // Guard: explicitly not-interested blocks positive filters
  const notInterestedSignals = ["not interested", "no interest", "uninterested", "not looking", "remove me", "don't call"];
  const isNegative = notInterestedSignals.some(n => o.includes(n));
  const positiveFilters = ["interested", "demo", "meeting", "appointment", "proposal", "quote", "won", "deal", "site visit", "callback"];
  if (isNegative && positiveFilters.some(p => f.includes(p))) return false;

  // Tier 1: Direct normalized match
  if (o === f || o.replace(/\s+/g, "_") === f.replace(/\s+/g, "_")) return true;
  if (o.includes(f) || f.includes(o)) return true;

  // Tier 2: Interested
  if (f.includes("interested") && (o.includes("interested") || o.includes("keen") || o.includes("want") || o.includes("yes"))) return true;

  // Tier 3: Price Objection / Budget
  if ((f.includes("price") || f.includes("budget") || f.includes("cost")) &&
      (o.includes("price") || o.includes("budget") || o.includes("expensive") || o.includes("cost") || o.includes("afford"))) return true;

  // Tier 4: Demo / Meeting / Appointment / Interview
  if ((f.includes("demo") || f.includes("meeting") || f.includes("appointment") || f.includes("site visit") || f.includes("interview") || f.includes("schedule")) &&
      (o.includes("demo") || o.includes("meet") || o.includes("appoint") || o.includes("site") || o.includes("visit") || o.includes("schedule") || o.includes("book") || o.includes("interview") || o.includes("placement"))) return true;

  // Tier 5: Callback
  if (f.includes("callback") && (o.includes("call back") || o.includes("callback") || o.includes("call me") || o.includes("ring"))) return true;

  // Tier 6: Transfer / Handoff
  if ((f.includes("transfer") || f.includes("handoff")) && (o.includes("transfer") || o.includes("handoff") || o.includes("handed"))) return true;

  // Tier 7: Proposal / Quote / Pricing / Quotation / WhatsApp Details
  if ((f.includes("proposal") || f.includes("quote") || f.includes("quotation") || f.includes("pricing") || f.includes("whatsapp") || f.includes("details")) &&
      (o.includes("proposal") || o.includes("quote") || o.includes("quotation") || o.includes("pricing") || o.includes("cost") || o.includes("pricing sheet") || o.includes("whatsapp") || o.includes("details") || o.includes("info"))) return true;

  // Tier 8: Invoice / Billing
  if ((f.includes("invoice") || f.includes("billing")) && (o.includes("invoice") || o.includes("bill") || o.includes("receipt") || o.includes("payment"))) return true;

  // Not interested filter match
  if (f.includes("not interested") && isNegative) return true;

  return false;
}

// ─── Placeholder Substitution ─────────────────────────────────────────────────
function substitutePlaceholders(text: string, ctx: TriggerContext, leadRecord?: lead): string {
  const name = ctx.leadName || leadRecord?.name || "Valued Lead";
  const company = ctx.company || leadRecord?.company_name || "";
  const phone = ctx.phone || leadRecord?.phone || "";
  const email = ctx.email || leadRecord?.email || "";
  const job = ctx.jobTitle || leadRecord?.job_title || "";
  const deal = ctx.dealValue ? String(ctx.dealValue) : leadRecord?.deal_value ? String(leadRecord.deal_value) : "";
  const currency = ctx.currency || leadRecord?.currency || "INR";
  const date = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });

  return text
    .replace(/\{\{lead_name\}\}|\{\{name\}\}|\{\{customer_name\}\}/gi, name)
    .replace(/\{\{company\}\}|\{\{company_name\}\}|\{\{brand\}\}/gi, company || "your company")
    .replace(/\{\{phone\}\}|\{\{lead_phone\}\}/gi, phone)
    .replace(/\{\{email\}\}|\{\{lead_email\}\}/gi, email)
    .replace(/\{\{job_title\}\}|\{\{role\}\}/gi, job)
    .replace(/\{\{deal_value\}\}|\{\{price\}\}/gi, deal)
    .replace(/\{\{currency\}\}/gi, currency)
    .replace(/\{\{call_summary\}\}|\{\{summary\}\}/gi, ctx.callSummary || "")
    .replace(/\{\{outcome\}\}/gi, ctx.outcome || "")
    .replace(/\{\{agent_name\}\}|\{\{agent\}\}/gi, ctx.agentName || "Sharyx AI")
    .replace(/\{\{meet_url\}\}|\{\{meeting_url\}\}|\{\{link\}\}/gi, ctx.meetUrl || "https://meet.google.com")
    .replace(/\{\{calendar_url\}\}/gi, ctx.calendarUrl || "")
    .replace(/\{\{llm_message\}\}|\{\{ai_message\}\}/gi, ctx.llmEmailParagraph || ctx.llmWhatsApp || ctx.callSummary || "")
    .replace(/\{\{date\}\}/gi, date)
    .replace(/\{\{dashboard_url\}\}/gi, ctx.dashboardUrl || "https://app.sharyx.com")
    // WA-style {{1}} {{2}} {{3}}
    .replace(/\{\{1\}\}/g, name)
    .replace(/\{\{2\}\}/g, ctx.callSummary || ctx.outcome || "")
    .replace(/\{\{3\}\}/g, ctx.meetUrl || "");
}

// ─── Lead Lookup by phone ─────────────────────────────────────────────────────
async function resolveLeadByPhone(phone: string, tenantId: string): Promise<lead | null> {
  if (!phone) return null;
  const last10 = phone.replace(/\D/g, "").slice(-10);
  try {
    return await lead.findOne({ where: { phone: Like(`%${last10}`), tenant_id: tenantId } });
  } catch {
    return null;
  }
}

// ─── Shared Outcome Trigger Service ──────────────────────────────────────────
@Injectable()
export class OutcomeTriggerService {
  private readonly logger = new Logger(OutcomeTriggerService.name);
  private readonly recentDispatches = new Map<string, number>();
  private readonly llm = new AgentLlmService();

  constructor(
    private readonly emailService: EmailService,
    private readonly pdfService: PdfGeneratorService,
  ) {}

  /**
   * Uses Gemini / OpenAI to write a warm, context-aware WhatsApp message + email paragraph
   * from the call summary, outcome and meeting link. Returns nulls if no LLM key is configured
   * or the call fails, so callers fall back to the static templates.
   */
  private async generateLlmFollowup(
    ctx: TriggerContext
  ): Promise<{ whatsapp: string | null; email: string | null }> {
    if (!this.llm.isAvailable()) return { whatsapp: null, email: null };

    const systemPrompt = `You are a warm, professional client concierge for Sharyx AI (AI Voice, WhatsApp & Email automation).
A phone call with a customer just ended. Write follow-up messages based ONLY on the facts given.
Rules:
- Greet the customer by first name.
- Acknowledge what they asked / agreed on the call (use the summary).
- If a Google Meet link is given, include it exactly once, verbatim. If a calendar link is given, include it in the email only.
- If pricing/details were requested, mention: Starter AI Plan ₹15,000/month, Growth Omnichannel Plan ₹18,000/month.
- If it is a placement / interview, ask them to keep their resume ready.
- WhatsApp: under 80 words, friendly, at most 2 emojis, use *bold* sparingly, no placeholders.
- Email paragraph: 2-4 plain sentences, no greeting line, no signature, no HTML.
Return JSON: {"whatsapp": "...", "email": "..."}`;

    const facts = [
      `Customer name: ${ctx.leadName || "Customer"}`,
      `Agent: ${ctx.agentName || "Sharyx AI"}`,
      `Call outcome: ${ctx.outcome || "Interested"}`,
      `Call summary: ${ctx.callSummary || "N/A"}`,
      ctx.jobTitle ? `Role: ${ctx.jobTitle}` : "",
      ctx.meetUrl ? `Google Meet link: ${ctx.meetUrl}` : "",
      ctx.calendarUrl ? `Calendar link: ${ctx.calendarUrl}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    try {
      const res = await this.llm.completeJson<{ whatsapp?: string; email?: string }>(
        systemPrompt,
        [],
        facts,
        { temperature: 0.5 }
      );
      let wa = (res?.whatsapp || "").trim() || null;
      // Guarantee the meet link is present even if the LLM dropped it
      if (wa && ctx.meetUrl && !wa.includes(ctx.meetUrl)) {
        wa += `\n\n🔗 Google Meet: ${ctx.meetUrl}`;
      }
      return { whatsapp: wa, email: (res?.email || "").trim() || null };
    } catch (err: any) {
      this.logger.warn(`[LLM Followup] generation failed: ${err.message}`);
      return { whatsapp: null, email: null };
    }
  }

  /**
   * Main entry point — fires WhatsApp OR Email campaigns for a given event + outcome.
   * "Caller" terminology removed — lead-centric context only.
   */
  async executeTrigger(
    channel: "whatsapp" | "email" | "both",
    event: string,
    ctx: TriggerContext
  ): Promise<{ sent: number; failed: number; details: string[] }> {
    // Block generic "Call Completed" or negative outcomes from triggering automated campaigns
    if (
      ctx.outcome === "Call Completed" ||
      event === "call_completed" ||
      /not interested|busy|no-answer|failed/i.test(ctx.outcome || "")
    ) {
      return { sent: 0, failed: 0, details: [] };
    }

    // Per-recipient deduplication guard (prevent duplicate dispatches within 3 minutes)
    const key = `${(ctx.phone || ctx.email || "").replace(/\D/g, "").slice(-10)}:${event}`;
    const now = Date.now();
    const lastSent = this.recentDispatches.get(key);
    if (key.length > 3 && lastSent && now - lastSent < 180000) {
      this.logger.warn(`⏳ [OUTCOME DEDUP] Skipping duplicate trigger for ${key}`);
      return { sent: 0, failed: 0, details: [] };
    }
    if (key.length > 3) {
      this.recentDispatches.set(key, now);
    }

    const results: string[] = [];
    let sent = 0;
    let failed = 0;

    // ── Shared enrichment so WhatsApp + Email use the SAME Meet link, calendar link & AI message ──
    if (isMeetingOutcome(event, ctx.outcome)) {
      if (!ctx.meetUrl || !/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}/i.test(ctx.meetUrl)) {
        ctx.meetUrl = generateMeetSlug();
      }
      const isInterview = /interview|placement/i.test(`${event} ${ctx.outcome}`);
      ctx.calendarUrl = buildCalendarUrl(
        `${isInterview ? "Interview" : "Demo / Meeting"} with Sharyx AI — ${ctx.leadName || "Customer"}`,
        ctx.callSummary || ctx.outcome || "Scheduled session",
        ctx.meetUrl
      );
    }
    const llmMsg = await this.generateLlmFollowup(ctx);
    ctx.llmWhatsApp = llmMsg.whatsapp || undefined;
    ctx.llmEmailParagraph = llmMsg.email || undefined;
    if (ctx.llmWhatsApp) {
      this.logger.log(`🤖 [LLM Followup] Personalised message generated for ${ctx.leadName || ctx.phone}`);
    }

    if (channel === "whatsapp" || channel === "both") {
      const r = await this.executeWhatsAppTrigger(event, ctx);
      sent += r.sent;
      failed += r.failed;
      results.push(...r.details);
    }

    if (channel === "email" || channel === "both") {
      const r = await this.executeEmailTrigger(event, ctx);
      sent += r.sent;
      failed += r.failed;
      results.push(...r.details);
    }

    return { sent, failed, details: results };
  }

  // ─── WHATSAPP TRIGGER ───────────────────────────────────────────────────────
  private async executeWhatsAppTrigger(event: string, ctx: TriggerContext) {
    const sent: string[] = [];
    const failed: string[] = [];

    try {
      // 1. Load active campaigns for this event
      const campaigns = await WhatsAppCampaign.find({
        where: { tenant_id: ctx.tenantId, is_active: true, status: true },
      });

      const isInterviewEvt = event === "interview_booked" || /interview|placement/i.test(ctx.outcome || "");
      const isDemoEvt = event === "appointment_booked" || event === "demo_booked" || /demo|consultation/i.test(ctx.outcome || "");
      const isDetailsEvt = ["quotation_requested", "whatsapp_details_requested", "lead_qualified"].includes(event);

      const matching = campaigns.filter((c) => {
        const cEv = c.trigger_event || "after_call_ends";
        if (isInterviewEvt) {
          // Strictly match interview campaigns only
          return (cEv === "interview_booked" || /interview|placement/i.test(c.name || "")) && isOutcomeMatch(c.outcome_filter || "ALL", ctx.outcome || "");
        }
        if (isDemoEvt) {
          // Strictly reject interview campaigns
          if (cEv === "interview_booked" || /interview|placement/i.test(c.name || "")) return false;
          return (cEv === "appointment_booked" || cEv === "demo_booked" || cEv === "after_call_ends" || cEv === "ALL") && isOutcomeMatch(c.outcome_filter || "ALL", ctx.outcome || "");
        }
        if (isDetailsEvt) {
          return ["quotation_requested", "whatsapp_details_requested", "after_call_ends"].includes(cEv) && isOutcomeMatch(c.outcome_filter || "ALL", ctx.outcome || "");
        }
        return (cEv === event || cEv === "after_call_ends" || cEv === "ALL") && isOutcomeMatch(c.outcome_filter || "ALL", ctx.outcome || "");
      }).slice(0, 1); // Run at most ONE best-matching campaign to prevent duplicate template spam

      // 2. Resolve lead from DB if phone given
      const leadRecord = ctx.phone ? await resolveLeadByPhone(ctx.phone, ctx.tenantId) : null;
      let recipientPhone = ctx.phone?.replace(/\D/g, "") || leadRecord?.phone?.replace(/\D/g, "") || "";
      if (recipientPhone.length === 10) {
        recipientPhone = `91${recipientPhone}`;
      }

      if (!recipientPhone) {
        this.logger.warn("[WA Trigger] No phone available — aborting WA send");
        return { sent: 0, failed: 1, details: ["No lead phone number available"] };
      }

      // 3. Load WA Config
      const waConfig =
        (await WhatsAppConfig.findOne({ where: { tenant_id: ctx.tenantId, status: true } })) ||
        (await WhatsAppConfig.findOne({ where: { status: true } }));
      if (!waConfig?.access_token || !waConfig?.phone_number_id) {
        this.logger.warn("[WA Trigger] WhatsApp not configured for tenant");
        return { sent: 0, failed: 1, details: ["WhatsApp not configured"] };
      }

      const outLower = (ctx.outcome || "").toLowerCase();
      const isPricingOrDetailsRequest =
        event === "quotation_requested" ||
        event === "whatsapp_details_requested" ||
        outLower.includes("pric") ||
        outLower.includes("quot") ||
        outLower.includes("whatsapp") ||
        outLower.includes("detail") ||
        outLower.includes("info");
      const isMeetingBooked =
        event === "appointment_booked" ||
        event === "demo_booked" ||
        event === "interview_booked" ||
        outLower.includes("appointment") ||
        outLower.includes("demo") ||
        outLower.includes("interview") ||
        outLower.includes("schedule") ||
        outLower.includes("placement");

      const name = ctx.leadName || leadRecord?.name || "Valued Customer";
      const slug = `${Math.random().toString(36).slice(2, 5)}-${Math.random().toString(36).slice(2, 6)}-${Math.random().toString(36).slice(2, 5)}`;
      const resolvedMeetUrl = isMeetingBooked
        ? ctx.meetUrl || leadRecord?.interview_link || `https://meet.google.com/${slug}`
        : ctx.meetUrl;

      const sendAndLogWhatsApp = async (
        msgBody: string,
        templateName: string,
        languageCode: string = "en_US"
      ): Promise<boolean> => {
        // Prefer the LLM-personalised message (context-aware) over static template text
        if (ctx.llmWhatsApp) {
          msgBody = ctx.llmWhatsApp;
        }
        const url = `https://graph.facebook.com/v21.0/${waConfig.phone_number_id}/messages`;
        const headers = {
          Authorization: `Bearer ${waConfig.access_token}`,
          "Content-Type": "application/json",
        };

        const templatePayload = {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: recipientPhone,
          type: "template",
          template: {
            name: templateName,
            language: { code: languageCode },
            components: [
              {
                type: "body",
                parameters: [
                  { type: "text", text: name },
                  { type: "text", text: ctx.outcome || "Inquiry Details" },
                  { type: "text", text: resolvedMeetUrl || ctx.callSummary || "Sharyx AI" },
                ],
              },
            ],
          },
        };

        let metaMessageId = `wa_${Date.now()}`;
        let deliveryStatus = "sent";

        try {
          // 1. Send full rich formatted WhatsApp message (with clickable Google Meet preview or pricing/service details)
          const textRes = await axios.post(
            url,
            {
              messaging_product: "whatsapp",
              recipient_type: "individual",
              to: recipientPhone,
              type: "text",
              text: { preview_url: true, body: msgBody },
            },
            { headers, timeout: 10000 }
          );
          metaMessageId = textRes.data?.messages?.[0]?.id || metaMessageId;
        } catch (textErr: any) {
          // 2. If 24-hour session window requires an approved Meta Template payload, send type: "template"
          this.logger.warn(
            `[WA Trigger] Direct text send returned (${textErr?.response?.data?.error?.message || textErr.message}), dispatching Meta Template payload "${templateName}"...`
          );
          try {
            const tplRes = await axios.post(url, templatePayload, { headers, timeout: 10000 });
            metaMessageId = tplRes.data?.messages?.[0]?.id || metaMessageId;
          } catch {
            try {
              const fallbackTplRes = await axios.post(
                url,
                {
                  messaging_product: "whatsapp",
                  to: recipientPhone,
                  type: "template",
                  template: { name: "hello_world", language: { code: "en_US" } },
                },
                { headers, timeout: 10000 }
              );
              metaMessageId = fallbackTplRes.data?.messages?.[0]?.id || metaMessageId;
            } catch (finalErr: any) {
              deliveryStatus = "failed";
              throw finalErr;
            }
          }
        }

        // 3. Persist in WhatsAppConversation & WhatsAppMessage so it shows in WhatsApp Live Chat
        try {
          let conversation = await WhatsAppConversation.findOne({
            where: { customer_phone: recipientPhone, tenant_id: waConfig.tenant_id || "default" },
          });
          if (!conversation) {
            conversation = new WhatsAppConversation();
            conversation.tenant_id = waConfig.tenant_id || "default";
            conversation.customer_phone = recipientPhone;
            conversation.customer_name = name;
            conversation.conversation_status = "open";
            conversation.created_by_id = "outcome_trigger";
            conversation.created_on = new Date();
          }
          conversation.last_message_text = msgBody;
          conversation.last_message_at = new Date();
          conversation.updated_on = new Date();
          await conversation.save();

          const waMsg = new WhatsAppMessage();
          waMsg.conversation_id = conversation.id;
          waMsg.tenant_id = waConfig.tenant_id || "default";
          waMsg.sender_phone = waConfig.phone_number || "sharyx_ai";
          waMsg.recipient_phone = recipientPhone;
          waMsg.direction = "outbound";
          waMsg.message_type = "template";
          waMsg.message_text = msgBody;
          waMsg.template_name = templateName;
          waMsg.meta_message_id = metaMessageId;
          waMsg.delivery_status = deliveryStatus;
          waMsg.is_ai_generated = true;
          waMsg.created_by_id = "outcome_trigger";
          waMsg.created_on = new Date();
          await waMsg.save();
        } catch (dbErr: any) {
          this.logger.warn(`[WA Trigger] Could not save WA conversation log: ${dbErr.message}`);
        }

        return true;
      };

      if (matching.length === 0) {
        // Also check if any active WhatsAppTemplate directly has a matching outcome_filter
        const allActiveTemplates = await WhatsAppTemplate.find({
          where: { is_active: true, status: true },
        });
        const matchedTemplate = allActiveTemplates.find(
          (t) => t.outcome_filter && t.outcome_filter !== "ALL" && isOutcomeMatch(t.outcome_filter, ctx.outcome || "")
        );

        if (matchedTemplate) {
          const enrichedCtx: TriggerContext = { ...ctx, meetUrl: resolvedMeetUrl };
          let tplBody = substitutePlaceholders(matchedTemplate.body_text, enrichedCtx, leadRecord);
          if (isMeetingBooked && resolvedMeetUrl && !tplBody.includes(resolvedMeetUrl)) {
            tplBody += `\n\n🔗 *Google Meet Link*: ${resolvedMeetUrl}`;
          }
          try {
            await sendAndLogWhatsApp(tplBody, matchedTemplate.name, matchedTemplate.language || "en_US");
            this.logger.log(
              `⚡ [WA Trigger] Direct template match "${matchedTemplate.name}" (filter="${matchedTemplate.outcome_filter}") sent to ${recipientPhone}`
            );
            return {
              sent: 1,
              failed: 0,
              details: [`WA template "${matchedTemplate.name}" sent to ${recipientPhone}`],
            };
          } catch (tplErr: any) {
            this.logger.warn(`[WA Trigger] Direct template send failed: ${tplErr.message}`);
          }
        }

        if (!isPricingOrDetailsRequest && !isMeetingBooked) {
          return { sent: 0, failed: 0, details: [] };
        }

        let fallbackMsg = "";
        let fallbackTplName = "quotation_dispatch";

        if (isMeetingBooked) {
          fallbackTplName = outLower.includes("interview") || outLower.includes("placement")
            ? "interview_scheduled_confirmation"
            : "meeting_scheduled_confirmation";
          fallbackMsg = `Hello ${name}! 👋\n\nYour *${ctx.outcome || "Scheduled Session"}* with *${ctx.agentName || "Sharyx AI"}* is confirmed!\n\n📅 *Outcome*: ${ctx.outcome || "Meeting Scheduled"}\n🔗 *Google Meet Link*: ${resolvedMeetUrl}\n📝 *Summary*: ${ctx.callSummary || "Session scheduled via AI Voice Call."}\n\nPlease join using the Google Meet link above at your scheduled time. Reply here if you need to reschedule!`;
        } else {
          fallbackTplName = "quotation_dispatch";
          fallbackMsg = `Hello ${name}! 👋\n\nThank you for speaking with *${ctx.agentName || "Sharyx AI"}*. Here are the details you requested on WhatsApp:\n\n📋 *Inquiry Outcome*: ${ctx.outcome || "Details & Quotation Requested"}\n💼 *Solutions & Pricing Overview*:\n• *Starter AI Plan*: ₹15,000/month (WhatsApp AI Copilot + Email Automation + CRM)\n• *Growth Omnichannel Plan*: ₹18,000/month (Voice AI Telephony + WhatsApp + Email + Auto-Scheduling)\n• *Enterprise Custom*: Dedicated AI Workforce & Custom Integrations\n\n📝 *Call Summary*: ${ctx.callSummary || "Product & pricing details shared as requested."}\n\nReply directly to this WhatsApp message if you would like a live Google Meet walkthrough!`;
        }

        try {
          await sendAndLogWhatsApp(fallbackMsg, fallbackTplName);
          this.logger.log(`⚡ [WA Trigger] Template "${fallbackTplName}" sent to ${recipientPhone} for outcome "${ctx.outcome}"`);
          return { sent: 1, failed: 0, details: [`WA template "${fallbackTplName}" sent to ${recipientPhone}`] };
        } catch (waErr: any) {
          this.logger.warn(`[WA Trigger] Fallback WA send failed: ${waErr?.response?.data?.error?.message || waErr.message}`);
          return { sent: 0, failed: 1, details: [waErr.message] };
        }
      }

      for (const campaign of matching) {
        try {
          // 4. Template lookup (if meeting booked but campaign points to quotation_dispatch, use meeting template format)
          const tpl =
            (await WhatsAppTemplate.findOne({
              where: { name: campaign.template_name, tenant_id: ctx.tenantId, status: true },
            })) ||
            (await WhatsAppTemplate.findOne({ where: { name: campaign.template_name, status: true } }));

          const enrichedCtx: TriggerContext = {
            ...ctx,
            meetUrl: resolvedMeetUrl,
          };

          let msgBody = tpl
            ? substitutePlaceholders(tpl.body_text, enrichedCtx, leadRecord)
            : `Hi ${name}, thank you for connecting with ${ctx.agentName || "Sharyx AI"}!`;

          // Ensure Google Meet link is always present in the message when a meeting/demo/appointment/interview is scheduled
          if (isMeetingBooked && resolvedMeetUrl && !msgBody.includes(resolvedMeetUrl)) {
            msgBody = `Hello ${name}! 👋\n\nYour *${ctx.outcome || "Scheduled Session"}* with *${ctx.agentName || "Sharyx AI"}* is confirmed!\n\n📅 *Outcome*: ${ctx.outcome}\n🔗 *Google Meet Link*: ${resolvedMeetUrl}\n📝 *Call Summary*: ${ctx.callSummary || "Session confirmed."}\n\nJoin via the Google Meet link above. Reply anytime to reschedule!`;
          } else if (isPricingOrDetailsRequest && !msgBody.includes("Summary")) {
            msgBody = `${msgBody}\n\n📋 *Outcome*: ${ctx.outcome || "Details Requested"}\n📝 *Call Summary*: ${ctx.callSummary || "Requested details shared on WhatsApp."}`;
          }

          // 5. PDF Generation if enabled
          if ((campaign.attach_pdf || tpl?.attach_pdf) && (campaign.pdf_template_type || tpl?.pdf_template_type)) {
            const pdfType = (campaign.pdf_template_type || tpl?.pdf_template_type) as PdfTemplateType;
            const pdfTitle = campaign.pdf_title || tpl?.pdf_title || "Document";
            try {
              await this.pdfService.generate({
                templateType: pdfType,
                leadName: name,
                company: ctx.company || leadRecord?.company_name,
                agentName: ctx.agentName,
                outcome: ctx.outcome,
                callSummary: ctx.callSummary,
                meetUrl: resolvedMeetUrl,
                dealValue: ctx.dealValue ? String(ctx.dealValue) : undefined,
                phone: recipientPhone,
                email: ctx.email || leadRecord?.email,
              });
              this.logger.log(`[WA Trigger] PDF "${pdfTitle}" generated for lead ${name}`);
            } catch (pdfErr: any) {
              this.logger.warn(`[WA Trigger] PDF generation skipped: ${pdfErr.message}`);
            }
          }

          // 6. Send via Meta Cloud API & log to WhatsApp Live Chat
          const effectiveTemplateName = isMeetingBooked
            ? "meeting_scheduled_confirmation"
            : campaign.template_name || tpl?.name || "quotation_dispatch";

          await sendAndLogWhatsApp(msgBody, effectiveTemplateName, tpl?.language || "en_US");

          // 7. Update campaign stats
          campaign.sent_count = (campaign.sent_count || 0) + 1;
          campaign.updated_on = new Date();
          await campaign.save();

          sent.push(`WA template "${effectiveTemplateName}" sent to ${recipientPhone} via campaign "${campaign.name}"`);
          this.logger.log(`[WA Trigger] Message sent to ${recipientPhone} — campaign: ${campaign.name}`);
        } catch (err: any) {
          const msg = `WA campaign "${campaign.name}" failed: ${err?.response?.data?.error?.message || err.message}`;
          failed.push(msg);
          this.logger.error(`[WA Trigger] ${msg}`);
        }
      }
    } catch (err: any) {
      this.logger.error(`[WA Trigger] Fatal error: ${err.message}`);
      failed.push(`WA trigger fatal: ${err.message}`);
    }

    return { sent: sent.length, failed: failed.length, details: [...sent, ...failed] };
  }

  // ─── EMAIL TRIGGER ──────────────────────────────────────────────────────────
  private async executeEmailTrigger(event: string, ctx: TriggerContext) {
    const sent: string[] = [];
    const failed: string[] = [];

    try {
      // 1. Load matching email campaigns — strict tenant isolation
      const campaigns = await EmailCampaign.find({
        where: { tenant_id: ctx.tenantId, is_active: true, status: true },
      });

      const matching = campaigns.filter(
        c => (c.trigger_event === event || c.trigger_event === "after_call_ends" || c.trigger_event === "ALL") &&
             isOutcomeMatch(c.outcome_filter || "ALL", ctx.outcome || "")
      );

      // 2. Resolve lead from DB
      const leadRecord = ctx.phone ? await resolveLeadByPhone(ctx.phone, ctx.tenantId) : null;

      // 3. Recipient email resolution
      const recipientEmail =
        ctx.email ||
        leadRecord?.email ||
        null;

      const recipientName = ctx.leadName || leadRecord?.name || "Valued Lead";

      if (matching.length === 0) {
        // Default Quotation Dispatch Fallback
        if (recipientEmail && (event === "quotation_requested" || /quot|pric|detail/i.test(ctx.outcome || ""))) {
          try {
            const quotationSubject = `Official Quotation & Proposal for ${ctx.company || recipientName} — Sharyx AI`;
            const quotationHtml = `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
                <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding: 24px 28px; text-align: left;">
                  <h2 style="color: #ffffff; margin: 0; font-size: 18px; font-weight: 700;">Sharyx AI Workforce</h2>
                  <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 13px;">Official Quotation & Solutions Estimate</p>
                </div>
                <div style="padding: 28px;">
                  <p style="color: #334155; font-size: 14px; margin-top: 0;">Hi <strong>${recipientName}</strong>,</p>
                  <p style="color: #475569; font-size: 13px; line-height: 1.6;">${ctx.llmEmailParagraph || "Thank you for speaking with our AI representative today! As requested, here is your customized workforce automation quotation:"}</p>
                  <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 18px; margin: 20px 0;">
                    <div style="font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase;">Estimated Investment</div>
                    <div style="font-size: 22px; font-weight: 800; color: #0284c7; margin: 6px 0;">${ctx.currency || "INR"} ${ctx.dealValue || "15,000"}</div>
                    <div style="font-size: 12px; color: #475569; margin-top: 4px;">Includes Autonomous Voice Agents, WhatsApp AI Copilot, and Lead Qualification CRM.</div>
                  </div>
                  <p style="color: #475569; font-size: 13px; line-height: 1.6;">Our specialist team will follow up to finalize the onboarding schedule. Feel free to reply to this email anytime!</p>
                </div>
              </div>
            `;
            await this.emailService.sendEmail({
              to: recipientEmail,
              subject: quotationSubject,
              html: quotationHtml,
            });
            this.logger.log(`⚡ [Email Trigger] Default quotation email sent to ${recipientEmail}`);
            sent.push(`Quotation email sent to ${recipientEmail}`);
            return { sent: 1, failed: 0, details: sent };
          } catch (quotErr: any) {
            this.logger.warn(`Failed to dispatch fallback quotation email: ${quotErr.message}`);
          }
        }
        // Default: If an appointment was booked or meeting link requested and recipient email is known, send default meeting invite email!
        if (recipientEmail && (event === "appointment_booked" || event === "meeting_link_requested" || ctx.meetUrl)) {
          try {
            const defaultSubject = `Google Meet Invitation: Sharyx Session with ${recipientName}`;
            const slotText = ctx.callSummary || "Scheduled Session";
            const meetUrl = ctx.meetUrl || "https://meet.google.com/shx-demo-room";
            const defaultHtml = `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
                <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 32px 24px; text-align: center; color: #ffffff;">
                  <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #ffffff;">Meeting Confirmed 🚀</h1>
                  <p style="margin: 8px 0 0; opacity: 0.95; font-size: 15px; color: #f1f5f9;">Your Google Meet link is ready</p>
                </div>
                <div style="padding: 28px 24px; color: #1e293b; font-size: 15px; line-height: 1.6;">
                  <p>Hi <strong>${recipientName}</strong>,</p>
                  <p>${ctx.llmEmailParagraph || "Thank you for connecting with us! Here are your meeting details:"}</p>
                  <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px 20px; margin: 20px 0;">
                    <p style="margin: 0 0 8px; color: #334155;"><strong>🗓️ Details:</strong> ${slotText}</p>
                    <p style="margin: 0 0 8px; color: #334155;"><strong>👤 Host:</strong> ${ctx.agentName || "Sharyx AI Specialist"}</p>
                    <p style="margin: 0; color: #334155;"><strong>🎥 Platform:</strong> Google Meet</p>
                  </div>
                  <div style="text-align: center; margin: 28px 0;">
                    <a href="${meetUrl}" style="background: #4f46e5; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; display: inline-block; font-size: 16px;">👉 Join Google Meet</a>
                    ${ctx.calendarUrl ? `<br/><a href="${ctx.calendarUrl}" style="display: inline-block; margin-top: 12px; color: #4f46e5; font-size: 14px; font-weight: 600; text-decoration: underline;">📅 Add to Google Calendar</a>` : ""}
                  </div>
                  <p style="font-size: 13px; color: #64748b; word-break: break-all;">Direct Link: <a href="${meetUrl}" style="color: #4f46e5;">${meetUrl}</a></p>
                  <p style="margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 16px; font-size: 13px; color: #64748b;">
                    Need to reschedule? Just reply to this email or send us a WhatsApp message.<br/><br/>
                    Best regards,<br/>
                    <strong>Sharyx AI Team</strong>
                  </p>
                </div>
              </div>
            `;

            await this.emailService.sendEmail({
              to: recipientEmail,
              subject: defaultSubject,
              html: defaultHtml,
            }, "system");

            try {
              const logEntry = new EmailLog();
              logEntry.lead_id = leadRecord?.id || null;
              logEntry.from_email = "system@sharyx.com";
              logEntry.to_email = recipientEmail;
              logEntry.subject = defaultSubject;
              logEntry.body_text = `Google Meet link: ${meetUrl}`;
              logEntry.direction = "outbound";
              logEntry.delivery_status = "sent";
              logEntry.is_ai_drafted = false;
              logEntry.created_by_id = "system";
              logEntry.created_on = new Date();
              await logEntry.save();
            } catch {}

            sent.push(`Default meeting email sent to ${recipientEmail}`);
            this.logger.log(`⚡ [Email Trigger] Default meeting link email sent to ${recipientEmail} with link: ${meetUrl}`);
            return { sent: 1, failed: 0, details: sent };
          } catch (err: any) {
            failed.push(`Default meeting email failed: ${err.message}`);
            this.logger.error(`[Email Trigger] Default meeting email failed: ${err.message}`);
            return { sent: 0, failed: 1, details: failed };
          }
        }

        // Default: If email was confirmed/captured, send welcome confirmation email
        if (recipientEmail && (event === "email_confirmed" || event === "lead_captured")) {
          try {
            const defaultSubject = `Welcome to Sharyx, ${recipientName}!`;
            const companyLine = ctx.company ? `<p style="margin: 0; color: #334155;"><strong>💼 Company:</strong> ${ctx.company}</p>` : "";
            const defaultHtml = `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
                <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 32px 24px; text-align: center; color: #ffffff;">
                  <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #ffffff;">Welcome to Sharyx 👋</h1>
                  <p style="margin: 8px 0 0; opacity: 0.95; font-size: 15px; color: #f1f5f9;">Autonomous AI Workforce for WhatsApp & Email</p>
                </div>
                <div style="padding: 28px 24px; color: #1e293b; font-size: 15px; line-height: 1.6;">
                  <p>Hi <strong>${recipientName}</strong>,</p>
                  <p>Thank you for connecting with us! We have confirmed your contact details and registered your inquiry in our system.</p>
                  <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px 20px; margin: 20px 0;">
                    <p style="margin: 0 0 8px; color: #334155;"><strong>👤 Name:</strong> ${recipientName}</p>
                    <p style="margin: 0 0 8px; color: #334155;"><strong>✉️ Confirmed Email:</strong> ${recipientEmail}</p>
                    ${companyLine}
                  </div>
                  <p>Our autonomous AI agents are available 24/7 to assist you:</p>
                  <ul style="color: #475569; padding-left: 20px; line-height: 1.8;">
                    <li>Automated WhatsApp & Email customer communications</li>
                    <li>Instant AI lead qualification & CRM syncing</li>
                    <li>Live Google Meet demonstrations on demand</li>
                  </ul>
                  <p>Feel free to reply directly to this email or continue chatting on WhatsApp anytime!</p>
                  <p style="margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 16px; font-size: 13px; color: #64748b;">
                    Best regards,<br/>
                    <strong>Sharyx AI Team</strong>
                  </p>
                </div>
              </div>
            `;

            await this.emailService.sendEmail({
              to: recipientEmail,
              subject: defaultSubject,
              html: defaultHtml,
            }, "system");

            try {
              const logEntry = new EmailLog();
              logEntry.lead_id = leadRecord?.id || null;
              logEntry.from_email = "system@sharyx.com";
              logEntry.to_email = recipientEmail;
              logEntry.subject = defaultSubject;
              logEntry.body_text = `Welcome email sent to ${recipientEmail}`;
              logEntry.direction = "outbound";
              logEntry.delivery_status = "sent";
              logEntry.is_ai_drafted = false;
              logEntry.created_by_id = "system";
              logEntry.created_on = new Date();
              await logEntry.save();
            } catch {}

            sent.push(`Welcome confirmation email sent to ${recipientEmail}`);
            this.logger.log(`⚡ [Email Trigger] Welcome confirmation email sent to ${recipientEmail}`);
            return { sent: 1, failed: 0, details: sent };
          } catch (err: any) {
            failed.push(`Welcome email failed: ${err.message}`);
            this.logger.error(`[Email Trigger] Welcome email failed: ${err.message}`);
            return { sent: 0, failed: 1, details: failed };
          }
        }

        this.logger.debug(`[Email Trigger] No matching campaigns for event="${event}" outcome="${ctx.outcome}"`);
        return { sent: 0, failed: 0, details: [] };
      }

      for (const campaign of matching) {
        try {
          if (!recipientEmail) {
            failed.push(`Email campaign "${campaign.campaign_name}": no recipient email found for lead`);
            continue;
          }

          // 4. Substitute placeholders in subject + HTML
          const resolvedSubject = substitutePlaceholders(campaign.subject || "", ctx, leadRecord);
          let resolvedHtml = substitutePlaceholders(campaign.html_template || "", ctx, leadRecord);

          // Inject LLM-personalised paragraph + calendar button when the template doesn't use {{llm_message}} itself
          const tplUsesLlm = /\{\{(llm_message|ai_message)\}\}/i.test(campaign.html_template || "");
          if (ctx.llmEmailParagraph && !tplUsesLlm) {
            const aiBlock = `<p style="color:#334155;font-size:14px;line-height:1.6;margin:12px 0;">${ctx.llmEmailParagraph}</p>`;
            const firstP = resolvedHtml.indexOf("</p>");
            resolvedHtml = firstP >= 0
              ? resolvedHtml.slice(0, firstP + 4) + aiBlock + resolvedHtml.slice(firstP + 4)
              : aiBlock + resolvedHtml;
          }
          if (ctx.calendarUrl && !/calendar\.google\.com/i.test(resolvedHtml)) {
            resolvedHtml += `<div style="text-align:center;margin:16px 0;font-family:Arial,sans-serif;"><a href="${ctx.calendarUrl}" style="color:#4f46e5;font-weight:600;font-size:14px;">📅 Add to Google Calendar</a></div>`;
          }

          // 5. PDF Generation
          let attachments: any[] = [];
          if (campaign.attach_pdf && campaign.pdf_template_type) {
            try {
              const pdfBuffer = await this.pdfService.generate({
                templateType: campaign.pdf_template_type as PdfTemplateType,
                leadName: recipientName,
                company: ctx.company || leadRecord?.company_name,
                agentName: ctx.agentName,
                outcome: ctx.outcome,
                callSummary: ctx.callSummary,
                meetUrl: ctx.meetUrl,
                dealValue: ctx.dealValue ? String(ctx.dealValue) : undefined,
                currency: ctx.currency || leadRecord?.currency,
                phone: ctx.phone || leadRecord?.phone,
                email: recipientEmail,
                jobTitle: ctx.jobTitle || leadRecord?.job_title,
              } as PdfData);

              const ext = campaign.pdf_template_type === "call_summary" ? "pdf" : "pdf";
              attachments = [{
                filename: `${campaign.pdf_title || campaign.campaign_name || "Document"}.${ext}`,
                content: pdfBuffer,
                contentType: "application/pdf",
              }];
              this.logger.log(`[Email Trigger] PDF attached: "${campaign.pdf_title}" for ${recipientEmail}`);
            } catch (pdfErr: any) {
              this.logger.warn(`[Email Trigger] PDF failed: ${pdfErr.message}`);
            }
          }

          // 6. Send via EmailService
          await this.emailService.sendEmail(
            {
              to: recipientEmail,
              subject: resolvedSubject,
              html: resolvedHtml,
              attachments,
            },
            "system"
          );

          // 7. Log to email_log
          try {
            const logEntry = new EmailLog();
            logEntry.lead_id = leadRecord?.id || null;
            logEntry.from_email = "system@sharyx.com";
            logEntry.to_email = recipientEmail;
            logEntry.subject = resolvedSubject;
            logEntry.body_text = resolvedHtml.replace(/<[^>]+>/g, "").substring(0, 500);
            logEntry.direction = "outbound";
            logEntry.delivery_status = "sent";
            logEntry.is_ai_drafted = false;
            logEntry.created_by_id = "system";
            logEntry.created_on = new Date();
            await logEntry.save();
          } catch {}

          // 8. Update campaign stats
          campaign.sent_count = (campaign.sent_count || 0) + 1;
          campaign.updated_on = new Date();
          await campaign.save();

          sent.push(`Email sent to ${recipientEmail} via campaign "${campaign.campaign_name}"`);
          this.logger.log(`[Email Trigger] Email sent to ${recipientEmail} — campaign: ${campaign.campaign_name}`);
        } catch (err: any) {
          const msg = `Email campaign "${campaign.campaign_name}" failed: ${err.message}`;
          failed.push(msg);
          this.logger.error(`[Email Trigger] ${msg}`);
        }
      }
    } catch (err: any) {
      this.logger.error(`[Email Trigger] Fatal: ${err.message}`);
      failed.push(`Email trigger fatal: ${err.message}`);
    }

    return { sent: sent.length, failed: failed.length, details: [...sent, ...failed] };
  }
}
