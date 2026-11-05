import { openAiChatUrl } from "@Helper/LlmEndpoints";
import { Injectable, Logger } from "@nestjs/common";
import axios from "axios";

@Injectable()
export class OmnichannelSummarizerService {
  private readonly logger = new Logger(OmnichannelSummarizerService.name);

  async generateOneLineSummary(params: {
    channel: "whatsapp" | "email" | "call";
    content: string;
    customerName?: string;
    subject?: string;
    callOutcome?: string;
  }): Promise<string> {
    const { channel, content, customerName, subject, callOutcome } = params;

    const trimmed = (content || "").trim();
    if (!trimmed && !subject) {
      if (channel === "call") {
        return `Phone call completed with ${customerName || "customer"} (${callOutcome || "connected"})`;
      }
      return `New interaction via ${channel.toUpperCase()}`;
    }

    // Try calling Gemini / OpenAI if API key exists in environment
    const apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;
    if (apiKey) {
      try {
        if (process.env.OPENAI_API_KEY) {
          const resp = await axios.post(
            openAiChatUrl(),
            {
              model: "gpt-4o-mini",
              messages: [
                {
                  role: "system",
                  content:
                    "You are an Omnichannel CRM Summarizer. Generate a strictly ONE-LINE factual summary (max 15 words) of the customer's latest activity or intent. Do NOT use emojis, quotes, or conversational filler.",
                },
                {
                  role: "user",
                  content: `Channel: ${channel}\nSubject: ${subject || "N/A"}\nBody/Transcript: ${trimmed.slice(0, 1000)}`,
                },
              ],
              temperature: 0.3,
              max_tokens: 40,
            },
            {
              headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
              timeout: 4000,
            }
          );
          const aiSummary = resp.data?.choices?.[0]?.message?.content?.trim();
          if (aiSummary) return aiSummary.replace(/[\r\n]+/g, " ");
        }
      } catch (err: any) {
        this.logger.debug(`LLM summarizer fallback used: ${err?.message}`);
      }
    }

    // Fast, deterministic NLP rule-based fallback
    return this.synthesizeSummary(channel, trimmed, subject, customerName);
  }

  private synthesizeSummary(
    channel: "whatsapp" | "email" | "call",
    content: string,
    subject?: string,
    customerName?: string
  ): string {
    const name = customerName || "Customer";
    const lower = content.toLowerCase();

    if (channel === "call") {
      if (lower.includes("pricing") || lower.includes("cost") || lower.includes("quote")) {
        return `${name} discussed subscription tiers and pricing structure via phone call`;
      }
      if (lower.includes("demo") || lower.includes("meeting") || lower.includes("schedule")) {
        return `${name} requested a product walkthrough and scheduled an appointment`;
      }
      if (lower.includes("issue") || lower.includes("error") || lower.includes("bug") || lower.includes("support")) {
        return `${name} reported a technical inquiry and requested escalation assistance`;
      }
      return `${name} completed telephone conversation with voice representative`;
    }

    if (channel === "email") {
      if (subject) {
        // Clean subject line
        const cleanSubj = subject.replace(/^(re:|fwd:)\s*/i, "").trim();
        return `${name} sent email inquiry regarding: ${cleanSubj}`;
      }
      if (lower.includes("pricing") || lower.includes("quote")) {
        return `${name} requested official pricing breakdown and contract details`;
      }
      return `${name} submitted email regarding account setup and inquiries`;
    }

    // WhatsApp
    if (lower.includes("hello") || lower.includes("hi") || lower.includes("hey")) {
      const remaining = content.replace(/^(hello|hi|hey|good morning|good evening)[,!.\s]*/i, "").trim();
      if (remaining.length > 5) {
        return `${name}: ${remaining.slice(0, 75)}${remaining.length > 75 ? "..." : ""}`;
      }
      return `${name} initiated WhatsApp conversation with support desk`;
    }

    if (lower.includes("interested") || lower.includes("demo")) {
      return `${name} expressed interest in workforce automation demo`;
    }

    const firstSentence = content.split(/[.\n]/)[0].trim();
    if (firstSentence.length > 10) {
      return `${firstSentence.slice(0, 80)}${firstSentence.length > 80 ? "..." : ""}`;
    }

    return `${name} sent a WhatsApp inquiry: ${content.slice(0, 60)}...`;
  }
}

