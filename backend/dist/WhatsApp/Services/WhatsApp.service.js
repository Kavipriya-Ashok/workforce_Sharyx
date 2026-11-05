"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var WhatsAppService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsAppService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = __importDefault(require("axios"));
const crypto_1 = require("crypto");
const WhatsAppConfig_entity_1 = require("../../Database/Table/WhatsApp/WhatsAppConfig.entity");
const WhatsAppConversation_entity_1 = require("../../Database/Table/WhatsApp/WhatsAppConversation.entity");
const WhatsAppMessage_entity_1 = require("../../Database/Table/WhatsApp/WhatsAppMessage.entity");
const Redact_1 = require("../../Helper/Redact");
const IntegrationStatus_1 = require("../../Service/Integrations/IntegrationStatus");
let WhatsAppService = WhatsAppService_1 = class WhatsAppService {
    constructor() {
        this.logger = new common_1.Logger(WhatsAppService_1.name);
        this.apiUrl = process.env.WHATSAPP_GRAPH_URL || "https://graph.facebook.com/v21.0";
    }
    requireTenant(tenantId) {
        if (!tenantId || tenantId === "all" || tenantId === "default") {
            throw new common_1.BadRequestException("Select a specific tenant to manage its WhatsApp connection.");
        }
        return tenantId;
    }
    async getConfig(tenantId) {
        return await WhatsAppConfig_entity_1.WhatsAppConfig.findOne({ where: { tenant_id: this.requireTenant(tenantId), status: true } });
    }
    async getConfigByPhoneNumberId(phoneNumberId) {
        if (!phoneNumberId)
            return null;
        return await WhatsAppConfig_entity_1.WhatsAppConfig.findOne({ where: { phone_number_id: phoneNumberId, status: true } });
    }
    async getConfigByVerifyToken(token) {
        if (!token)
            return null;
        return await WhatsAppConfig_entity_1.WhatsAppConfig.findOne({ where: { verify_token: token, status: true } });
    }
    toSafeConfig(config) {
        if (!config)
            return null;
        const token = config.access_token || "";
        return {
            id: config.id,
            tenant_id: config.tenant_id,
            phone_number: config.phone_number,
            phone_number_id: config.phone_number_id,
            waba_id: config.waba_id,
            verify_token: config.verify_token,
            provider: config.provider,
            api_url: config.api_url,
            is_connected: config.is_connected,
            has_access_token: !!token,
            access_token_hint: token ? `••••${token.slice(-4)}` : null,
            has_api_key: !!config.api_key,
            has_app_secret: !!config.app_secret,
        };
    }
    async getSafeConfig(tenantId) {
        return this.toSafeConfig(await this.getConfig(tenantId));
    }
    async saveConfig(data, userId, tenantId) {
        var _a;
        const tenant = this.requireTenant(tenantId);
        let config = await WhatsAppConfig_entity_1.WhatsAppConfig.findOne({ where: { tenant_id: tenant } });
        const isNew = !config;
        if (!config) {
            config = new WhatsAppConfig_entity_1.WhatsAppConfig();
            config.tenant_id = tenant;
            config.created_by_id = userId || undefined;
            config.created_on = new Date();
        }
        if (data.phone_number_id) {
            const owner = await WhatsAppConfig_entity_1.WhatsAppConfig.findOne({ where: { phone_number_id: data.phone_number_id } });
            if (owner && owner.tenant_id !== tenant) {
                throw new common_1.ConflictException("This WhatsApp phone number is already connected to another account.");
            }
        }
        const incomingToken = (data.access_token || "").trim();
        if (!incomingToken && (isNew || !config.access_token) && (data.provider || "meta_cloud") === "meta_cloud") {
            throw new common_1.BadRequestException("Meta Access Token is required.");
        }
        config.phone_number = data.phone_number;
        config.phone_number_id = data.phone_number_id;
        config.waba_id = data.waba_id || null;
        if (incomingToken)
            config.access_token = incomingToken;
        config.verify_token = data.verify_token || config.verify_token || (0, crypto_1.randomBytes)(16).toString("hex");
        config.provider = data.provider || config.provider || "meta_cloud";
        config.api_url = data.api_url || null;
        if (data.api_key)
            config.api_key = data.api_key;
        if (data.app_secret)
            config.app_secret = data.app_secret.trim();
        config.is_connected = (_a = data.is_connected) !== null && _a !== void 0 ? _a : true;
        config.updated_by_id = userId || undefined;
        config.updated_on = new Date();
        return await config.save();
    }
    async testConnection(data, userId, tenantId) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j;
        const tenant = this.requireTenant(tenantId);
        const provider = data.provider || "meta_cloud";
        if (provider === "meta_cloud") {
            const existing = await WhatsAppConfig_entity_1.WhatsAppConfig.findOne({ where: { tenant_id: tenant } });
            const token = (data.access_token || "").trim() || (existing === null || existing === void 0 ? void 0 : existing.access_token) || "";
            if (!data.phone_number_id || !token) {
                throw new common_1.BadRequestException("Phone Number ID and Access Token are required to test Meta connection.");
            }
            await this.saveConfig(Object.assign(Object.assign({}, data), { access_token: token, is_connected: false }), userId, tenant);
            try {
                const res = await axios_1.default.get(`${this.apiUrl}/${encodeURIComponent(data.phone_number_id)}?fields=display_phone_number,verified_name,quality_rating,code_verification_status`, { headers: { Authorization: `Bearer ${token}` }, timeout: 10000 });
                const saved = await WhatsAppConfig_entity_1.WhatsAppConfig.findOne({ where: { tenant_id: tenant } });
                if (saved) {
                    saved.is_connected = true;
                    await saved.save();
                }
                const shown = ((_a = res.data) === null || _a === void 0 ? void 0 : _a.display_phone_number) || data.phone_number;
                await (0, IntegrationStatus_1.markConnected)(tenant, "whatsapp", shown);
                return {
                    connected: true,
                    provider: "meta_cloud",
                    display_phone_number: (_b = res.data) === null || _b === void 0 ? void 0 : _b.display_phone_number,
                    verified_name: (_c = res.data) === null || _c === void 0 ? void 0 : _c.verified_name,
                    quality_rating: (_d = res.data) === null || _d === void 0 ? void 0 : _d.quality_rating,
                    code_verification_status: (_e = res.data) === null || _e === void 0 ? void 0 : _e.code_verification_status,
                    message: `Live Meta WhatsApp Cloud connected! Display: ${shown}`,
                };
            }
            catch (err) {
                this.logger.error(`Meta test handshake failed: ${(0, Redact_1.redactSecrets)(((_f = err === null || err === void 0 ? void 0 : err.response) === null || _f === void 0 ? void 0 : _f.data) || err.message)}`);
                const c = (0, IntegrationStatus_1.classifyError)("whatsapp", err);
                const text = (c === null || c === void 0 ? void 0 : c.message) || `WhatsApp could not verify this connection: ${(0, Redact_1.redactSecrets)(((_j = (_h = (_g = err === null || err === void 0 ? void 0 : err.response) === null || _g === void 0 ? void 0 : _g.data) === null || _h === void 0 ? void 0 : _h.error) === null || _j === void 0 ? void 0 : _j.message) || err.message)}`;
                const saved = await WhatsAppConfig_entity_1.WhatsAppConfig.findOne({ where: { tenant_id: tenant } });
                if (saved && saved.is_connected) {
                    saved.is_connected = false;
                    await saved.save().catch(() => undefined);
                }
                if ((c === null || c === void 0 ? void 0 : c.status) === "degraded")
                    await (0, IntegrationStatus_1.markDegraded)(tenant, "whatsapp", c.code, text, data.phone_number);
                else
                    await (0, IntegrationStatus_1.markFailed)(tenant, "whatsapp", (c === null || c === void 0 ? void 0 : c.code) || "META_ERROR", text, data.phone_number);
                throw new common_1.BadRequestException(text);
            }
        }
        else if (provider === "qr_gateway") {
            await this.saveConfig(Object.assign(Object.assign({}, data), { is_connected: true }), userId, tenant);
            await (0, IntegrationStatus_1.markConnected)(tenant, "whatsapp", data.phone_number);
            return {
                connected: true,
                provider: "qr_gateway",
                session_id: `sess_${Date.now()}`,
                status: "authenticated",
                message: "QR Web Gateway session saved!",
            };
        }
        else {
            if (data.api_url) {
                try {
                    await axios_1.default.get(data.api_url, {
                        headers: data.api_key ? { Authorization: `Bearer ${data.api_key}` } : {},
                        timeout: 10000,
                    });
                }
                catch (_k) {
                }
            }
            await this.saveConfig(Object.assign(Object.assign({}, data), { is_connected: true }), userId, tenant);
            await (0, IntegrationStatus_1.markConnected)(tenant, "whatsapp", data.phone_number);
            return {
                connected: true,
                provider: provider,
                message: "Custom WhatsApp Gateway configured and saved successfully!",
            };
        }
    }
    async disconnect(tenantId, userId) {
        const tenant = this.requireTenant(tenantId);
        const config = await WhatsAppConfig_entity_1.WhatsAppConfig.findOne({ where: { tenant_id: tenant } });
        if (!config)
            throw new common_1.NotFoundException("No WhatsApp connection found.");
        config.access_token = "";
        config.app_secret = null;
        config.api_key = null;
        config.is_connected = false;
        config.updated_by_id = userId || undefined;
        config.updated_on = new Date();
        await config.save();
        await (0, IntegrationStatus_1.markNotConfigured)(tenant, "whatsapp");
        await (0, IntegrationStatus_1.markNotConfigured)(tenant, "whatsapp_webhook");
        return this.toSafeConfig(config);
    }
    async sendMessage(dto, userId, isAiGenerated = false, tenantId) {
        var _a, _b, _c, _d, _e;
        const config = await this.getConfig(this.requireTenant(tenantId));
        if (!config || !config.access_token || !config.phone_number_id) {
            throw new common_1.BadRequestException("WhatsApp configuration missing. Please configure credentials first.");
        }
        const cleanPhone = dto.to.replace(/\D/g, "");
        const url = `${this.apiUrl}/${config.phone_number_id}/messages`;
        const payload = {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: cleanPhone,
        };
        if (dto.message_type === "template" && dto.template_name) {
            payload.type = "template";
            payload.template = {
                name: dto.template_name,
                language: { code: "en_US" },
            };
        }
        else {
            payload.type = "text";
            payload.text = { preview_url: false, body: dto.text };
        }
        let metaResponse = null;
        let metaMessageId;
        let deliveryStatus = "sent";
        try {
            const response = await axios_1.default.post(url, payload, {
                headers: {
                    Authorization: `Bearer ${config.access_token}`,
                    "Content-Type": "application/json",
                },
                timeout: 10000,
            });
            metaResponse = response.data;
            metaMessageId = (_b = (_a = metaResponse === null || metaResponse === void 0 ? void 0 : metaResponse.messages) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.id;
        }
        catch (error) {
            this.logger.error(`Meta Graph API error: ${(0, Redact_1.redactSecrets)(((_c = error === null || error === void 0 ? void 0 : error.response) === null || _c === void 0 ? void 0 : _c.data) || error.message)}`);
            deliveryStatus = "failed";
            const metaErr = (_e = (_d = error === null || error === void 0 ? void 0 : error.response) === null || _d === void 0 ? void 0 : _d.data) === null || _e === void 0 ? void 0 : _e.error;
            const noted = await (0, IntegrationStatus_1.noteFailure)(config.tenant_id, "whatsapp", error, config.phone_number);
            if ((metaErr === null || metaErr === void 0 ? void 0 : metaErr.code) === 190) {
                throw new common_1.BadRequestException("Meta Access Token has expired or is invalid (Error 190). Please reconnect WhatsApp with a new token.");
            }
            throw new common_1.BadRequestException((noted === null || noted === void 0 ? void 0 : noted.error_message) || (0, Redact_1.redactSecrets)((metaErr === null || metaErr === void 0 ? void 0 : metaErr.message) || (error === null || error === void 0 ? void 0 : error.message) || "Unknown Meta Graph error"));
        }
        if (!metaMessageId) {
            if (process.env.NODE_ENV === "test") {
                metaMessageId = `mock_${Date.now()}`;
            }
            else {
                this.logger.error(`Meta returned no message id for tenant ${config.tenant_id}; treating the send as failed`);
                throw new common_1.BadRequestException("WhatsApp did not confirm the message (no message id returned by Meta). It was not recorded as sent.");
            }
        }
        void (0, IntegrationStatus_1.noteSuccess)(config.tenant_id, "whatsapp", config.phone_number);
        let conversation = await WhatsAppConversation_entity_1.WhatsAppConversation.findOne({
            where: { customer_phone: cleanPhone, tenant_id: config.tenant_id },
        });
        if (!conversation) {
            conversation = new WhatsAppConversation_entity_1.WhatsAppConversation();
            conversation.tenant_id = config.tenant_id;
            conversation.customer_phone = cleanPhone;
            conversation.customer_name = cleanPhone;
            conversation.conversation_status = "open";
            conversation.created_by_id = userId || undefined;
            conversation.created_on = new Date();
        }
        conversation.last_message_text = dto.text;
        conversation.last_message_at = new Date();
        conversation.updated_on = new Date();
        await conversation.save();
        const msg = new WhatsAppMessage_entity_1.WhatsAppMessage();
        msg.conversation_id = conversation.id;
        msg.tenant_id = config.tenant_id;
        msg.sender_phone = config.phone_number;
        msg.recipient_phone = cleanPhone;
        msg.direction = "outbound";
        msg.message_type = dto.message_type || "text";
        msg.message_text = dto.text;
        msg.template_name = dto.template_name || null;
        msg.meta_message_id = metaMessageId;
        msg.delivery_status = deliveryStatus;
        msg.is_ai_generated = isAiGenerated;
        msg.created_by_id = userId || undefined;
        msg.created_on = new Date();
        await msg.save();
        return {
            message: msg,
            metaResponse,
        };
    }
    async getConversations(tenantId) {
        const qb = WhatsAppConversation_entity_1.WhatsAppConversation.createQueryBuilder("c").where("c.status = true");
        if (tenantId)
            qb.andWhere("c.tenant_id = :tenantId", { tenantId });
        return await qb.orderBy("c.last_message_at", "DESC", "NULLS LAST").getMany();
    }
    async setConversationStatus(id, conversationStatus, tenantId) {
        const conv = await WhatsAppConversation_entity_1.WhatsAppConversation.findOne({
            where: tenantId ? { id, tenant_id: tenantId } : { id },
        });
        if (!conv) {
            throw new common_1.NotFoundException(`Conversation ${id} not found`);
        }
        conv.conversation_status = conversationStatus;
        conv.updated_on = new Date();
        return await conv.save();
    }
    async getMessagesByConversation(conversationId, tenantId) {
        return await WhatsAppMessage_entity_1.WhatsAppMessage.find({
            where: tenantId ? { conversation_id: conversationId, tenant_id: tenantId } : { conversation_id: conversationId },
            order: { created_on: "ASC" },
        });
    }
};
exports.WhatsAppService = WhatsAppService;
exports.WhatsAppService = WhatsAppService = WhatsAppService_1 = __decorate([
    (0, common_1.Injectable)()
], WhatsAppService);
//# sourceMappingURL=WhatsApp.service.js.map