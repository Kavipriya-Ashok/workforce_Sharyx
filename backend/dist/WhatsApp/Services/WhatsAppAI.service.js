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
var WhatsAppAIService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsAppAIService = void 0;
const common_1 = require("@nestjs/common");
const WhatsAppAIConfig_entity_1 = require("../../Database/Table/WhatsApp/WhatsAppAIConfig.entity");
const WhatsAppConversation_entity_1 = require("../../Database/Table/WhatsApp/WhatsAppConversation.entity");
const PromptEngine_service_1 = require("./PromptEngine.service");
const AgentOrchestrator_service_1 = require("../../AgentOrchestrator/Services/AgentOrchestrator.service");
const company_1 = require("../../Database/Table/Admin/company");
const MessageTemplate_1 = require("../../Helper/MessageTemplate");
let WhatsAppAIService = WhatsAppAIService_1 = class WhatsAppAIService {
    constructor(promptEngineService, orchestrator) {
        this.promptEngineService = promptEngineService;
        this.orchestrator = orchestrator;
        this.logger = new common_1.Logger(WhatsAppAIService_1.name);
    }
    async getConfig(tenantId) {
        let config = await WhatsAppAIConfig_entity_1.WhatsAppAIConfig.findOne({ where: { tenant_id: tenantId, status: true } });
        if (!config) {
            config = await WhatsAppAIConfig_entity_1.WhatsAppAIConfig.findOne({ where: { tenant_id: tenantId } });
        }
        if (!config) {
            config = new WhatsAppAIConfig_entity_1.WhatsAppAIConfig();
            config.tenant_id = tenantId;
            config.is_ai_enabled = true;
            config.ai_mode = "hybrid";
            config.llm_provider = "gemini";
            config.llm_model = "gemini-2.5-flash";
            config.api_key = null;
            config.system_prompt =
                "You are Sharyx AI, an intelligent workforce copilot. Be warm, professional, helpful, and concise (1-3 sentences). Respond naturally in the customer language (Tamil, English, or Tanglish).";
            config.welcome_message = null;
            config.fallback_message = null;
            config.created_by_id = "system";
            config.created_on = new Date();
            config.status = true;
            await config.save().catch(() => null);
        }
        return config;
    }
    async saveConfig(data, userId, tenantId) {
        var _a, _b;
        let config = await WhatsAppAIConfig_entity_1.WhatsAppAIConfig.findOne({ where: { tenant_id: tenantId } });
        if (!config) {
            config = new WhatsAppAIConfig_entity_1.WhatsAppAIConfig();
            config.tenant_id = tenantId;
            config.status = true;
            config.created_by_id = userId || "system";
            config.created_on = new Date();
        }
        config.status = true;
        config.is_ai_enabled = (_a = data.is_ai_enabled) !== null && _a !== void 0 ? _a : true;
        config.ai_mode = data.ai_mode || "hybrid";
        config.system_prompt = data.system_prompt || null;
        config.welcome_message = data.welcome_message || null;
        config.fallback_message = data.fallback_message || null;
        config.llm_provider = data.llm_provider || "gemini";
        config.llm_model = data.llm_model || "gemini-2.5-flash";
        if (data.api_key !== undefined) {
            config.api_key = data.api_key;
        }
        config.auto_followup_enabled = (_b = data.auto_followup_enabled) !== null && _b !== void 0 ? _b : true;
        config.followup_delay_minutes = data.followup_delay_minutes || 60;
        config.followup_message = data.followup_message || null;
        config.stop_words = (data.stop_words && data.stop_words.length ? data.stop_words : MessageTemplate_1.DEFAULT_STOP_WORDS).map((w) => String(w).trim()).filter(Boolean);
        config.updated_by_id = userId || "system";
        config.updated_on = new Date();
        return await config.save();
    }
    async generateResponse(customerMessage, customerPhone, tenantId = "default", conversationId, extras) {
        var _a;
        const config = await this.getConfig(tenantId);
        if (!config || !config.is_ai_enabled) {
            return null;
        }
        if ((0, MessageTemplate_1.matchesKeyword)(customerMessage, ((_a = config.stop_words) === null || _a === void 0 ? void 0 : _a.length) ? config.stop_words : MessageTemplate_1.DEFAULT_STOP_WORDS)) {
            return null;
        }
        if (conversationId) {
            try {
                const conv = await WhatsAppConversation_entity_1.WhatsAppConversation.findOne({ where: { id: conversationId } });
                if ((conv === null || conv === void 0 ? void 0 : conv.conversation_status) === "human_takeover" || (conv === null || conv === void 0 ? void 0 : conv.is_human_takeover)) {
                    this.logger.log(`Live human takeover active on WhatsApp conversation ${conversationId}, pausing AI.`);
                    return null;
                }
            }
            catch (err) {
                this.logger.warn(`Could not check human takeover status: ${err.message}`);
            }
        }
        try {
            this.logger.log(`🧠 [BASE LLM] Generating WhatsApp reply via ${config.llm_provider || "gemini"} (${config.llm_model || "gemini-2.5-flash"})...`);
            const ctx = await this.promptEngineService.buildAutoContext(tenantId, customerPhone, (extras === null || extras === void 0 ? void 0 : extras.customerName) || customerPhone, customerMessage, conversationId);
            const aiResult = await this.promptEngineService.generateReply(ctx, config);
            if (aiResult === null || aiResult === void 0 ? void 0 : aiResult.replyText) {
                return {
                    reply: aiResult.replyText,
                    announcement: null,
                };
            }
        }
        catch (err) {
            this.logger.error("Base LLM Engine error:", err.message);
        }
        return config.fallback_message || null;
    }
    renderFirstMessage(config, vars) {
        const raw = ((config === null || config === void 0 ? void 0 : config.welcome_message) || '').trim();
        if (!raw || raw === MessageTemplate_1.LEGACY_DEFAULT_WELCOME)
            return '';
        return (0, MessageTemplate_1.renderMessage)(raw, vars);
    }
    renderFollowup(config, vars) {
        return (0, MessageTemplate_1.renderMessage)(config === null || config === void 0 ? void 0 : config.followup_message, vars);
    }
    isStopWord(config, text) {
        var _a;
        return (0, MessageTemplate_1.matchesKeyword)(text, ((_a = config === null || config === void 0 ? void 0 : config.stop_words) === null || _a === void 0 ? void 0 : _a.length) ? config.stop_words : MessageTemplate_1.DEFAULT_STOP_WORDS);
    }
    isStartWord(text) {
        return (0, MessageTemplate_1.matchesKeyword)(text, MessageTemplate_1.START_WORDS);
    }
    async companyName(tenantId) {
        var _a;
        try {
            return ((_a = (await company_1.company.findOne({ where: { id: tenantId } }))) === null || _a === void 0 ? void 0 : _a.name) || '';
        }
        catch (_b) {
            return '';
        }
    }
};
exports.WhatsAppAIService = WhatsAppAIService;
exports.WhatsAppAIService = WhatsAppAIService = WhatsAppAIService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [PromptEngine_service_1.PromptEngineService,
        AgentOrchestrator_service_1.AgentOrchestratorService])
], WhatsAppAIService);
//# sourceMappingURL=WhatsAppAI.service.js.map