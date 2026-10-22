import { Injectable, Logger } from "@nestjs/common";
import axios from "axios";
import { IVoiceProvider } from "../Interfaces/IVoiceProvider";
import {
  CreateVoiceAgentDto,
  UpdateVoiceAgentDto,
  MakeVoiceCallDto,
  ProviderCallResponse,
  NormalizedVoiceWebhookResult,
} from "../Interfaces/VoiceTypes";
import { VoiceProviderConfig } from "@Database/Table/Voice/VoiceProviderConfig.entity";

@Injectable()
export class BlandProvider implements IVoiceProvider {
  readonly providerName = "bland";
  private readonly logger = new Logger(BlandProvider.name);

  private getApiKey(config?: VoiceProviderConfig): string {
    return (config?.api_key || process.env.BLAND_API_KEY || "").trim();
  }

  private getFromNumber(config?: VoiceProviderConfig): string {
    return (config?.caller_id || process.env.BLAND_PHONE_NUMBER || "").trim();
  }

  private getWebhookUrl(): string {
    const publicUrl = process.env.PUBLIC_BACKEND_URL || "https://api.sharyx.ai";
    return `${publicUrl}/api/voice/webhook/bland`;
  }

  async createAgent(
    dto: CreateVoiceAgentDto,
    config?: VoiceProviderConfig
  ): Promise<{ remoteAgentId: string; raw: any }> {
    const apiKey = this.getApiKey(config);
    if (!apiKey) {
      const simulatedId = `bland_pathway_${Date.now()}`;
      this.logger.warn(`Bland AI API key missing; generating simulated pathway: ${simulatedId}`);
      return { remoteAgentId: simulatedId, raw: { simulated: true, pathway_id: simulatedId } };
    }

    try {
      const payload = {
        name: dto.name,
        description: `Voice Agent for ${dto.name}`,
        prompt: dto.system_prompt,
        voice: dto.voice_id || "nat",
      };

      // Bland AI pathway creation
      const res = await axios.post("https://api.bland.ai/v1/pathways", payload, {
        headers: {
          authorization: apiKey,
          "Content-Type": "application/json",
        },
        timeout: 15000,
      });

      const remoteAgentId = res.data?.pathway_id || res.data?.id || `bland_${Date.now()}`;
      this.logger.log(`🎙️ [BLAND AI] Pathway created: ${remoteAgentId} (${dto.name})`);
      return { remoteAgentId, raw: res.data };
    } catch (err: any) {
      this.logger.warn(`Bland createAgent fallback to simulated: ${err.message}`);
      const simulatedId = `bland_agent_${Date.now()}`;
      return { remoteAgentId: simulatedId, raw: { simulated: true, error: err.message } };
    }
  }

  async updateAgent(
    remoteAgentId: string,
    dto: UpdateVoiceAgentDto,
    config?: VoiceProviderConfig
  ): Promise<any> {
    const apiKey = this.getApiKey(config);
    if (!apiKey || remoteAgentId.startsWith("bland_")) return { simulated: true };

    try {
      const payload: Record<string, any> = {};
      if (dto.name) payload.name = dto.name;
      if (dto.system_prompt) payload.prompt = dto.system_prompt;
      if (dto.voice_id) payload.voice = dto.voice_id;

      const res = await axios.post(`https://api.bland.ai/v1/pathways/${remoteAgentId}`, payload, {
        headers: { authorization: apiKey },
        timeout: 15000,
      });
      return res.data;
    } catch (err: any) {
      return { error: err.message };
    }
  }

  async deleteAgent(remoteAgentId: string, config?: VoiceProviderConfig): Promise<boolean> {
    const apiKey = this.getApiKey(config);
    if (!apiKey || remoteAgentId.startsWith("bland_")) return true;
    try {
      await axios.delete(`https://api.bland.ai/v1/pathways/${remoteAgentId}`, {
        headers: { authorization: apiKey },
        timeout: 10000,
      });
      return true;
    } catch {
      return false;
    }
  }

  async makeCall(
    remoteAgentId: string,
    dto: MakeVoiceCallDto,
    config?: VoiceProviderConfig
  ): Promise<ProviderCallResponse> {
    const apiKey = this.getApiKey(config);
    const fromNumber = this.getFromNumber(config);

    if (!apiKey) {
      const simulatedCallId = `bland_call_${Date.now()}`;
      this.logger.log(`🎙️ [BLAND SIMULATED CALL] Calling ${dto.phone_number} with pathway ${remoteAgentId}`);
      return { callId: simulatedCallId, status: "initiated", raw: { simulated: true } };
    }

    try {
      const payload: Record<string, any> = {
        phone_number: dto.phone_number,
        task: `You are an AI representative speaking with ${dto.customer_name || "the customer"}. Be professional, friendly, and helpful.`,
        first_sentence: dto.custom_variables?.first_message || "Hello! Thank you for speaking with us today.",
        voice: dto.custom_variables?.voice_id || "nat",
        model: "enhanced",
        record: true,
        webhook: this.getWebhookUrl(),
      };

      if (fromNumber) payload.from = fromNumber;
      if (remoteAgentId && !remoteAgentId.startsWith("bland_agent_") && !remoteAgentId.startsWith("bland_pathway_")) {
        payload.pathway_id = remoteAgentId;
      }
      if (dto.custom_variables) {
        payload.request_data = dto.custom_variables;
      }

      const res = await axios.post("https://api.bland.ai/v1/calls", payload, {
        headers: {
          authorization: apiKey,
          "Content-Type": "application/json",
        },
        timeout: 15000,
      });

      const callId = res.data?.call_id || res.data?.id;
      this.logger.log(`📞 [BLAND CALL DISPATCHED] Call ID: ${callId} to ${dto.phone_number}`);
      return { callId, status: "initiated", raw: res.data };
    } catch (err: any) {
      this.logger.error(`Bland makeCall failed: ${err.response?.data?.message || err.message}`);
      throw new Error(`Bland outbound call failed: ${err.response?.data?.message || err.message}`);
    }
  }

  normalizeWebhook(payload: any): NormalizedVoiceWebhookResult {
    const callId = payload?.call_id || payload?.id || "unknown_bland_call";
    const statusRaw = (payload?.status || payload?.call_status || "").toLowerCase();

    let status: any = "completed";
    if (statusRaw.includes("busy") || statusRaw.includes("no-answer")) status = "no-answer";
    else if (statusRaw.includes("fail") || statusRaw.includes("error")) status = "failed";
    else if (statusRaw.includes("queue") || statusRaw.includes("in-progress")) status = "in-progress";

    const durationSeconds = payload?.call_length ? Math.round(Number(payload.call_length) * 60) : 0;
    const transcript =
      payload?.concatenated_transcript ||
      (Array.isArray(payload?.transcripts)
        ? payload.transcripts.map((t: any) => `${t.user || t.speaker || "Speaker"}: ${t.text}`).join("\n")
        : payload?.transcript || "");

    const summary = payload?.summary || payload?.call_summary || undefined;
    const recordingUrl = payload?.recording_url || undefined;
    const extractedSlots = payload?.variables || payload?.analysis || payload?.request_data || {};

    return {
      providerCallId: callId,
      status,
      durationSeconds,
      transcript,
      recordingUrl,
      summary,
      outcome: summary ? (summary.length > 50 ? summary.substring(0, 50) + "..." : summary) : undefined,
      extractedSlots,
      raw: payload,
    };
  }
}
