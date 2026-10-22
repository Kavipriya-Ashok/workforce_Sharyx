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
export class VapiProvider implements IVoiceProvider {
  readonly providerName = "vapi";
  private readonly logger = new Logger(VapiProvider.name);

  private getApiKey(config?: VoiceProviderConfig): string {
    return (config?.api_key || process.env.VAPI_API_KEY || "").trim();
  }

  private getPhoneNumberId(config?: VoiceProviderConfig): string {
    return (config?.phone_number_id || process.env.VAPI_PHONE_NUMBER_ID || "").trim();
  }

  private getWebhookUrl(): string {
    const publicUrl = process.env.PUBLIC_BACKEND_URL || "https://api.sharyx.ai";
    return `${publicUrl}/api/voice/webhook/vapi`;
  }

  async createAgent(
    dto: CreateVoiceAgentDto,
    config?: VoiceProviderConfig
  ): Promise<{ remoteAgentId: string; raw: any }> {
    const apiKey = this.getApiKey(config);
    if (!apiKey) {
      this.logger.warn("Vapi API key missing; generating simulated remote agent ID");
      const simulatedId = `vapi_asst_${Date.now()}`;
      return { remoteAgentId: simulatedId, raw: { simulated: true, id: simulatedId } };
    }

    try {
      const payload = {
        name: dto.name,
        model: {
          provider: "openai",
          model: dto.llm_model || "gpt-4o-mini",
          temperature: dto.temperature ?? 0.4,
          messages: [{ role: "system", content: dto.system_prompt }],
        },
        voice: {
          provider: dto.voice_provider === "elevenlabs" ? "11labs" : (dto.voice_provider || "11labs"),
          voiceId: dto.voice_id || "21m00Tcm4TlvDq8ikWAM", // default Rachel / Jennifer
        },
        firstMessage: dto.first_message || "Hello, thank you for connecting with us! How can I assist you today?",
        serverUrl: this.getWebhookUrl(),
        ...(dto.transfer_phone_number ? { forwardingPhoneNumber: dto.transfer_phone_number } : {}),
      };

      const res = await axios.post("https://api.vapi.ai/assistant", payload, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        timeout: 15000,
      });

      const remoteAgentId = res.data?.id;
      this.logger.log(`🎙️ [VAPI] Assistant created on Vapi platform: ${remoteAgentId} (${dto.name})`);
      return { remoteAgentId, raw: res.data };
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message;
      this.logger.error(`Vapi create assistant failed: ${msg}`);
      throw new Error(`Vapi agent creation failed: ${msg}`);
    }
  }

  async listRemoteAgents(config?: VoiceProviderConfig): Promise<any[]> {
    const apiKey = this.getApiKey(config);
    if (!apiKey) return [];
    try {
      const res = await axios.get("https://api.vapi.ai/assistant", {
        headers: { Authorization: `Bearer ${apiKey}` },
        timeout: 10000,
      });
      return Array.isArray(res.data) ? res.data : [];
    } catch (err: any) {
      this.logger.warn(`Failed to list Vapi assistants: ${err.message}`);
      return [];
    }
  }

  async updateAgent(
    remoteAgentId: string,
    dto: UpdateVoiceAgentDto,
    config?: VoiceProviderConfig
  ): Promise<any> {
    const apiKey = this.getApiKey(config);
    if (!apiKey || remoteAgentId.startsWith("vapi_asst_")) {
      return { simulated: true, updated: true };
    }

    try {
      const payload: Record<string, any> = {};
      if (dto.name) payload.name = dto.name;
      if (dto.first_message) payload.firstMessage = dto.first_message;
      if (dto.system_prompt) {
        payload.model = {
          provider: "openai",
          model: dto.llm_model || "gpt-4o-mini",
          messages: [{ role: "system", content: dto.system_prompt }],
        };
      }
      if (dto.voice_id || dto.voice_provider) {
        payload.voice = {
          provider: dto.voice_provider === "elevenlabs" ? "11labs" : (dto.voice_provider || "11labs"),
          voiceId: dto.voice_id || "21m00Tcm4TlvDq8ikWAM",
        };
      }
      if (dto.transfer_phone_number !== undefined) {
        payload.forwardingPhoneNumber = dto.transfer_phone_number;
      }

      const res = await axios.patch(`https://api.vapi.ai/assistant/${remoteAgentId}`, payload, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        timeout: 15000,
      });
      return res.data;
    } catch (err: any) {
      this.logger.warn(`Vapi update assistant failed: ${err.message}`);
      return { error: err.message };
    }
  }

  async deleteAgent(remoteAgentId: string, config?: VoiceProviderConfig): Promise<boolean> {
    const apiKey = this.getApiKey(config);
    if (!apiKey || remoteAgentId.startsWith("vapi_asst_")) return true;
    try {
      await axios.delete(`https://api.vapi.ai/assistant/${remoteAgentId}`, {
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
    const phoneNumberId = this.getPhoneNumberId(config);

    if (!apiKey) {
      const simulatedCallId = `vapi_call_${Date.now()}`;
      this.logger.log(`🎙️ [VAPI SIMULATED CALL] Calling ${dto.phone_number} with assistant ${remoteAgentId}`);
      return { callId: simulatedCallId, status: "initiated", raw: { simulated: true } };
    }

    try {
      const payload: Record<string, any> = {
        assistantId: remoteAgentId,
        customer: {
          number: dto.phone_number,
          name: dto.customer_name || "Valued Customer",
        },
      };

      let resolvedPhoneId = phoneNumberId;
      if (!resolvedPhoneId) {
        try {
          const listRes = await axios.get("https://api.vapi.ai/phone-number", {
            headers: { Authorization: `Bearer ${apiKey}` },
            timeout: 6000,
          });
          if (Array.isArray(listRes.data) && listRes.data.length > 0) {
            resolvedPhoneId = listRes.data[0].id;
            this.logger.log(`📞 [VAPI AUTO-RESOLVED PHONE] Auto-detected caller ID: ${listRes.data[0].number || listRes.data[0].id}`);
          }
        } catch (err: any) {
          this.logger.warn(`Could not auto-fetch Vapi phone numbers: ${err.message}`);
        }
      }

      if (resolvedPhoneId) {
        payload.phoneNumberId = resolvedPhoneId;
      }

      if (dto.custom_variables) {
        payload.assistantOverrides = {
          variableValues: dto.custom_variables,
          ...(dto.custom_variables.first_message ? { firstMessage: dto.custom_variables.first_message } : {}),
        };
      }

      const res = await axios.post("https://api.vapi.ai/call/phone", payload, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        timeout: 15000,
      });

      const callId = res.data?.id;
      this.logger.log(`📞 [VAPI CALL DISPATCHED] Call ID: ${callId} to ${dto.phone_number}`);
      return { callId, status: "initiated", raw: res.data };
    } catch (err: any) {
      this.logger.error(`Vapi makeCall failed: ${err.response?.data?.message || err.message}`);
      throw new Error(`Vapi outbound call failed: ${err.response?.data?.message || err.message}`);
    }
  }

  normalizeWebhook(payload: any): NormalizedVoiceWebhookResult {
    const message = payload?.message || payload;
    const type = message?.type || payload?.type;
    const call = message?.call || payload?.call || {};

    const providerCallId = call.id || message.callId || payload.callId || `vapi_${Date.now()}`;
    const transcript =
      message?.transcript ||
      call.artifact?.transcript ||
      (Array.isArray(call.messages)
        ? call.messages.map((m: any) => `${m.role}: ${m.message}`).join("\n")
        : "");

    const recordingUrl =
      call.artifact?.recordingUrl ||
      call.artifact?.stereoRecordingUrl ||
      message.recordingUrl ||
      "";

    const summary =
      call.analysis?.summary ||
      message?.analysis?.summary ||
      message?.summary ||
      "";

    let status = "completed";
    if (call.status === "ended") {
      const reason = call.endedReason || message.endedReason;
      if (reason === "customer-did-not-answer" || reason === "no-answer") status = "no-answer";
      else if (reason === "customer-busy" || reason === "busy") status = "busy";
      else if (reason?.includes("fail") || reason?.includes("error")) status = "failed";
      else status = "completed";
    }

    const durationSeconds =
      call.duration ||
      (call.endedAt && call.startedAt
        ? Math.round((new Date(call.endedAt).getTime() - new Date(call.startedAt).getTime()) / 1000)
        : 0);

    return {
      providerCallId,
      status: status as any,
      durationSeconds,
      transcript,
      recordingUrl,
      summary,
      outcome: call.analysis?.structuredData?.outcome || (summary ? "completed" : undefined),
      extractedSlots: call.analysis?.structuredData || {},
      raw: payload,
    };
  }
}
