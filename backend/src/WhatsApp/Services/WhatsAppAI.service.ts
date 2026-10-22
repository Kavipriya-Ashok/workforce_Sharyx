import { Injectable, Logger } from "@nestjs/common";
import { WhatsAppAIConfig } from "@Database/Table/WhatsApp/WhatsAppAIConfig.entity";
import { WhatsAppAIConfigModel } from "../Models/WhatsAppAIConfig.model";
import { PromptEngineService } from "./PromptEngine.service";
import { AgentOrchestratorService } from "../../AgentOrchestrator/Services/AgentOrchestrator.service";

@Injectable()
export class WhatsAppAIService {
  private readonly logger = new Logger(WhatsAppAIService.name);

  constructor(
    private readonly promptEngineService: PromptEngineService,
    private readonly orchestrator: AgentOrchestratorService
  ) {}

  async getConfig(tenantId: string = "default"): Promise<WhatsAppAIConfig | null> {
    return await WhatsAppAIConfig.findOne({ where: { tenant_id: tenantId, status: true } });
  }

  async saveConfig(data: WhatsAppAIConfigModel, userId?: string): Promise<WhatsAppAIConfig> {
    let config = await WhatsAppAIConfig.findOne({ where: { tenant_id: data.tenant_id || "default" } });
    if (!config) {
      config = new WhatsAppAIConfig();
      config.tenant_id = data.tenant_id || "default";
      config.created_by_id = userId || "system";
      config.created_on = new Date();
    }
    config.is_ai_enabled = data.is_ai_enabled ?? true;
    config.ai_mode = data.ai_mode || "hybrid";
    config.system_prompt = data.system_prompt || null;
    config.welcome_message = data.welcome_message || null;
    config.fallback_message = data.fallback_message || null;
    config.llm_provider = data.llm_provider || "gemini";
    config.llm_model = data.llm_model || "gemini-2.5-flash";
    if (data.api_key !== undefined) {
      config.api_key = data.api_key;
    }
    config.auto_followup_enabled = data.auto_followup_enabled ?? true;
    config.followup_delay_minutes = data.followup_delay_minutes || 60;
    config.followup_message = data.followup_message || null;
    config.stop_words = data.stop_words || ["STOP", "UNSUBSCRIBE"];
    config.updated_by_id = userId || "system";
    config.updated_on = new Date();
    return await config.save();
  }

  async generateResponse(
    customerMessage: string,
    customerPhone: string,
    tenantId: string = "default",
    conversationId?: string,
    extras?: { customerName?: string; leadId?: string }
  ): Promise<string | null> {
    const config = await this.getConfig(tenantId);
    if (!config || !config.is_ai_enabled) {
      return null;
    }

    // Check stop words
    const upperMsg = customerMessage.trim().toUpperCase();
    if (config.stop_words && config.stop_words.some((w) => upperMsg.includes(w.toUpperCase()))) {
      return "You have successfully unsubscribed. Reply START anytime to re-enable messages.";
    }

    // Multi-agent team: Receptionist -> Sales / Appointment / Support
    if (conversationId) {
      try {
        const result = await this.orchestrator.handle({
          channel: "whatsapp",
          tenantId,
          conversationRef: conversationId,
          message: customerMessage,
          phone: customerPhone,
          name: extras?.customerName,
          leadId: extras?.leadId,
          llm: {
            provider: config.llm_provider,
            model: config.llm_model,
            apiKey: config.api_key || undefined,
          },
        });
        if (result) {
          if (result.humanTakeover && !result.reply) return null; // human is handling this chat
          this.logger.log(
            `🤝 [MULTI-AGENT] ${result.agentName}${result.handoffs.length ? ` (via ${result.handoffs.map((h) => `${h.from}→${h.to}`).join(", ")})` : ""}`
          );
          if (result.reply) return result.reply;
        }
      } catch (err: any) {
        this.logger.error(`Multi-agent orchestrator failed, using legacy pipeline: ${err.message}`);
      }
    }

    try {
      // 7-Layer Dynamic Prompt Assembly Pipeline
      const ctx = await this.promptEngineService.buildAutoContext(
        tenantId,
        customerPhone,
        customerPhone,
        customerMessage,
        conversationId
      );

      const aiResult = await this.promptEngineService.generateReply(ctx, config);
      return aiResult.replyText;
    } catch (err: any) {
      this.logger.error("AI Generation error:", err.message);
      return (
        config.fallback_message ||
        config.welcome_message ||
        "Thank you for contacting Sharyx! A team member will assist you shortly."
      );
    }
  }
}
