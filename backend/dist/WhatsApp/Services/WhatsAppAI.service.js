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
const PromptEngine_service_1 = require("./PromptEngine.service");
const AgentOrchestrator_service_1 = require("../../AgentOrchestrator/Services/AgentOrchestrator.service");
let WhatsAppAIService = WhatsAppAIService_1 = class WhatsAppAIService {
    constructor(promptEngineService, orchestrator) {
        this.promptEngineService = promptEngineService;
        this.orchestrator = orchestrator;
        this.logger = new common_1.Logger(WhatsAppAIService_1.name);
    }
    async getConfig(tenantId = "default") {
        return await WhatsAppAIConfig_entity_1.WhatsAppAIConfig.findOne({ where: { tenant_id: tenantId, status: true } });
    }
    async saveConfig(data, userId) {
        var _a, _b;
        let config = await WhatsAppAIConfig_entity_1.WhatsAppAIConfig.findOne({ where: { tenant_id: data.tenant_id || "default" } });
        if (!config) {
            config = new WhatsAppAIConfig_entity_1.WhatsAppAIConfig();
            config.tenant_id = data.tenant_id || "default";
            config.created_by_id = userId || "system";
            config.created_on = new Date();
        }
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
        config.stop_words = data.stop_words || ["STOP", "UNSUBSCRIBE"];
        config.updated_by_id = userId || "system";
        config.updated_on = new Date();
        return await config.save();
    }
    async generateResponse(customerMessage, customerPhone, tenantId = "default", conversationId, extras) {
        const config = await this.getConfig(tenantId);
        if (!config || !config.is_ai_enabled) {
            return null;
        }
        const upperMsg = customerMessage.trim().toUpperCase();
        if (config.stop_words && config.stop_words.some((w) => upperMsg.includes(w.toUpperCase()))) {
            return "You have successfully unsubscribed. Reply START anytime to re-enable messages.";
        }
        if (conversationId) {
            try {
                const result = await this.orchestrator.handle({
                    channel: "whatsapp",
                    tenantId,
                    conversationRef: conversationId,
                    message: customerMessage,
                    phone: customerPhone,
                    name: extras === null || extras === void 0 ? void 0 : extras.customerName,
                    leadId: extras === null || extras === void 0 ? void 0 : extras.leadId,
                    llm: {
                        provider: config.llm_provider,
                        model: config.llm_model,
                        apiKey: config.api_key || undefined,
                    },
                });
                if (result) {
                    if (result.humanTakeover && !result.reply)
                        return null;
                    this.logger.log(`🤝 [MULTI-AGENT] ${result.agentName}${result.handoffs.length ? ` (via ${result.handoffs.map((h) => `${h.from}→${h.to}`).join(", ")})` : ""}`);
                    if (result.reply)
                        return result.reply;
                }
            }
            catch (err) {
                this.logger.error(`Multi-agent orchestrator failed, using legacy pipeline: ${err.message}`);
            }
        }
        try {
            const ctx = await this.promptEngineService.buildAutoContext(tenantId, customerPhone, customerPhone, customerMessage, conversationId);
            const aiResult = await this.promptEngineService.generateReply(ctx, config);
            return aiResult.replyText;
        }
        catch (err) {
            this.logger.error("AI Generation error:", err.message);
            return (config.fallback_message ||
                config.welcome_message ||
                "Thank you for contacting Sharyx! A team member will assist you shortly.");
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