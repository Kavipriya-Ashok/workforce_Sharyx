import { Injectable, Logger } from "@nestjs/common";
import { WhatsAppAIConfig } from "@Database/Table/WhatsApp/WhatsAppAIConfig.entity";
import { WhatsAppConversation } from "@Database/Table/WhatsApp/WhatsAppConversation.entity";
import { WhatsAppAIConfigModel } from "../Models/WhatsAppAIConfig.model";
import { PromptEngineService } from "./PromptEngine.service";
import { AgentOrchestratorService } from "../../AgentOrchestrator/Services/AgentOrchestrator.service";
import { company } from "@Database/Table/Admin/company";
import { DEFAULT_STOP_WORDS, LEGACY_DEFAULT_WELCOME, START_WORDS, matchesKeyword, renderMessage } from "@Helper/MessageTemplate";

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

  async getConfig(tenantId: string): Promise<WhatsAppAIConfig | null> {
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
      config.api_key = null; // platform key is read from env at call time; never copied into a tenant row
      config.system_prompt =
        "You are Sharyx AI, an intelligent workforce copilot. Be warm, professional, helpful, and concise (1-3 sentences). Respond naturally in the customer language (Tamil, English, or Tanglish).";
      // No canned texts: the first message and the fallback are written by the tenant on the Brain page.
      // (Nothing is sent from an empty box.)
      config.welcome_message = null;
      config.fallback_message = null;
      config.created_by_id = "system";
      config.created_on = new Date();
      config.status = true;
      await config.save().catch(() => null);
    }
    return config;
  }

  async saveConfig(data: WhatsAppAIConfigModel, userId: string | undefined, tenantId: string): Promise<WhatsAppAIConfig> {
    let config = await WhatsAppAIConfig.findOne({ where: { tenant_id: tenantId } });
    if (!config) {
      config = new WhatsAppAIConfig();
      config.tenant_id = tenantId;
      config.status = true;
      config.created_by_id = userId || "system";
      config.created_on = new Date();
    }
    config.status = true;
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
    config.stop_words = (data.stop_words && data.stop_words.length ? data.stop_words : DEFAULT_STOP_WORDS).map((w) => String(w).trim()).filter(Boolean);
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

    // Opt-out is handled (exact words, recorded per conversation) by the webhook before we get here; never "contains".
    if (matchesKeyword(customerMessage, config.stop_words?.length ? config.stop_words : DEFAULT_STOP_WORDS)) {
      return null;
    }

    // 1. Check if human takeover is active for this conversation (Human in the loop)
    if (conversationId) {
      try {
        const conv = await WhatsAppConversation.findOne({ where: { id: conversationId } });
        if (conv?.conversation_status === "human_takeover" || (conv as any)?.is_human_takeover) {
          this.logger.log(`Live human takeover active on WhatsApp conversation ${conversationId}, pausing AI.`);
          return null;
        }
      } catch (err: any) {
        this.logger.warn(`Could not check human takeover status: ${err.message}`);
      }
    }

    // 2. Primary Engine: Unified Base LLM Copilot Brain
    // Runs directly on the configured LLM engine (Google Gemini / OpenAI), Master System Prompt,
    // and live contextual tools from the WhatsApp AI Brain page.
    try {
      this.logger.log(`🧠 [BASE LLM] Generating WhatsApp reply via ${config.llm_provider || "gemini"} (${config.llm_model || "gemini-2.5-flash"})...`);
      const ctx = await this.promptEngineService.buildAutoContext(
        tenantId,
        customerPhone,
        extras?.customerName || customerPhone,
        customerMessage,
        conversationId
      );

      const aiResult = await this.promptEngineService.generateReply(ctx, config);
      if (aiResult?.replyText) {
        return {
          reply: aiResult.replyText,
          announcement: null,
        };
      }
    } catch (err: any) {
      this.logger.error("Base LLM Engine error:", err.message);
    }

    // The AI could not answer: use ONLY the fallback text this tenant wrote. No tenant -> no canned text, no brand of ours.
    return config.fallback_message || null;
  }

  // ------------------------------------------------------------------ first message / follow-up / opt-out (all tenant-written)

  /** The tenant's own first message, ready to send, or "" when none was written (or it is just the old auto-default). */
  renderFirstMessage(config: WhatsAppAIConfig | null, vars: { name?: string | null; company?: string | null }): string {
    const raw = (config?.welcome_message || '').trim();
    if (!raw || raw === LEGACY_DEFAULT_WELCOME) return '';
    return renderMessage(raw, vars);
  }

  renderFollowup(config: WhatsAppAIConfig | null, vars: { name?: string | null; company?: string | null }): string {
    return renderMessage(config?.followup_message, vars);
  }

  isStopWord(config: WhatsAppAIConfig | null, text: string): boolean {
    return matchesKeyword(text, config?.stop_words?.length ? config.stop_words : DEFAULT_STOP_WORDS);
  }

  isStartWord(text: string): boolean {
    return matchesKeyword(text, START_WORDS);
  }

  /** Company name of THIS tenant, for the {company} variable. */
  async companyName(tenantId: string): Promise<string> {
    try {
      return (await company.findOne({ where: { id: tenantId } }))?.name || '';
    } catch {
      return '';
    }
  }
}
