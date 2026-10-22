import { Injectable, Logger } from "@nestjs/common";
import axios from "axios";

export interface LlmConfig {
  provider?: string; // 'openai' | 'gemini'
  model?: string;
  apiKey?: string;
  temperature?: number;
}

export interface LlmMessage {
  role: "user" | "assistant";
  content: string;
}

/** Thin provider-agnostic LLM client returning parsed JSON. */
@Injectable()
export class AgentLlmService {
  private readonly logger = new Logger(AgentLlmService.name);

  private resolve(cfg: LlmConfig) {
    const uiKey = (cfg.apiKey || "").trim();
    const isSk = uiKey.startsWith("sk-");

    const openAiKey = (isSk ? uiKey : process.env.OPENAI_API_KEY || "").trim();
    const geminiKey = (process.env.GEMINI_API_KEY || (!isSk && uiKey ? uiKey : "")).trim();

    let provider = cfg.provider;
    if (provider === "openai" && !openAiKey && geminiKey) {
      provider = "gemini";
    }
    if (provider === "gemini" && !geminiKey && openAiKey) {
      provider = "openai";
    }
    if (!provider) {
      provider = openAiKey ? "openai" : geminiKey ? "gemini" : undefined;
    }

    return { provider, geminiKey, openAiKey };
  }

  isAvailable(cfg: LlmConfig = {}): boolean {
    return Boolean(this.resolve(cfg).provider);
  }

  /** Calls the LLM and returns a parsed JSON object (or null on failure). */
  async completeJson<T = any>(
    systemPrompt: string,
    history: LlmMessage[],
    userMessage: string,
    cfg: LlmConfig = {}
  ): Promise<T | null> {
    const { provider, geminiKey, openAiKey } = this.resolve(cfg);
    if (!provider) return null;
    const temperature = cfg.temperature ?? 0.4;

    try {
      if (provider === "openai") {
        const model = cfg.model && !cfg.model.startsWith("gemini") ? cfg.model : "gpt-4o-mini";
        const res = await axios.post(
          "https://api.openai.com/v1/chat/completions",
          {
            model,
            temperature,
            max_tokens: 700,
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: systemPrompt },
              ...history.slice(-12),
              { role: "user", content: userMessage },
            ],
          },
          {
            headers: { Authorization: `Bearer ${openAiKey}`, "Content-Type": "application/json" },
            timeout: 20000,
          }
        );
        return this.parse<T>(res.data?.choices?.[0]?.message?.content);
      }

      // Gemini
      let model = cfg.model && cfg.model.startsWith("gemini") ? cfg.model : "gemini-2.5-flash";
      if (model.includes("1.5")) model = "gemini-2.5-flash";
      const contents = [
        ...history.slice(-12).map((h) => ({
          role: h.role === "assistant" ? "model" : "user",
          parts: [{ text: h.content }],
        })),
        { role: "user", parts: [{ text: userMessage }] },
      ];
      const body = {
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: { temperature, responseMimeType: "application/json", maxOutputTokens: 1024 },
      };
      for (const m of [model, "gemini-flash-latest"]) {
        try {
          const res = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${geminiKey}`,
            body,
            { timeout: 20000 }
          );
          const parsed = this.parse<T>(res.data?.candidates?.[0]?.content?.parts?.[0]?.text);
          if (parsed) return parsed;
        } catch (err: any) {
          this.logger.warn(`Gemini ${m} failed: ${err?.response?.data?.error?.message || err.message}`);
        }
      }
    } catch (err: any) {
      this.logger.error(`LLM (${provider}) error: ${JSON.stringify(err?.response?.data || err.message)}`);
    }
    return null;
  }

  private parse<T>(raw?: string): T | null {
    if (!raw) return null;
    let text = raw.trim().replace(/^```json/i, "").replace(/^```/, "").replace(/```$/, "").trim();
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start >= 0 && end > start) text = text.slice(start, end + 1);
    try {
      return JSON.parse(text) as T;
    } catch {
      this.logger.warn(`Could not parse LLM JSON: ${text.slice(0, 200)}`);
      return null;
    }
  }
}
