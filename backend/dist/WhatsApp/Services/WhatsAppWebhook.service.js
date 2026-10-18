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
const common_1 = require("@nestjs/common");
const WhatsAppConversation_entity_1 = require("../../Database/Table/WhatsApp/WhatsAppConversation.entity");
const lead_1 = require("../../Database/Table/Lead/lead");
const lead_activity_1 = require("../../Database/Table/Lead/lead_activity");
const WhatsAppMessage_entity_1 = require("../../Database/Table/WhatsApp/WhatsAppMessage.entity");
const WhatsAppAI_service_1 = require("./WhatsAppAI.service");
const WhatsApp_service_1 = require("./WhatsApp.service");
let WhatsAppWebhookService = WhatsAppWebhookService_1 = class WhatsAppWebhookService {
    constructor(whatsAppService, aiService) {
        this.whatsAppService = whatsAppService;
        this.aiService = aiService;
        this.logger = new common_1.Logger(WhatsAppWebhookService_1.name);
    }
    async verifyHandshake(mode, token, challenge) {
        const config = await this.whatsAppService.getConfig();
        const expectedToken = (config === null || config === void 0 ? void 0 : config.verify_token) || process.env.META_WA_VERIFY_TOKEN || "sharyx_verify_token_secure";
        if (mode === "subscribe" && token === expectedToken) {
            return challenge;
        }
        return null;
    }
    async processIncomingWebhook(body) {
        var _a, _b, _c, _d, _e, _f, _g;
        try {
            const entry = (_a = body.entry) === null || _a === void 0 ? void 0 : _a[0];
            const changes = (_b = entry === null || entry === void 0 ? void 0 : entry.changes) === null || _b === void 0 ? void 0 : _b[0];
            const value = changes === null || changes === void 0 ? void 0 : changes.value;
            const message = (_c = value === null || value === void 0 ? void 0 : value.messages) === null || _c === void 0 ? void 0 : _c[0];
            const metadata = value === null || value === void 0 ? void 0 : value.metadata;
            const myPhoneNumber = (metadata === null || metadata === void 0 ? void 0 : metadata.display_phone_number) || "system";
            if ((value === null || value === void 0 ? void 0 : value.statuses) && value.statuses.length > 0) {
                const statusEvent = value.statuses[0];
                const metaMsgId = statusEvent.id;
                const newStatus = statusEvent.status;
                const existingMsg = await WhatsAppMessage_entity_1.WhatsAppMessage.findOne({
                    where: { meta_message_id: metaMsgId },
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
            const messageText = messageType === "text" ? (_d = message.text) === null || _d === void 0 ? void 0 : _d.body : `[Media message: ${messageType}]`;
            const metaMessageId = message.id;
            this.logger.log(`💬 [WHATSAPP RECEIVED] From: ${senderPhone} | Text: "${messageText}"`);
            const customerProfileName = ((_g = (_f = (_e = value === null || value === void 0 ? void 0 : value.contacts) === null || _e === void 0 ? void 0 : _e[0]) === null || _f === void 0 ? void 0 : _f.profile) === null || _g === void 0 ? void 0 : _g.name) || senderPhone;
            let existingLead = null;
            try {
                existingLead = await lead_1.lead.findOne({
                    where: { phone: senderPhone, status: true },
                });
                if (!existingLead) {
                    existingLead = new lead_1.lead();
                    existingLead.name = customerProfileName;
                    existingLead.phone = senderPhone;
                    existingLead.source = lead_1.LeadSource.WHATSAPP;
                    existingLead.lead_status = lead_1.LeadStatus.NEW;
                    existingLead.score = 65;
                    existingLead.notes = `Inquired on WhatsApp: "${messageText}"`;
                    existingLead.tenant_id = "default";
                    existingLead.created_by_id = "whatsapp_webhook";
                    existingLead.created_on = new Date();
                    await existingLead.save();
                    const act = new lead_activity_1.lead_activity();
                    act.lead_id = existingLead.id;
                    act.activity_type = "WHATSAPP";
                    act.title = "WhatsApp Inbound Inquiry";
                    act.description = messageText;
                    act.performer_name = customerProfileName;
                    act.tenant_id = "default";
                    act.created_by_id = "webhook";
                    act.created_on = new Date();
                    await act.save();
                }
                else {
                    existingLead.last_contacted_at = new Date();
                    await existingLead.save();
                    const act = new lead_activity_1.lead_activity();
                    act.lead_id = existingLead.id;
                    act.activity_type = "WHATSAPP";
                    act.title = "WhatsApp Message";
                    act.description = messageText;
                    act.performer_name = customerProfileName;
                    act.tenant_id = existingLead.tenant_id || "default";
                    act.created_by_id = "webhook";
                    act.created_on = new Date();
                    await act.save();
                }
            }
            catch (leadErr) {
                this.logger.warn(`Could not auto-link lead: ${leadErr.message}`);
            }
            let conversation = await WhatsAppConversation_entity_1.WhatsAppConversation.findOne({
                where: { customer_phone: senderPhone },
            });
            if (!conversation) {
                conversation = new WhatsAppConversation_entity_1.WhatsAppConversation();
                conversation.tenant_id = "default";
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
            inboundMsg.tenant_id = "default";
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
            if (messageType === "text") {
                this.logger.log(`🧠 [AI ENGINE] Processing 7-layer context for ${senderPhone}...`);
                const aiReply = await this.aiService.generateResponse(messageText, senderPhone, "default", conversation.id);
                if (aiReply) {
                    this.logger.log(`🤖 [AI AUTO-REPLY] Replying to ${senderPhone}: "${aiReply}"`);
                    await this.whatsAppService.sendMessage({
                        to: senderPhone,
                        text: aiReply,
                        conversation_id: conversation.id,
                    }, "ai_copilot", true);
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
exports.WhatsAppWebhookService = WhatsAppWebhookService = WhatsAppWebhookService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [WhatsApp_service_1.WhatsAppService,
        WhatsAppAI_service_1.WhatsAppAIService])
], WhatsAppWebhookService);
//# sourceMappingURL=WhatsAppWebhook.service.js.map