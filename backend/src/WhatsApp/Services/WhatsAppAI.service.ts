import { Injectable, Logger } from "@nestjs/common";
import { WhatsAppAIConfig } from "@Database/Table/WhatsApp/WhatsAppAIConfig.entity";
import { WhatsAppAIConfigModel } from "../Models/WhatsAppAIConfig.model";
import { PromptEngineService } from "./PromptEngine.service";

@Injectable()
export class WhatsAppAIService {
  private readonly logger = new Logger(WhatsAppAIService.name);

  constructor(private readonly promptEngineService: PromptEngineService) {}

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
    config.llm_provider = data.llm_provider || "openai";
    config.llm_model = data.llm_model || "gpt-4o-mini";
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
    conversationId?: string
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
