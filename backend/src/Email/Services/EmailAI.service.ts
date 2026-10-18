import { Injectable, Logger } from "@nestjs/common";
import axios from "axios";
import { EmailAIConfig } from "@Database/Table/Email/EmailAIConfig.entity";
import { EmailAIConfigModel, GenerateEmailAIDraftModel } from "../Models/EmailAIConfig.model";

@Injectable()
export class EmailAIService {
  private readonly logger = new Logger(EmailAIService.name);

  async getConfig(tenantId: string = "default"): Promise<EmailAIConfig | null> {
    return await EmailAIConfig.findOne({ where: { tenant_id: tenantId, status: true } });
  }

  async saveConfig(data: EmailAIConfigModel, userId?: string): Promise<EmailAIConfig> {
    let config = await EmailAIConfig.findOne({ where: { tenant_id: data.tenant_id || "default" } });
    if (!config) {
      config = new EmailAIConfig();
      config.tenant_id = data.tenant_id || "default";
      config.created_by_id = userId || "system";
      config.created_on = new Date();
    }
    config.auto_reply_enabled = data.auto_reply_enabled ?? true;
    config.system_prompt = data.system_prompt || null;
    config.tone = data.tone || "professional";
    config.llm_provider = data.llm_provider || "openai";
    config.llm_model = data.llm_model || "gpt-4o-mini";
    config.updated_by_id = userId || "system";
    config.updated_on = new Date();
    return await config.save();
  }

  async generateDraft(dto: GenerateEmailAIDraftModel, tenantId: string = "default") {
    const config = await this.getConfig(tenantId);
    const systemPrompt =
      config?.system_prompt ||
      `You are an executive email assistant. Tone: ${config?.tone || "professional"}. Draft a concise, courteous reply. Include a proper greeting and sign-off.`;

    const openAiKey = process.env.OPENAI_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;

    if (openAiKey) {
      try {
        const response = await axios.post(
          "https://api.openai.com/v1/chat/completions",
          {
            model: config?.llm_model || "gpt-4o-mini",
            messages: [
              { role: "system", content: systemPrompt },
              {
                role: "user",
                content: `Subject: ${dto.subject || "No subject"}\nIncoming Message:\n${dto.incoming_body || ""}`,
              },
            ],
            temperature: 0.7,
            max_tokens: 500,
          },
          {
            headers: {
              Authorization: `Bearer ${openAiKey}`,
              "Content-Type": "application/json",
            },
          }
        );
        const draftedText = response.data?.choices?.[0]?.message?.content?.trim();
        return {
          subject: dto.subject?.startsWith("Re:") ? dto.subject : `Re: ${dto.subject || "Inquiry"}`,
          draft: draftedText,
        };
      } catch (err: any) {
        this.logger.error("OpenAI email draft generation failed:", err?.response?.data || err.message);
      }
    }

    if (geminiKey) {
      try {
        const promptText = `${systemPrompt}\n\nSubject: ${dto.subject || "No subject"}\nIncoming Message:\n${dto.incoming_body || ""}`;
        const response = await axios.post(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
          {
            contents: [{ parts: [{ text: promptText }] }],
          }
        );
        const draftedText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        return {
          subject: dto.subject?.startsWith("Re:") ? dto.subject : `Re: ${dto.subject || "Inquiry"}`,
          draft: draftedText,
        };
      } catch (err: any) {
        this.logger.error("Gemini email draft generation failed:", err?.response?.data || err.message);
      }
    }

    // Default template draft when keys are not supplied
    return {
      subject: dto.subject?.startsWith("Re:") ? dto.subject : `Re: ${dto.subject || "Inquiry"}`,
      draft: `Dear Client,\n\nThank you for reaching out to us regarding "${dto.subject || "your inquiry"}".\n\nWe have received your email and our team is currently reviewing your request. We will provide a comprehensive update shortly.\n\nBest regards,\nSupport Team`,
    };
  }
}
