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
var WhatsAppWebhookService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsAppWebhookService = void 0;
const MessageTemplate_1 = require("../../Helper/MessageTemplate");
const common_1 = require("@nestjs/common");
const IntegrationStatus_1 = require("../../Service/Integrations/IntegrationStatus");
const event_emitter_1 = require("@nestjs/event-emitter");
const WhatsAppConversation_entity_1 = require("../../Database/Table/WhatsApp/WhatsAppConversation.entity");
const lead_1 = require("../../Database/Table/Lead/lead");
const lead_activity_1 = require("../../Database/Table/Lead/lead_activity");
const WhatsAppMessage_entity_1 = require("../../Database/Table/WhatsApp/WhatsAppMessage.entity");
const WhatsAppAI_service_1 = require("./WhatsAppAI.service");
const WhatsApp_service_1 = require("./WhatsApp.service");
const crypto_1 = require("crypto");
let WhatsAppWebhookService = WhatsAppWebhookService_1 = class WhatsAppWebhookService {
    constructor(whatsAppService, aiService, events) {
        this.whatsAppService = whatsAppService;
        this.aiService = aiService;
        this.events = events;
        this.logger = new common_1.Logger(WhatsAppWebhookService_1.name);
    }
    async verifyHandshake(mode, token, challenge) {
        if (mode !== "subscribe" || !token)
            return null;
        const tenantConfig = await this.whatsAppService.getConfigByVerifyToken(token);
        if (tenantConfig) {
            void (0, IntegrationStatus_1.noteSuccess)(tenantConfig.tenant_id, "whatsapp_webhook", "Meta webhook verified");
            return challenge;
        }
        const platformToken = process.env.META_WA_VERIFY_TOKEN;
        if (platformToken && token === platformToken)
            return challenge;
        return null;
    }
    async checkSignature(rawBody, header, body) {
        var _a, _b, _c, _d, _e, _f;
        const phoneNumberId = (_f = (_e = (_d = (_c = (_b = (_a = body === null || body === void 0 ? void 0 : body.entry) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.changes) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.value) === null || _e === void 0 ? void 0 : _e.metadata) === null || _f === void 0 ? void 0 : _f.phone_number_id;
        const cfg = phoneNumberId ? await this.whatsAppService.getConfigByPhoneNumberId(phoneNumberId) : null;
        const secret = ((cfg === null || cfg === void 0 ? void 0 : cfg.app_secret) || process.env.META_APP_SECRET || "").trim();
        if (!secret) {
            if (cfg)
                void (0, IntegrationStatus_1.markDegraded)(cfg.tenant_id, "whatsapp_webhook", "WEBHOOK_NO_SECRET", "Messages arrive, but they cannot be verified because no Meta App Secret is saved. Add it so fake messages are rejected.");
            return { ok: false, reason: "no app secret configured for this number" };
        }
        if (!header || !header.startsWith("sha256="))
            return { ok: false, reason: "missing X-Hub-Signature-256 header" };
        if (!rawBody)
            return { ok: false, reason: "raw body unavailable" };
        const expected = Buffer.from("sha256=" + (0, crypto_1.createHmac)("sha256", secret).update(rawBody).digest("hex"));
        const got = Buffer.from(header);
        const ok = expected.length === got.length && (0, crypto_1.timingSafeEqual)(expected, got);
        if (cfg) {
            if (ok)
                void (0, IntegrationStatus_1.noteSuccess)(cfg.tenant_id, "whatsapp_webhook", "Receiving messages from Meta");
            else
                void (0, IntegrationStatus_1.markFailed)(cfg.tenant_id, "whatsapp_webhook", "WEBHOOK_SIGNATURE", "Messages from Meta failed the signature check. The App Secret saved here is probably wrong; copy it again from your Meta app.");
        }
        return ok ? { ok: true } : { ok: false, reason: "signature mismatch" };
    }
    async processIncomingWebhook(body) {
        var _a, _b, _c, _d;
        try {
            const entry = (_a = body.entry) === null || _a === void 0 ? void 0 : _a[0];
            const changes = (_b = entry === null || entry === void 0 ? void 0 : entry.changes) === null || _b === void 0 ? void 0 : _b[0];
            const value = changes === null || changes === void 0 ? void 0 : changes.value;
            const message = (_c = value === null || value === void 0 ? void 0 : value.messages) === null || _c === void 0 ? void 0 : _c[0];
            const metadata = value === null || value === void 0 ? void 0 : value.metadata;
            const myPhoneNumber = (metadata === null || metadata === void 0 ? void 0 : metadata.display_phone_number) || "system";
            const tenantConfig = await this.whatsAppService.getConfigByPhoneNumberId(metadata === null || metadata === void 0 ? void 0 : metadata.phone_number_id);
            if (!tenantConfig) {
                this.logger.warn(`Ignoring WhatsApp event for unregistered phone_number_id=${metadata === null || metadata === void 0 ? void 0 : metadata.phone_number_id}`);
                return { status: "unknown_phone_number_id" };
            }
            const tenantId = tenantConfig.tenant_id;
            if ((value === null || value === void 0 ? void 0 : value.statuses) && value.statuses.length > 0) {
                const statusEvent = value.statuses[0];
                const metaMsgId = statusEvent.id;
                const newStatus = statusEvent.status;
                const existingMsg = await WhatsAppMessage_entity_1.WhatsAppMessage.findOne({
                    where: { meta_message_id: metaMsgId, tenant_id: tenantId },
                });
                if (existingMsg) {
                    existingMsg.delivery_status = newStatus;
                    await existingMsg.save();
                    this.logger.log(`WhatsApp message receipt updated: ${metaMsgId} -> ${newStatus}`);
                }
                return { status: "receipt_updated" };
            }
            if (!message) {
                return { status: "no_message" };
            }
            const senderPhone = message.from;
            const messageType = message.type || "text";
            let messageText = messageType === "text" ? (_d = message.text) === null || _d === void 0 ? void 0 : _d.body : `[Media message: ${messageType}]`;
            const metaMessageId = message.id;
            if (metaMessageId) {
                if (WhatsAppWebhookService_1.processedMetaIds.has(metaMessageId)) {
                    this.logger.log(`⚠️ [DUPLICATE IGNORED] Message ID already in memory set: ${metaMessageId}`);
                    return { status: "duplicate_ignored" };
                }
                WhatsAppWebhookService_1.processedMetaIds.add(metaMessageId);
                if (WhatsAppWebhookService_1.processedMetaIds.size > 2000) {
                    const first = WhatsAppWebhookService_1.processedMetaIds.values().next().value;
                    if (first)
                        WhatsAppWebhookService_1.processedMetaIds.delete(first);
                }
                try {
                    const insertRes = await WhatsAppMessage_entity_1.WhatsAppMessage.query(`INSERT INTO processed_messages (wamid, sender_phone, created_at) VALUES ($1, $2, NOW()) ON CONFLICT (wamid) DO NOTHING RETURNING wamid`, [metaMessageId, senderPhone]);
                    if (!Array.isArray(insertRes) || insertRes.length === 0) {
                        this.logger.log(`⚠️ [DUPLICATE IGNORED] wamid already in processed_messages table: ${metaMessageId}`);
                        return { status: "duplicate_ignored" };
                    }
                }
                catch (dbDedupErr) {
                    const existingMsg = await WhatsAppMessage_entity_1.WhatsAppMessage.findOne({
                        where: { meta_message_id: metaMessageId },
                    });
                    if (existingMsg) {
                        this.logger.log(`⚠️ [DUPLICATE IGNORED] Message ID already in WhatsAppMessage: ${metaMessageId}`);
                        return { status: "duplicate_ignored" };
                    }
                }
            }
            const cleanPhoneKey = `${tenantId}:${(senderPhone || "unknown").replace(/\D/g, "").slice(-10) || senderPhone}`;
            const previousTask = WhatsAppWebhookService_1.phoneQueues.get(cleanPhoneKey) || Promise.resolve();
            const nextTask = previousTask
                .catch(() => { })
                .then(() => this.processSingleCandidateMessage({
                value,
                message,
                senderPhone,
                myPhoneNumber,
                messageType,
                messageText,
                metaMessageId,
                tenantId,
            }));
            WhatsAppWebhookService_1.phoneQueues.set(cleanPhoneKey, nextTask);
            try {
                return await nextTask;
            }
            finally {
                if (WhatsAppWebhookService_1.phoneQueues.get(cleanPhoneKey) === nextTask) {
                    WhatsAppWebhookService_1.phoneQueues.delete(cleanPhoneKey);
                }
            }
        }
        catch (err) {
            this.logger.error("Error processing incoming WhatsApp webhook:", err.message);
            return { status: "error", error: err.message };
        }
    }
    async processSingleCandidateMessage(params) {
        var _a, _b, _c;
        const { value, message, senderPhone, myPhoneNumber, messageType, metaMessageId, tenantId } = params;
        let { messageText } = params;
        try {
            let isPdfAttachment = false;
            let docFilename = "";
            if (messageType === "document") {
                const doc = message.document;
                docFilename = (doc === null || doc === void 0 ? void 0 : doc.filename) || "resume.pdf";
                const mime = (doc === null || doc === void 0 ? void 0 : doc.mime_type) || "";
                isPdfAttachment = mime.includes("pdf") || docFilename.toLowerCase().endsWith(".pdf");
                if (isPdfAttachment) {
                    messageText = `[Candidate uploaded resume PDF: "${docFilename}"]`;
                }
                else {
                    messageText = `[Candidate uploaded non-PDF document: "${docFilename}"]`;
                }
            }
            else if (messageType === "image") {
                messageText = `[Candidate uploaded an image instead of a PDF resume]`;
            }
            this.logger.log(`💬 [WHATSAPP RECEIVED] From: ${senderPhone} | Type: ${messageType} | Content: "${messageText}"`);
            const customerProfileName = ((_c = (_b = (_a = value === null || value === void 0 ? void 0 : value.contacts) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.profile) === null || _c === void 0 ? void 0 : _c.name) || senderPhone;
            const isCandidateInquiry = isPdfAttachment ||
                /\b(placement|job|interview|vacancy|hiring|career|internship|fresher|resume|cv|ctc|recruitment|role|opening|apply|application)\b/i.test(messageText || "");
            let existingLead = null;
            try {
                existingLead = await lead_1.lead.findOne({
                    where: { phone: senderPhone, status: true, tenant_id: tenantId },
                });
                if (!existingLead) {
                    existingLead = new lead_1.lead();
                    existingLead.name = customerProfileName;
                    existingLead.phone = senderPhone;
                    existingLead.source = lead_1.LeadSource.WHATSAPP;
                    existingLead.lead_status = lead_1.LeadStatus.NEW;
                    existingLead.is_candidate = isCandidateInquiry;
                    if (isCandidateInquiry) {
                        existingLead.candidate_stage = isPdfAttachment ? "screening" : "new";
                    }
                    existingLead.score = 65;
                    existingLead.notes = `Inquired on WhatsApp: "${messageText}"`;
                    existingLead.tenant_id = tenantId;
                    existingLead.created_by_id = "whatsapp_webhook";
                    existingLead.created_on = new Date();
                    await existingLead.save();
                    const act = new lead_activity_1.lead_activity();
                    act.lead_id = existingLead.id;
                    act.activity_type = "WHATSAPP";
                    act.title = isCandidateInquiry ? "Placement / Candidate WhatsApp Inquiry" : "WhatsApp Inbound Inquiry";
                    act.description = messageText;
                    act.performer_name = customerProfileName;
                    act.tenant_id = tenantId;
                    act.created_by_id = "webhook";
                    act.created_on = new Date();
                    await act.save();
                }
                else {
                    if (isCandidateInquiry && !existingLead.is_candidate) {
                        existingLead.is_candidate = true;
                        existingLead.candidate_stage = existingLead.candidate_stage || "screening";
                    }
                    existingLead.last_contacted_at = new Date();
                    if (isPdfAttachment) {
                        existingLead.is_candidate = true;
                        existingLead.resume_url = docFilename;
                        existingLead.candidate_stage = "screening";
                    }
                    const expMatch = messageText.match(/(\d+(?:\.\d+)?)\s*(?:years?|yrs?)(?:\s*(?:of)?\s*exp)?/i);
                    if (expMatch) {
                        existingLead.is_candidate = true;
                        existingLead.total_experience = parseFloat(expMatch[1]);
                        existingLead.relevant_experience = parseFloat(expMatch[1]);
                    }
                    const noticeMatch = messageText.match(/(\d+)\s*days?\s*notice/i) || messageText.match(/serving\s*(\d+)\s*days/i);
                    if (noticeMatch) {
                        existingLead.is_candidate = true;
                        existingLead.employment_status = `Notice (${noticeMatch[1]} days)`;
                    }
                    else if (/serving\s*notice/i.test(messageText)) {
                        existingLead.is_candidate = true;
                        existingLead.employment_status = "Serving Notice";
                    }
                    else if (/relieved|immediate/i.test(messageText)) {
                        existingLead.is_candidate = true;
                        existingLead.employment_status = "Relieved / Immediate";
                    }
                    const currentCtcMatch = messageText.match(/current\s*(?:ctc)?\s*(?:is|:)?\s*(\d+(?:\.\d+)?)\s*(?:lpa|lakhs?)/i);
                    if (currentCtcMatch) {
                        existingLead.is_candidate = true;
                        existingLead.current_ctc = parseFloat(currentCtcMatch[1]);
                    }
                    const expectedCtcMatch = messageText.match(/expected\s*(?:ctc)?\s*(?:is|:)?\s*(\d+(?:\.\d+)?)\s*(?:lpa|lakhs?)/i);
                    if (expectedCtcMatch) {
                        existingLead.is_candidate = true;
                        existingLead.expected_ctc = parseFloat(expectedCtcMatch[1]);
                    }
                    if (/okay\s*to\s*relocate|willing\s*to\s*relocate|open\s*to\s*relocat|relocate\s*to/i.test(messageText)) {
                        existingLead.is_candidate = true;
                        existingLead.relocation = "Yes (Open to relocate)";
                    }
                    const emailMatch = messageText.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
                    if (emailMatch) {
                        existingLead.email = emailMatch[1].trim();
                    }
                    const roleMatch = messageText.match(/(?:role|position|interested in|for)\s*(?:is|as)?\s*[:*]?\s*(backend developer|frontend developer|ai solutions engineer|business development executive|full stack developer)/i)
                        || messageText.match(/^(backend developer|frontend developer|ai solutions engineer|business development executive)$/i);
                    if (roleMatch) {
                        existingLead.is_candidate = true;
                        existingLead.job_title = roleMatch[1].trim();
                    }
                    await existingLead.save();
                    const act = new lead_activity_1.lead_activity();
                    act.lead_id = existingLead.id;
                    act.activity_type = "WHATSAPP";
                    act.title = "WhatsApp Message";
                    act.description = messageText;
                    act.performer_name = customerProfileName;
                    act.tenant_id = tenantId;
                    act.created_by_id = "webhook";
                    act.created_on = new Date();
                    await act.save();
                }
            }
            catch (leadErr) {
                this.logger.warn(`Could not auto-link lead: ${leadErr.message}`);
            }
            let conversation = await WhatsAppConversation_entity_1.WhatsAppConversation.findOne({
                where: { customer_phone: senderPhone, tenant_id: tenantId },
            });
            let isNewConversation = false;
            if (!conversation) {
                isNewConversation = true;
                conversation = new WhatsAppConversation_entity_1.WhatsAppConversation();
                conversation.tenant_id = tenantId;
                conversation.customer_phone = senderPhone;
                conversation.customer_name = customerProfileName;
                conversation.lead_id = (existingLead === null || existingLead === void 0 ? void 0 : existingLead.id) || null;
                conversation.conversation_status = "open";
                conversation.created_by_id = "webhook";
                conversation.created_on = new Date();
            }
            else if ((existingLead === null || existingLead === void 0 ? void 0 : existingLead.id) && !conversation.lead_id) {
                conversation.lead_id = existingLead.id;
            }
            conversation.last_message_text = messageText;
            conversation.last_message_at = new Date();
            conversation.unread_count = (conversation.unread_count || 0) + 1;
            conversation.updated_on = new Date();
            await conversation.save();
            const inboundMsg = new WhatsAppMessage_entity_1.WhatsAppMessage();
            inboundMsg.conversation_id = conversation.id;
            inboundMsg.tenant_id = tenantId;
            inboundMsg.sender_phone = senderPhone;
            inboundMsg.recipient_phone = myPhoneNumber;
            inboundMsg.direction = "inbound";
            inboundMsg.message_type = messageType;
            inboundMsg.message_text = messageText;
            inboundMsg.meta_message_id = metaMessageId;
            inboundMsg.delivery_status = "delivered";
            inboundMsg.is_ai_generated = false;
            inboundMsg.created_by_id = "webhook";
            inboundMsg.created_on = new Date();
            await inboundMsg.save();
            const aiCfg = await this.aiService.getConfig(tenantId);
            if (conversation.conversation_status === "opted_out") {
                if (this.aiService.isStartWord(messageText)) {
                    conversation.conversation_status = "open";
                    await conversation.save();
                    return { status: "opted_in" };
                }
                return { status: "opted_out_silent" };
            }
            if (this.aiService.isStopWord(aiCfg, messageText)) {
                conversation.conversation_status = "opted_out";
                conversation.updated_on = new Date();
                await conversation.save();
                this.logger.log(`🔕 [OPT-OUT] tenant=${tenantId} conversation=${conversation.id} opted out; bot and follow-ups stay silent`);
                return { status: "opted_out" };
            }
            if (conversation.conversation_status === "human_takeover") {
                this.logger.log(`🛑 [HUMAN TAKEOVER] Conversation ${conversation.id} (${senderPhone}) is currently handled by a human agent. Bot auto-reply suppressed.`);
                return { status: "human_takeover_active" };
            }
            if (!aiCfg || aiCfg.is_ai_enabled === false || aiCfg.ai_mode === "manual") {
                return { status: "bot_silent" };
            }
            if (messageType === "text" || messageType === "document" || messageType === "image") {
                const firstMessage = isNewConversation
                    ? this.aiService.renderFirstMessage(aiCfg, { name: customerProfileName, company: await this.aiService.companyName(tenantId) })
                    : "";
                const onlyGreeted = !!firstMessage && messageType === "text" && (0, MessageTemplate_1.isBareGreeting)(messageText);
                this.logger.log(`🧠 [AI ENGINE] Processing 7-layer context for ${senderPhone}...`);
                const res = onlyGreeted
                    ? null
                    : await this.aiService.generateResponse(messageText, senderPhone, tenantId, conversation.id, {
                        customerName: customerProfileName,
                        leadId: existingLead === null || existingLead === void 0 ? void 0 : existingLead.id,
                    });
                const announcement = typeof res === "object" ? res === null || res === void 0 ? void 0 : res.announcement : null;
                let aiReply = typeof res === "object" ? res === null || res === void 0 ? void 0 : res.reply : (typeof res === "string" ? res : null);
                if (!aiReply && announcement) {
                    aiReply = announcement;
                }
                if (firstMessage) {
                    aiReply = aiReply ? `${firstMessage}\n\n${aiReply}` : firstMessage;
                }
                if (aiReply) {
                    this.logger.log(`🤖 [AI AUTO-REPLY] Replying to ${senderPhone}: "${aiReply}"`);
                    try {
                        await this.whatsAppService.sendMessage({
                            to: senderPhone,
                            text: aiReply,
                            conversation_id: conversation.id,
                        }, "ai_copilot", true, tenantId);
                        this.logger.log(`✅ [AI AUTO-REPLY DISPATCHED] Successfully sent WhatsApp reply to ${senderPhone}`);
                    }
                    catch (sendErr) {
                        this.logger.error(`❌ [WHATSAPP SEND FAILED] Could not deliver message to ${senderPhone}: ${sendErr.message}`);
                    }
                }
                else {
                    this.logger.warn(`⚠️ [AI ENGINE] No reply was generated for ${senderPhone}`);
                }
            }
            return { status: "processed" };
        }
        catch (err) {
            this.logger.error("Error processing incoming WhatsApp webhook:", err.message);
            return { status: "error", error: err.message };
        }
    }
};
exports.WhatsAppWebhookService = WhatsAppWebhookService;
WhatsAppWebhookService.processedMetaIds = new Set();
WhatsAppWebhookService.phoneQueues = new Map();
exports.WhatsAppWebhookService = WhatsAppWebhookService = WhatsAppWebhookService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [WhatsApp_service_1.WhatsAppService,
        WhatsAppAI_service_1.WhatsAppAIService,
        event_emitter_1.EventEmitter2])
], WhatsAppWebhookService);
//# sourceMappingURL=WhatsAppWebhook.service.js.map