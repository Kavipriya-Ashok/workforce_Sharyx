"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
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
const WhatsAppConfig_entity_1 = require("../Database/Table/WhatsApp/WhatsAppConfig.entity");
const WhatsAppConversation_entity_1 = require("../Database/Table/WhatsApp/WhatsAppConversation.entity");
const WhatsAppMessage_entity_1 = require("../Database/Table/WhatsApp/WhatsAppMessage.entity");
const PdfGenerator_service_1 = require("./PdfGenerator.service");
const typeorm_1 = require("typeorm");
const axios_1 = __importDefault(require("axios"));
const Email_service_1 = require("../Email/Services/Email.service");
const AgentLlm_service_1 = require("../AgentOrchestrator/Services/AgentLlm.service");
function isMeetingOutcome(event, outcome) {
    return (["appointment_booked", "demo_booked", "interview_booked", "meeting_scheduled"].includes(event) ||
        /appointment|demo|interview|schedule|placement|booked/i.test(outcome || ""));
}
function generateMeetSlug() {
    const r = (n) => Math.random().toString(36).replace(/[^a-z]/g, "").padEnd(n, "x").slice(0, n);
    return `https://meet.google.com/${r(3)}-${r(4)}-${r(3)}`;
}
function buildCalendarUrl(title, details, meetUrl) {
    const start = new Date();
    start.setDate(start.getDate() + 1);
    start.setUTCHours(5, 30, 0, 0);
    const end = new Date(start.getTime() + 30 * 60000);
    const fmt = (d) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const params = new URLSearchParams({
        action: "TEMPLATE",
        text: title,
        dates: `${fmt(start)}/${fmt(end)}`,
        details: `${details}${meetUrl ? `\n\nGoogle Meet: ${meetUrl}` : ""}`,
        location: meetUrl || "Google Meet",
    });
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
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
    if ((f.includes("demo") || f.includes("meeting") || f.includes("appointment") || f.includes("site visit") || f.includes("interview") || f.includes("schedule")) &&
        (o.includes("demo") || o.includes("meet") || o.includes("appoint") || o.includes("site") || o.includes("visit") || o.includes("schedule") || o.includes("book") || o.includes("interview") || o.includes("placement")))
        return true;
    if (f.includes("callback") && (o.includes("call back") || o.includes("callback") || o.includes("call me") || o.includes("ring")))
        return true;
    if ((f.includes("transfer") || f.includes("handoff")) && (o.includes("transfer") || o.includes("handoff") || o.includes("handed")))
        return true;
    if ((f.includes("proposal") || f.includes("quote") || f.includes("quotation") || f.includes("pricing") || f.includes("whatsapp") || f.includes("details")) &&
        (o.includes("proposal") || o.includes("quote") || o.includes("quotation") || o.includes("pricing") || o.includes("cost") || o.includes("pricing sheet") || o.includes("whatsapp") || o.includes("details") || o.includes("info")))
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
        .replace(/\{\{calendar_url\}\}/gi, ctx.calendarUrl || "")
        .replace(/\{\{llm_message\}\}|\{\{ai_message\}\}/gi, ctx.llmEmailParagraph || ctx.llmWhatsApp || ctx.callSummary || "")
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
        this.recentDispatches = new Map();
        this.llm = new AgentLlm_service_1.AgentLlmService();
    }
    async generateLlmFollowup(ctx) {
        if (!this.llm.isAvailable())
            return { whatsapp: null, email: null };
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
            const res = await this.llm.completeJson(systemPrompt, [], facts, { temperature: 0.5 });
            let wa = ((res === null || res === void 0 ? void 0 : res.whatsapp) || "").trim() || null;
            if (wa && ctx.meetUrl && !wa.includes(ctx.meetUrl)) {
                wa += `\n\n🔗 Google Meet: ${ctx.meetUrl}`;
            }
            return { whatsapp: wa, email: ((res === null || res === void 0 ? void 0 : res.email) || "").trim() || null };
        }
        catch (err) {
            this.logger.warn(`[LLM Followup] generation failed: ${err.message}`);
            return { whatsapp: null, email: null };
        }
    }
    async executeTrigger(channel, event, ctx) {
        if (ctx.outcome === "Call Completed" ||
            event === "call_completed" ||
            /not interested|busy|no-answer|failed/i.test(ctx.outcome || "")) {
            return { sent: 0, failed: 0, details: [] };
        }
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
        const results = [];
        let sent = 0;
        let failed = 0;
        if (isMeetingOutcome(event, ctx.outcome)) {
            if (!ctx.meetUrl || !/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}/i.test(ctx.meetUrl)) {
                ctx.meetUrl = generateMeetSlug();
            }
            const isInterview = /interview|placement/i.test(`${event} ${ctx.outcome}`);
            ctx.calendarUrl = buildCalendarUrl(`${isInterview ? "Interview" : "Demo / Meeting"} with Sharyx AI — ${ctx.leadName || "Customer"}`, ctx.callSummary || ctx.outcome || "Scheduled session", ctx.meetUrl);
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
    async executeWhatsAppTrigger(event, ctx) {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        const sent = [];
        const failed = [];
        try {
            const campaigns = await WhatsAppCampaign_entity_1.WhatsAppCampaign.find({
                where: { tenant_id: ctx.tenantId, is_active: true, status: true },
            });
            const isInterviewEvt = event === "interview_booked" || /interview|placement/i.test(ctx.outcome || "");
            const isDemoEvt = event === "appointment_booked" || event === "demo_booked" || /demo|consultation/i.test(ctx.outcome || "");
            const isDetailsEvt = ["quotation_requested", "whatsapp_details_requested", "lead_qualified"].includes(event);
            const matching = campaigns.filter((c) => {
                const cEv = c.trigger_event || "after_call_ends";
                if (isInterviewEvt) {
                    return (cEv === "interview_booked" || /interview|placement/i.test(c.name || "")) && isOutcomeMatch(c.outcome_filter || "ALL", ctx.outcome || "");
                }
                if (isDemoEvt) {
                    if (cEv === "interview_booked" || /interview|placement/i.test(c.name || ""))
                        return false;
                    return (cEv === "appointment_booked" || cEv === "demo_booked" || cEv === "after_call_ends" || cEv === "ALL") && isOutcomeMatch(c.outcome_filter || "ALL", ctx.outcome || "");
                }
                if (isDetailsEvt) {
                    return ["quotation_requested", "whatsapp_details_requested", "after_call_ends"].includes(cEv) && isOutcomeMatch(c.outcome_filter || "ALL", ctx.outcome || "");
                }
                return (cEv === event || cEv === "after_call_ends" || cEv === "ALL") && isOutcomeMatch(c.outcome_filter || "ALL", ctx.outcome || "");
            }).slice(0, 1);
            const leadRecord = ctx.phone ? await resolveLeadByPhone(ctx.phone, ctx.tenantId) : null;
            let recipientPhone = ((_a = ctx.phone) === null || _a === void 0 ? void 0 : _a.replace(/\D/g, "")) || ((_b = leadRecord === null || leadRecord === void 0 ? void 0 : leadRecord.phone) === null || _b === void 0 ? void 0 : _b.replace(/\D/g, "")) || "";
            if (recipientPhone.length === 10) {
                recipientPhone = `91${recipientPhone}`;
            }
            if (!recipientPhone) {
                this.logger.warn("[WA Trigger] No phone available — aborting WA send");
                return { sent: 0, failed: 1, details: ["No lead phone number available"] };
            }
            const waConfig = (await WhatsAppConfig_entity_1.WhatsAppConfig.findOne({ where: { tenant_id: ctx.tenantId, status: true } })) ||
                (await WhatsAppConfig_entity_1.WhatsAppConfig.findOne({ where: { status: true } }));
            if (!(waConfig === null || waConfig === void 0 ? void 0 : waConfig.access_token) || !(waConfig === null || waConfig === void 0 ? void 0 : waConfig.phone_number_id)) {
                this.logger.warn("[WA Trigger] WhatsApp not configured for tenant");
                return { sent: 0, failed: 1, details: ["WhatsApp not configured"] };
            }
            const outLower = (ctx.outcome || "").toLowerCase();
            const isPricingOrDetailsRequest = event === "quotation_requested" ||
                event === "whatsapp_details_requested" ||
                outLower.includes("pric") ||
                outLower.includes("quot") ||
                outLower.includes("whatsapp") ||
                outLower.includes("detail") ||
                outLower.includes("info");
            const isMeetingBooked = event === "appointment_booked" ||
                event === "demo_booked" ||
                event === "interview_booked" ||
                outLower.includes("appointment") ||
                outLower.includes("demo") ||
                outLower.includes("interview") ||
                outLower.includes("schedule") ||
                outLower.includes("placement");
            const name = ctx.leadName || (leadRecord === null || leadRecord === void 0 ? void 0 : leadRecord.name) || "Valued Customer";
            const slug = `${Math.random().toString(36).slice(2, 5)}-${Math.random().toString(36).slice(2, 6)}-${Math.random().toString(36).slice(2, 5)}`;
            const resolvedMeetUrl = isMeetingBooked
                ? ctx.meetUrl || (leadRecord === null || leadRecord === void 0 ? void 0 : leadRecord.interview_link) || `https://meet.google.com/${slug}`
                : ctx.meetUrl;
            const sendAndLogWhatsApp = async (msgBody, templateName, languageCode = "en_US") => {
                var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
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
                    const textRes = await axios_1.default.post(url, {
                        messaging_product: "whatsapp",
                        recipient_type: "individual",
                        to: recipientPhone,
                        type: "text",
                        text: { preview_url: true, body: msgBody },
                    }, { headers, timeout: 10000 });
                    metaMessageId = ((_c = (_b = (_a = textRes.data) === null || _a === void 0 ? void 0 : _a.messages) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.id) || metaMessageId;
                }
                catch (textErr) {
                    this.logger.warn(`[WA Trigger] Direct text send returned (${((_f = (_e = (_d = textErr === null || textErr === void 0 ? void 0 : textErr.response) === null || _d === void 0 ? void 0 : _d.data) === null || _e === void 0 ? void 0 : _e.error) === null || _f === void 0 ? void 0 : _f.message) || textErr.message}), dispatching Meta Template payload "${templateName}"...`);
                    try {
                        const tplRes = await axios_1.default.post(url, templatePayload, { headers, timeout: 10000 });
                        metaMessageId = ((_j = (_h = (_g = tplRes.data) === null || _g === void 0 ? void 0 : _g.messages) === null || _h === void 0 ? void 0 : _h[0]) === null || _j === void 0 ? void 0 : _j.id) || metaMessageId;
                    }
                    catch (_o) {
                        try {
                            const fallbackTplRes = await axios_1.default.post(url, {
                                messaging_product: "whatsapp",
                                to: recipientPhone,
                                type: "template",
                                template: { name: "hello_world", language: { code: "en_US" } },
                            }, { headers, timeout: 10000 });
                            metaMessageId = ((_m = (_l = (_k = fallbackTplRes.data) === null || _k === void 0 ? void 0 : _k.messages) === null || _l === void 0 ? void 0 : _l[0]) === null || _m === void 0 ? void 0 : _m.id) || metaMessageId;
                        }
                        catch (finalErr) {
                            deliveryStatus = "failed";
                            throw finalErr;
                        }
                    }
                }
                try {
                    let conversation = await WhatsAppConversation_entity_1.WhatsAppConversation.findOne({
                        where: { customer_phone: recipientPhone, tenant_id: waConfig.tenant_id || "default" },
                    });
                    if (!conversation) {
                        conversation = new WhatsAppConversation_entity_1.WhatsAppConversation();
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
                    const waMsg = new WhatsAppMessage_entity_1.WhatsAppMessage();
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
                }
                catch (dbErr) {
                    this.logger.warn(`[WA Trigger] Could not save WA conversation log: ${dbErr.message}`);
                }
                return true;
            };
            if (matching.length === 0) {
                const allActiveTemplates = await WhatsAppTemplate_entity_1.WhatsAppTemplate.find({
                    where: { is_active: true, status: true },
                });
                const matchedTemplate = allActiveTemplates.find((t) => t.outcome_filter && t.outcome_filter !== "ALL" && isOutcomeMatch(t.outcome_filter, ctx.outcome || ""));
                if (matchedTemplate) {
                    const enrichedCtx = Object.assign(Object.assign({}, ctx), { meetUrl: resolvedMeetUrl });
                    let tplBody = substitutePlaceholders(matchedTemplate.body_text, enrichedCtx, leadRecord);
                    if (isMeetingBooked && resolvedMeetUrl && !tplBody.includes(resolvedMeetUrl)) {
                        tplBody += `\n\n🔗 *Google Meet Link*: ${resolvedMeetUrl}`;
                    }
                    try {
                        await sendAndLogWhatsApp(tplBody, matchedTemplate.name, matchedTemplate.language || "en_US");
                        this.logger.log(`⚡ [WA Trigger] Direct template match "${matchedTemplate.name}" (filter="${matchedTemplate.outcome_filter}") sent to ${recipientPhone}`);
                        return {
                            sent: 1,
                            failed: 0,
                            details: [`WA template "${matchedTemplate.name}" sent to ${recipientPhone}`],
                        };
                    }
                    catch (tplErr) {
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
                }
                else {
                    fallbackTplName = "quotation_dispatch";
                    fallbackMsg = `Hello ${name}! 👋\n\nThank you for speaking with *${ctx.agentName || "Sharyx AI"}*. Here are the details you requested on WhatsApp:\n\n📋 *Inquiry Outcome*: ${ctx.outcome || "Details & Quotation Requested"}\n💼 *Solutions & Pricing Overview*:\n• *Starter AI Plan*: ₹15,000/month (WhatsApp AI Copilot + Email Automation + CRM)\n• *Growth Omnichannel Plan*: ₹18,000/month (Voice AI Telephony + WhatsApp + Email + Auto-Scheduling)\n• *Enterprise Custom*: Dedicated AI Workforce & Custom Integrations\n\n📝 *Call Summary*: ${ctx.callSummary || "Product & pricing details shared as requested."}\n\nReply directly to this WhatsApp message if you would like a live Google Meet walkthrough!`;
                }
                try {
                    await sendAndLogWhatsApp(fallbackMsg, fallbackTplName);
                    this.logger.log(`⚡ [WA Trigger] Template "${fallbackTplName}" sent to ${recipientPhone} for outcome "${ctx.outcome}"`);
                    return { sent: 1, failed: 0, details: [`WA template "${fallbackTplName}" sent to ${recipientPhone}`] };
                }
                catch (waErr) {
                    this.logger.warn(`[WA Trigger] Fallback WA send failed: ${((_e = (_d = (_c = waErr === null || waErr === void 0 ? void 0 : waErr.response) === null || _c === void 0 ? void 0 : _c.data) === null || _d === void 0 ? void 0 : _d.error) === null || _e === void 0 ? void 0 : _e.message) || waErr.message}`);
                    return { sent: 0, failed: 1, details: [waErr.message] };
                }
            }
            for (const campaign of matching) {
                try {
                    const tpl = (await WhatsAppTemplate_entity_1.WhatsAppTemplate.findOne({
                        where: { name: campaign.template_name, tenant_id: ctx.tenantId, status: true },
                    })) ||
                        (await WhatsAppTemplate_entity_1.WhatsAppTemplate.findOne({ where: { name: campaign.template_name, status: true } }));
                    const enrichedCtx = Object.assign(Object.assign({}, ctx), { meetUrl: resolvedMeetUrl });
                    let msgBody = tpl
                        ? substitutePlaceholders(tpl.body_text, enrichedCtx, leadRecord)
                        : `Hi ${name}, thank you for connecting with ${ctx.agentName || "Sharyx AI"}!`;
                    if (isMeetingBooked && resolvedMeetUrl && !msgBody.includes(resolvedMeetUrl)) {
                        msgBody = `Hello ${name}! 👋\n\nYour *${ctx.outcome || "Scheduled Session"}* with *${ctx.agentName || "Sharyx AI"}* is confirmed!\n\n📅 *Outcome*: ${ctx.outcome}\n🔗 *Google Meet Link*: ${resolvedMeetUrl}\n📝 *Call Summary*: ${ctx.callSummary || "Session confirmed."}\n\nJoin via the Google Meet link above. Reply anytime to reschedule!`;
                    }
                    else if (isPricingOrDetailsRequest && !msgBody.includes("Summary")) {
                        msgBody = `${msgBody}\n\n📋 *Outcome*: ${ctx.outcome || "Details Requested"}\n📝 *Call Summary*: ${ctx.callSummary || "Requested details shared on WhatsApp."}`;
                    }
                    if ((campaign.attach_pdf || (tpl === null || tpl === void 0 ? void 0 : tpl.attach_pdf)) && (campaign.pdf_template_type || (tpl === null || tpl === void 0 ? void 0 : tpl.pdf_template_type))) {
                        const pdfType = (campaign.pdf_template_type || (tpl === null || tpl === void 0 ? void 0 : tpl.pdf_template_type));
                        const pdfTitle = campaign.pdf_title || (tpl === null || tpl === void 0 ? void 0 : tpl.pdf_title) || "Document";
                        try {
                            await this.pdfService.generate({
                                templateType: pdfType,
                                leadName: name,
                                company: ctx.company || (leadRecord === null || leadRecord === void 0 ? void 0 : leadRecord.company_name),
                                agentName: ctx.agentName,
                                outcome: ctx.outcome,
                                callSummary: ctx.callSummary,
                                meetUrl: resolvedMeetUrl,
                                dealValue: ctx.dealValue ? String(ctx.dealValue) : undefined,
                                phone: recipientPhone,
                                email: ctx.email || (leadRecord === null || leadRecord === void 0 ? void 0 : leadRecord.email),
                            });
                            this.logger.log(`[WA Trigger] PDF "${pdfTitle}" generated for lead ${name}`);
                        }
                        catch (pdfErr) {
                            this.logger.warn(`[WA Trigger] PDF generation skipped: ${pdfErr.message}`);
                        }
                    }
                    const effectiveTemplateName = isMeetingBooked
                        ? "meeting_scheduled_confirmation"
                        : campaign.template_name || (tpl === null || tpl === void 0 ? void 0 : tpl.name) || "quotation_dispatch";
                    await sendAndLogWhatsApp(msgBody, effectiveTemplateName, (tpl === null || tpl === void 0 ? void 0 : tpl.language) || "en_US");
                    campaign.sent_count = (campaign.sent_count || 0) + 1;
                    campaign.updated_on = new Date();
                    await campaign.save();
                    sent.push(`WA template "${effectiveTemplateName}" sent to ${recipientPhone} via campaign "${campaign.name}"`);
                    this.logger.log(`[WA Trigger] Message sent to ${recipientPhone} — campaign: ${campaign.name}`);
                }
                catch (err) {
                    const msg = `WA campaign "${campaign.name}" failed: ${((_h = (_g = (_f = err === null || err === void 0 ? void 0 : err.response) === null || _f === void 0 ? void 0 : _f.data) === null || _g === void 0 ? void 0 : _g.error) === null || _h === void 0 ? void 0 : _h.message) || err.message}`;
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
                where: { tenant_id: ctx.tenantId, is_active: true, status: true },
            });
            const matching = campaigns.filter(c => (c.trigger_event === event || c.trigger_event === "after_call_ends" || c.trigger_event === "ALL") &&
                isOutcomeMatch(c.outcome_filter || "ALL", ctx.outcome || ""));
            const leadRecord = ctx.phone ? await resolveLeadByPhone(ctx.phone, ctx.tenantId) : null;
            const recipientEmail = ctx.email ||
                (leadRecord === null || leadRecord === void 0 ? void 0 : leadRecord.email) ||
                null;
            const recipientName = ctx.leadName || (leadRecord === null || leadRecord === void 0 ? void 0 : leadRecord.name) || "Valued Lead";
            if (matching.length === 0) {
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
                    }
                    catch (quotErr) {
                        this.logger.warn(`Failed to dispatch fallback quotation email: ${quotErr.message}`);
                    }
                }
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
                    let resolvedHtml = substitutePlaceholders(campaign.html_template || "", ctx, leadRecord);
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