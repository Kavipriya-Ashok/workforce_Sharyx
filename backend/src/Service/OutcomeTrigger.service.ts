import { Injectable, Logger } from "@nestjs/common";
import { EmailCampaign } from "@Database/Table/Email/EmailCampaign.entity";
import { EmailTemplate } from "@Database/Table/Email/EmailTemplate.entity";
import { EmailLog } from "@Database/Table/Email/EmailLog.entity";
import { lead } from "@Database/Table/Lead/lead";
import { WhatsAppCampaign } from "@Database/Table/WhatsApp/WhatsAppCampaign.entity";
import { WhatsAppTemplate } from "@Database/Table/WhatsApp/WhatsAppTemplate.entity";
import { PdfGeneratorService, PdfData, PdfTemplateType } from "@Service/PdfGenerator.service";
import { Like } from "typeorm";
import axios from "axios";
import { EmailService } from "@Email/Services/Email.service";

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

  // Tier 4: Demo / Meeting / Appointment
  if ((f.includes("demo") || f.includes("meeting") || f.includes("appointment") || f.includes("site visit")) &&
      (o.includes("demo") || o.includes("meet") || o.includes("appoint") || o.includes("site") || o.includes("visit") || o.includes("schedule") || o.includes("book"))) return true;

  // Tier 5: Callback
  if (f.includes("callback") && (o.includes("call back") || o.includes("callback") || o.includes("call me") || o.includes("ring"))) return true;

  // Tier 6: Transfer / Handoff
  if ((f.includes("transfer") || f.includes("handoff")) && (o.includes("transfer") || o.includes("handoff") || o.includes("handed"))) return true;

  // Tier 7: Proposal / Quote
  if ((f.includes("proposal") || f.includes("quote") || f.includes("quotation")) &&
      (o.includes("proposal") || o.includes("quote") || o.includes("quotation") || o.includes("pricing sheet"))) return true;

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

  constructor(
    private readonly emailService: EmailService,
    private readonly pdfService: PdfGeneratorService,
  ) {}

  /**
   * Main entry point — fires WhatsApp OR Email campaigns for a given event + outcome.
   * "Caller" terminology removed — lead-centric context only.
   */
  async executeTrigger(
    channel: "whatsapp" | "email" | "both",
    event: string,
    ctx: TriggerContext
  ): Promise<{ sent: number; failed: number; details: string[] }> {
    const results: string[] = [];
    let sent = 0;
    let failed = 0;

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

      const matching = campaigns.filter(
        c => c.trigger_event === event && isOutcomeMatch(c.outcome_filter || "ALL", ctx.outcome || "")
      );

      if (matching.length === 0) {
        this.logger.debug(`[WA Trigger] No matching campaigns for event="${event}" outcome="${ctx.outcome}"`);
        return { sent: 0, failed: 0, details: [] };
      }

      // 2. Resolve lead from DB if phone given
      const leadRecord = ctx.phone ? await resolveLeadByPhone(ctx.phone, ctx.tenantId) : null;
      const recipientPhone = ctx.phone?.replace(/\D/g, "") || leadRecord?.phone?.replace(/\D/g, "");

      if (!recipientPhone) {
        this.logger.warn("[WA Trigger] No phone available — aborting WA send");
        return { sent: 0, failed: 1, details: ["No lead phone number available"] };
      }

      // 3. Load WA Config
      const { WhatsAppConfig } = await import("@Database/Table/WhatsApp/WhatsAppConfig.entity");
      const waConfig = await WhatsAppConfig.findOne({ where: { tenant_id: ctx.tenantId, status: true } });
      if (!waConfig?.access_token || !waConfig?.phone_number_id) {
        this.logger.warn("[WA Trigger] WhatsApp not configured for tenant");
        return { sent: 0, failed: 1, details: ["WhatsApp not configured"] };
      }

      for (const campaign of matching) {
        try {
          // 4. Template lookup
          const tpl = await WhatsAppTemplate.findOne({
            where: { name: campaign.template_name, tenant_id: ctx.tenantId, status: true },
          }) || await WhatsAppTemplate.findOne({ where: { name: campaign.template_name, status: true } });

          const msgBody = tpl
            ? substitutePlaceholders(tpl.body_text, ctx, leadRecord)
            : `Hi ${ctx.leadName || "there"}, thank you for connecting with us! Our team will follow up shortly. — Sharyx AI`;

          // 5. PDF Attachment (WA doesn't support email attachments, but log it)
          if ((campaign.attach_pdf || tpl?.attach_pdf) && (campaign.pdf_template_type || tpl?.pdf_template_type)) {
            const pdfType = (campaign.pdf_template_type || tpl?.pdf_template_type) as PdfTemplateType;
            const pdfTitle = campaign.pdf_title || tpl?.pdf_title || "Document";
            try {
              await this.pdfService.generate({
                templateType: pdfType,
                leadName: ctx.leadName || leadRecord?.name,
                company: ctx.company || leadRecord?.company_name,
                agentName: ctx.agentName,
                outcome: ctx.outcome,
                callSummary: ctx.callSummary,
                meetUrl: ctx.meetUrl,
                dealValue: ctx.dealValue ? String(ctx.dealValue) : undefined,
                phone: recipientPhone,
                email: ctx.email || leadRecord?.email,
              });
              this.logger.log(`[WA Trigger] PDF "${pdfTitle}" generated for lead ${ctx.leadName}`);
            } catch (pdfErr: any) {
              this.logger.warn(`[WA Trigger] PDF generation skipped: ${pdfErr.message}`);
            }
          }

          // 6. Send via Meta Cloud API
          await axios.post(
            `https://graph.facebook.com/v21.0/${waConfig.phone_number_id}/messages`,
            {
              messaging_product: "whatsapp",
              to: recipientPhone,
              type: "text",
              text: { body: msgBody },
            },
            {
              headers: { Authorization: `Bearer ${waConfig.access_token}`, "Content-Type": "application/json" },
              timeout: 10000,
            }
          );

          // 7. Update campaign stats
          campaign.sent_count = (campaign.sent_count || 0) + 1;
          campaign.updated_on = new Date();
          await campaign.save();

          sent.push(`WA sent to ${recipientPhone} via campaign "${campaign.name}"`);
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
        where: { tenant_id: ctx.tenantId, is_active: true, status: true, trigger_event: event },
      });

      const matching = campaigns.filter(
        c => isOutcomeMatch(c.outcome_filter || "ALL", ctx.outcome || "")
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
                  <p>Thank you for connecting with us! Here are your meeting details:</p>
                  <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px 20px; margin: 20px 0;">
                    <p style="margin: 0 0 8px; color: #334155;"><strong>🗓️ Details:</strong> ${slotText}</p>
                    <p style="margin: 0 0 8px; color: #334155;"><strong>👤 Host:</strong> ${ctx.agentName || "Sharyx AI Specialist"}</p>
                    <p style="margin: 0; color: #334155;"><strong>🎥 Platform:</strong> Google Meet</p>
                  </div>
                  <div style="text-align: center; margin: 28px 0;">
                    <a href="${meetUrl}" style="background: #4f46e5; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; display: inline-block; font-size: 16px;">👉 Join Google Meet</a>
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
          const resolvedHtml = substitutePlaceholders(campaign.html_template || "", ctx, leadRecord);

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
