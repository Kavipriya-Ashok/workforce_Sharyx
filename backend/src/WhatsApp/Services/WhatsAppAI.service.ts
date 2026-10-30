import { Injectable, Logger } from "@nestjs/common";
import { WhatsAppAIConfig } from "@Database/Table/WhatsApp/WhatsAppAIConfig.entity";
import { WhatsAppAIConfigModel } from "../Models/WhatsAppAIConfig.model";
import { PromptEngineService } from "./PromptEngine.service";
import { AgentOrchestratorService } from "../../AgentOrchestrator/Services/AgentOrchestrator.service";

export interface WhatsAppAiReply {
  reply: string | null;
  announcement?: string | null;
}

@Injectable()
export class WhatsAppAIService {
  private readonly logger = new Logger(WhatsAppAIService.name);

  constructor(
    private readonly promptEngineService: PromptEngineService,
    private readonly orchestrator: AgentOrchestratorService
  ) {}

  async getConfig(tenantId: string = "default"): Promise<WhatsAppAIConfig | null> {
    let config = await WhatsAppAIConfig.findOne({ where: { tenant_id: tenantId, status: true } });
    if (!config) {
      config = await WhatsAppAIConfig.findOne({ where: { tenant_id: tenantId } });
    }
    if (!config) {
      config = new WhatsAppAIConfig();
      config.tenant_id = tenantId;
      config.is_ai_enabled = true;
      config.ai_mode = "hybrid";
      config.llm_provider = "gemini";
      config.llm_model = "gemini-2.5-flash";
      config.api_key = process.env.GEMINI_API_KEY || null;
      config.system_prompt =
        "You are Sharyx AI, an intelligent workforce copilot. Be warm, professional, helpful, and concise (1-3 sentences). Respond naturally in the customer language (Tamil, English, or Tanglish).";
      config.welcome_message = "Hello! How can I help you today?";
      config.fallback_message = "Thank you for reaching out! A representative will connect with you shortly.";
      config.created_by_id = "system";
      config.created_on = new Date();
      config.status = true;
      await config.save().catch(() => null);
    }
    return config;
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
  ): Promise<WhatsAppAiReply | string | null> {
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
          if (result.reply) {
            return {
              reply: result.reply,
              announcement: result.announcement || null,
            };
          }
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
