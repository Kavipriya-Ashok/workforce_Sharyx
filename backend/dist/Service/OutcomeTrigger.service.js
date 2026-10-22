"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var OutcomeTriggerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OutcomeTriggerService = void 0;
const common_1 = require("@nestjs/common");
const EmailCampaign_entity_1 = require("../Database/Table/Email/EmailCampaign.entity");
const EmailLog_entity_1 = require("../Database/Table/Email/EmailLog.entity");
const lead_1 = require("../Database/Table/Lead/lead");
const WhatsAppCampaign_entity_1 = require("../Database/Table/WhatsApp/WhatsAppCampaign.entity");
const WhatsAppTemplate_entity_1 = require("../Database/Table/WhatsApp/WhatsAppTemplate.entity");
const PdfGenerator_service_1 = require("./PdfGenerator.service");
const typeorm_1 = require("typeorm");
const axios_1 = __importDefault(require("axios"));
const Email_service_1 = require("../Email/Services/Email.service");
function isOutcomeMatch(filterOutcome, currentOutcome) {
    if (!filterOutcome || filterOutcome.toUpperCase() === "ALL")
        return true;
    if (!currentOutcome)
        return filterOutcome.toUpperCase() === "ALL";
    const f = filterOutcome.toLowerCase().trim();
    const o = currentOutcome.toLowerCase().trim();
    const notInterestedSignals = ["not interested", "no interest", "uninterested", "not looking", "remove me", "don't call"];
    const isNegative = notInterestedSignals.some(n => o.includes(n));
    const positiveFilters = ["interested", "demo", "meeting", "appointment", "proposal", "quote", "won", "deal", "site visit", "callback"];
    if (isNegative && positiveFilters.some(p => f.includes(p)))
        return false;
    if (o === f || o.replace(/\s+/g, "_") === f.replace(/\s+/g, "_"))
        return true;
    if (o.includes(f) || f.includes(o))
        return true;
    if (f.includes("interested") && (o.includes("interested") || o.includes("keen") || o.includes("want") || o.includes("yes")))
        return true;
    if ((f.includes("price") || f.includes("budget") || f.includes("cost")) &&
        (o.includes("price") || o.includes("budget") || o.includes("expensive") || o.includes("cost") || o.includes("afford")))
        return true;
    if ((f.includes("demo") || f.includes("meeting") || f.includes("appointment") || f.includes("site visit")) &&
        (o.includes("demo") || o.includes("meet") || o.includes("appoint") || o.includes("site") || o.includes("visit") || o.includes("schedule") || o.includes("book")))
        return true;
    if (f.includes("callback") && (o.includes("call back") || o.includes("callback") || o.includes("call me") || o.includes("ring")))
        return true;
    if ((f.includes("transfer") || f.includes("handoff")) && (o.includes("transfer") || o.includes("handoff") || o.includes("handed")))
        return true;
    if ((f.includes("proposal") || f.includes("quote") || f.includes("quotation")) &&
        (o.includes("proposal") || o.includes("quote") || o.includes("quotation") || o.includes("pricing sheet")))
        return true;
    if ((f.includes("invoice") || f.includes("billing")) && (o.includes("invoice") || o.includes("bill") || o.includes("receipt") || o.includes("payment")))
        return true;
    if (f.includes("not interested") && isNegative)
        return true;
    return false;
}
function substitutePlaceholders(text, ctx, leadRecord) {
    const name = ctx.leadName || (leadRecord === null || leadRecord === void 0 ? void 0 : leadRecord.name) || "Valued Lead";
    const company = ctx.company || (leadRecord === null || leadRecord === void 0 ? void 0 : leadRecord.company_name) || "";
    const phone = ctx.phone || (leadRecord === null || leadRecord === void 0 ? void 0 : leadRecord.phone) || "";
    const email = ctx.email || (leadRecord === null || leadRecord === void 0 ? void 0 : leadRecord.email) || "";
    const job = ctx.jobTitle || (leadRecord === null || leadRecord === void 0 ? void 0 : leadRecord.job_title) || "";
    const deal = ctx.dealValue ? String(ctx.dealValue) : (leadRecord === null || leadRecord === void 0 ? void 0 : leadRecord.deal_value) ? String(leadRecord.deal_value) : "";
    const currency = ctx.currency || (leadRecord === null || leadRecord === void 0 ? void 0 : leadRecord.currency) || "INR";
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
        .replace(/\{\{1\}\}/g, name)
        .replace(/\{\{2\}\}/g, ctx.callSummary || ctx.outcome || "")
        .replace(/\{\{3\}\}/g, ctx.meetUrl || "");
}
async function resolveLeadByPhone(phone, tenantId) {
    if (!phone)
        return null;
    const last10 = phone.replace(/\D/g, "").slice(-10);
    try {
        return await lead_1.lead.findOne({ where: { phone: (0, typeorm_1.Like)(`%${last10}`), tenant_id: tenantId } });
    }
    catch (_a) {
        return null;
    }
}
let OutcomeTriggerService = OutcomeTriggerService_1 = class OutcomeTriggerService {
    constructor(emailService, pdfService) {
        this.emailService = emailService;
        this.pdfService = pdfService;
        this.logger = new common_1.Logger(OutcomeTriggerService_1.name);
    }
    async executeTrigger(channel, event, ctx) {
        const results = [];
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
    async executeWhatsAppTrigger(event, ctx) {
        var _a, _b, _c, _d, _e;
        const sent = [];
        const failed = [];
        try {
            const campaigns = await WhatsAppCampaign_entity_1.WhatsAppCampaign.find({
                where: { tenant_id: ctx.tenantId, is_active: true, status: true },
            });
            const matching = campaigns.filter(c => c.trigger_event === event && isOutcomeMatch(c.outcome_filter || "ALL", ctx.outcome || ""));
            if (matching.length === 0) {
                this.logger.debug(`[WA Trigger] No matching campaigns for event="${event}" outcome="${ctx.outcome}"`);
                return { sent: 0, failed: 0, details: [] };
            }
            const leadRecord = ctx.phone ? await resolveLeadByPhone(ctx.phone, ctx.tenantId) : null;
            const recipientPhone = ((_a = ctx.phone) === null || _a === void 0 ? void 0 : _a.replace(/\D/g, "")) || ((_b = leadRecord === null || leadRecord === void 0 ? void 0 : leadRecord.phone) === null || _b === void 0 ? void 0 : _b.replace(/\D/g, ""));
            if (!recipientPhone) {
                this.logger.warn("[WA Trigger] No phone available — aborting WA send");
                return { sent: 0, failed: 1, details: ["No lead phone number available"] };
            }
            const { WhatsAppConfig } = await Promise.resolve().then(() => __importStar(require("@Database/Table/WhatsApp/WhatsAppConfig.entity")));
            const waConfig = await WhatsAppConfig.findOne({ where: { tenant_id: ctx.tenantId, status: true } });
            if (!(waConfig === null || waConfig === void 0 ? void 0 : waConfig.access_token) || !(waConfig === null || waConfig === void 0 ? void 0 : waConfig.phone_number_id)) {
                this.logger.warn("[WA Trigger] WhatsApp not configured for tenant");
                return { sent: 0, failed: 1, details: ["WhatsApp not configured"] };
            }
            for (const campaign of matching) {
                try {
                    const tpl = await WhatsAppTemplate_entity_1.WhatsAppTemplate.findOne({
                        where: { name: campaign.template_name, tenant_id: ctx.tenantId, status: true },
                    }) || await WhatsAppTemplate_entity_1.WhatsAppTemplate.findOne({ where: { name: campaign.template_name, status: true } });
                    const msgBody = tpl
                        ? substitutePlaceholders(tpl.body_text, ctx, leadRecord)
                        : `Hi ${ctx.leadName || "there"}, thank you for connecting with us! Our team will follow up shortly. — Sharyx AI`;
                    if ((campaign.attach_pdf || (tpl === null || tpl === void 0 ? void 0 : tpl.attach_pdf)) && (campaign.pdf_template_type || (tpl === null || tpl === void 0 ? void 0 : tpl.pdf_template_type))) {
                        const pdfType = (campaign.pdf_template_type || (tpl === null || tpl === void 0 ? void 0 : tpl.pdf_template_type));
                        const pdfTitle = campaign.pdf_title || (tpl === null || tpl === void 0 ? void 0 : tpl.pdf_title) || "Document";
                        try {
                            await this.pdfService.generate({
                                templateType: pdfType,
                                leadName: ctx.leadName || (leadRecord === null || leadRecord === void 0 ? void 0 : leadRecord.name),
                                company: ctx.company || (leadRecord === null || leadRecord === void 0 ? void 0 : leadRecord.company_name),
                                agentName: ctx.agentName,
                                outcome: ctx.outcome,
                                callSummary: ctx.callSummary,
                                meetUrl: ctx.meetUrl,
                                dealValue: ctx.dealValue ? String(ctx.dealValue) : undefined,
                                phone: recipientPhone,
                                email: ctx.email || (leadRecord === null || leadRecord === void 0 ? void 0 : leadRecord.email),
                            });
                            this.logger.log(`[WA Trigger] PDF "${pdfTitle}" generated for lead ${ctx.leadName}`);
                        }
                        catch (pdfErr) {
                            this.logger.warn(`[WA Trigger] PDF generation skipped: ${pdfErr.message}`);
                        }
                    }
                    await axios_1.default.post(`https://graph.facebook.com/v21.0/${waConfig.phone_number_id}/messages`, {
                        messaging_product: "whatsapp",
                        to: recipientPhone,
                        type: "text",
                        text: { body: msgBody },
                    }, {
                        headers: { Authorization: `Bearer ${waConfig.access_token}`, "Content-Type": "application/json" },
                        timeout: 10000,
                    });
                    campaign.sent_count = (campaign.sent_count || 0) + 1;
                    campaign.updated_on = new Date();
                    await campaign.save();
                    sent.push(`WA sent to ${recipientPhone} via campaign "${campaign.name}"`);
                    this.logger.log(`[WA Trigger] Message sent to ${recipientPhone} — campaign: ${campaign.name}`);
                }
                catch (err) {
                    const msg = `WA campaign "${campaign.name}" failed: ${((_e = (_d = (_c = err === null || err === void 0 ? void 0 : err.response) === null || _c === void 0 ? void 0 : _c.data) === null || _d === void 0 ? void 0 : _d.error) === null || _e === void 0 ? void 0 : _e.message) || err.message}`;
                    failed.push(msg);
                    this.logger.error(`[WA Trigger] ${msg}`);
                }
            }
        }
        catch (err) {
            this.logger.error(`[WA Trigger] Fatal error: ${err.message}`);
            failed.push(`WA trigger fatal: ${err.message}`);
        }
        return { sent: sent.length, failed: failed.length, details: [...sent, ...failed] };
    }
    async executeEmailTrigger(event, ctx) {
        const sent = [];
        const failed = [];
        try {
            const campaigns = await EmailCampaign_entity_1.EmailCampaign.find({
                where: { tenant_id: ctx.tenantId, is_active: true, status: true, trigger_event: event },
            });
            const matching = campaigns.filter(c => isOutcomeMatch(c.outcome_filter || "ALL", ctx.outcome || ""));
            const leadRecord = ctx.phone ? await resolveLeadByPhone(ctx.phone, ctx.tenantId) : null;
            const recipientEmail = ctx.email ||
                (leadRecord === null || leadRecord === void 0 ? void 0 : leadRecord.email) ||
                null;
            const recipientName = ctx.leadName || (leadRecord === null || leadRecord === void 0 ? void 0 : leadRecord.name) || "Valued Lead";
            if (matching.length === 0) {
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
                            const logEntry = new EmailLog_entity_1.EmailLog();
                            logEntry.lead_id = (leadRecord === null || leadRecord === void 0 ? void 0 : leadRecord.id) || null;
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
                        }
                        catch (_a) { }
                        sent.push(`Default meeting email sent to ${recipientEmail}`);
                        this.logger.log(`⚡ [Email Trigger] Default meeting link email sent to ${recipientEmail} with link: ${meetUrl}`);
                        return { sent: 1, failed: 0, details: sent };
                    }
                    catch (err) {
                        failed.push(`Default meeting email failed: ${err.message}`);
                        this.logger.error(`[Email Trigger] Default meeting email failed: ${err.message}`);
                        return { sent: 0, failed: 1, details: failed };
                    }
                }
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
                            const logEntry = new EmailLog_entity_1.EmailLog();
                            logEntry.lead_id = (leadRecord === null || leadRecord === void 0 ? void 0 : leadRecord.id) || null;
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
                        }
                        catch (_b) { }
                        sent.push(`Welcome confirmation email sent to ${recipientEmail}`);
                        this.logger.log(`⚡ [Email Trigger] Welcome confirmation email sent to ${recipientEmail}`);
                        return { sent: 1, failed: 0, details: sent };
                    }
                    catch (err) {
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
                    const resolvedSubject = substitutePlaceholders(campaign.subject || "", ctx, leadRecord);
                    const resolvedHtml = substitutePlaceholders(campaign.html_template || "", ctx, leadRecord);
                    let attachments = [];
                    if (campaign.attach_pdf && campaign.pdf_template_type) {
                        try {
                            const pdfBuffer = await this.pdfService.generate({
                                templateType: campaign.pdf_template_type,
                                leadName: recipientName,
                                company: ctx.company || (leadRecord === null || leadRecord === void 0 ? void 0 : leadRecord.company_name),
                                agentName: ctx.agentName,
                                outcome: ctx.outcome,
                                callSummary: ctx.callSummary,
                                meetUrl: ctx.meetUrl,
                                dealValue: ctx.dealValue ? String(ctx.dealValue) : undefined,
                                currency: ctx.currency || (leadRecord === null || leadRecord === void 0 ? void 0 : leadRecord.currency),
                                phone: ctx.phone || (leadRecord === null || leadRecord === void 0 ? void 0 : leadRecord.phone),
                                email: recipientEmail,
                                jobTitle: ctx.jobTitle || (leadRecord === null || leadRecord === void 0 ? void 0 : leadRecord.job_title),
                            });
                            const ext = campaign.pdf_template_type === "call_summary" ? "pdf" : "pdf";
                            attachments = [{
                                    filename: `${campaign.pdf_title || campaign.campaign_name || "Document"}.${ext}`,
                                    content: pdfBuffer,
                                    contentType: "application/pdf",
                                }];
                            this.logger.log(`[Email Trigger] PDF attached: "${campaign.pdf_title}" for ${recipientEmail}`);
                        }
                        catch (pdfErr) {
                            this.logger.warn(`[Email Trigger] PDF failed: ${pdfErr.message}`);
                        }
                    }
                    await this.emailService.sendEmail({
                        to: recipientEmail,
                        subject: resolvedSubject,
                        html: resolvedHtml,
                        attachments,
                    }, "system");
                    try {
                        const logEntry = new EmailLog_entity_1.EmailLog();
                        logEntry.lead_id = (leadRecord === null || leadRecord === void 0 ? void 0 : leadRecord.id) || null;
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
                    }
                    catch (_c) { }
                    campaign.sent_count = (campaign.sent_count || 0) + 1;
                    campaign.updated_on = new Date();
                    await campaign.save();
                    sent.push(`Email sent to ${recipientEmail} via campaign "${campaign.campaign_name}"`);
                    this.logger.log(`[Email Trigger] Email sent to ${recipientEmail} — campaign: ${campaign.campaign_name}`);
                }
                catch (err) {
                    const msg = `Email campaign "${campaign.campaign_name}" failed: ${err.message}`;
                    failed.push(msg);
                    this.logger.error(`[Email Trigger] ${msg}`);
                }
            }
        }
        catch (err) {
            this.logger.error(`[Email Trigger] Fatal: ${err.message}`);
            failed.push(`Email trigger fatal: ${err.message}`);
        }
        return { sent: sent.length, failed: failed.length, details: [...sent, ...failed] };
    }
};
exports.OutcomeTriggerService = OutcomeTriggerService;
exports.OutcomeTriggerService = OutcomeTriggerService = OutcomeTriggerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [Email_service_1.EmailService,
        PdfGenerator_service_1.PdfGeneratorService])
], OutcomeTriggerService);
//# sourceMappingURL=OutcomeTrigger.service.js.map