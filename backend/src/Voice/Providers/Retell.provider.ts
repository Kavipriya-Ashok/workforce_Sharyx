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
export class RetellProvider implements IVoiceProvider {
  readonly providerName = "retell";
  private readonly logger = new Logger(RetellProvider.name);

  private getApiKey(config?: VoiceProviderConfig): string {
    return (config?.api_key || process.env.RETELL_API_KEY || "").trim();
  }

  private getFromNumber(config?: VoiceProviderConfig): string {
    return (config?.caller_id || process.env.RETELL_PHONE_NUMBER || "").trim();
  }

  private getWebhookUrl(): string {
    const publicUrl = process.env.PUBLIC_BACKEND_URL || "https://api.sharyx.ai";
    return `${publicUrl}/api/voice/webhook/retell`;
  }

  async createAgent(
    dto: CreateVoiceAgentDto,
    config?: VoiceProviderConfig
  ): Promise<{ remoteAgentId: string; raw: any }> {
    const apiKey = this.getApiKey(config);
    if (!apiKey) {
      this.logger.warn("Retell API key missing; generating simulated remote agent ID");
      const simulatedId = `retell_agent_${Date.now()}`;
      return { remoteAgentId: simulatedId, raw: { simulated: true, agent_id: simulatedId } };
    }

    try {
      const payload = {
        agent_name: dto.name,
        voice_id: dto.voice_id || "11labs-Adrian",
        response_engine: {
          type: "retell-llm",
          llm_id: dto.llm_model || "gpt-4o-mini",
        },
        general_prompt: dto.system_prompt,
        begin_message: dto.first_message || "Hello! Thank you for connecting with us.",
        webhook_url: this.getWebhookUrl(),
      };

      const res = await axios.post("https://api.retellai.com/create-agent", payload, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        timeout: 15000,
      });

      const remoteAgentId = res.data?.agent_id;
      this.logger.log(`🎙️ [RETELL] Agent created: ${remoteAgentId} (${dto.name})`);
      return { remoteAgentId, raw: res.data };
    } catch (err: any) {
      this.logger.error(`Retell create agent failed: ${err.response?.data?.message || err.message}`);
      throw new Error(`Retell agent creation failed: ${err.response?.data?.message || err.message}`);
    }
  }

  async updateAgent(
    remoteAgentId: string,
    dto: UpdateVoiceAgentDto,
    config?: VoiceProviderConfig
  ): Promise<any> {
    const apiKey = this.getApiKey(config);
    if (!apiKey || remoteAgentId.startsWith("retell_agent_")) {
      return { simulated: true, updated: true };
    }

    try {
      const payload: Record<string, any> = {};
      if (dto.name) payload.agent_name = dto.name;
      if (dto.first_message) payload.begin_message = dto.first_message;
      if (dto.system_prompt) payload.general_prompt = dto.system_prompt;
      if (dto.voice_id) payload.voice_id = dto.voice_id;

      const res = await axios.patch(`https://api.retellai.com/update-agent/${remoteAgentId}`, payload, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        timeout: 15000,
      });
      return res.data;
    } catch (err: any) {
      this.logger.warn(`Retell update agent failed: ${err.message}`);
      return { error: err.message };
    }
  }

  async deleteAgent(remoteAgentId: string, config?: VoiceProviderConfig): Promise<boolean> {
    const apiKey = this.getApiKey(config);
    if (!apiKey || remoteAgentId.startsWith("retell_agent_")) return true;
    try {
      await axios.delete(`https://api.retellai.com/delete-agent/${remoteAgentId}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
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
      const simulatedCallId = `retell_call_${Date.now()}`;
      this.logger.log(`🎙️ [RETELL SIMULATED CALL] Calling ${dto.phone_number} with agent ${remoteAgentId}`);
      return { callId: simulatedCallId, status: "initiated", raw: { simulated: true } };
    }

    try {
      const payload: Record<string, any> = {
        agent_id: remoteAgentId,
        to_number: dto.phone_number,
      };

      if (fromNumber) payload.from_number = fromNumber;
      if (dto.custom_variables) payload.retell_llm_dynamic_variables = dto.custom_variables;

      const res = await axios.post("https://api.retellai.com/v2/create-phone-call", payload, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        timeout: 15000,
      });

      const callId = res.data?.call_id;
      this.logger.log(`📞 [RETELL CALL DISPATCHED] Call ID: ${callId} to ${dto.phone_number}`);
      return { callId, status: "initiated", raw: res.data };
    } catch (err: any) {
      this.logger.error(`Retell makeCall failed: ${err.response?.data?.message || err.message}`);
      throw new Error(`Retell outbound call failed: ${err.response?.data?.message || err.message}`);
    }
  }

  normalizeWebhook(payload: any): NormalizedVoiceWebhookResult {
    const data = payload?.call || payload?.data || payload;
    const providerCallId = data.call_id || data.id || `retell_${Date.now()}`;
    const transcript = data.transcript || "";
    const recordingUrl = data.recording_url || "";
    const summary = data.call_analysis?.call_summary || data.summary || "";

    let status = "completed";
    if (data.call_status === "registered" || data.call_status === "ongoing") status = "in-progress";
    else if (data.disconnection_reason === "user_did_not_answer") status = "no-answer";
    else if (data.disconnection_reason === "user_busy") status = "busy";
    else if (data.call_status === "error") status = "failed";
    else status = "completed";

    const durationSeconds = data.duration_ms ? Math.round(data.duration_ms / 1000) : 0;

    return {
      providerCallId,
      status: status as any,
      durationSeconds,
      transcript,
      recordingUrl,
      summary,
      outcome: data.call_analysis?.user_sentiment || (summary ? "completed" : undefined),
      extractedSlots: data.call_analysis?.custom_analysis_data || {},
      raw: payload,
    };
  }
}
