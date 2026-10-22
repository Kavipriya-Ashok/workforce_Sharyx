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
export class SaasFallbackProvider implements IVoiceProvider {
  readonly providerName = "saas_fallback";
  private readonly logger = new Logger(SaasFallbackProvider.name);
  private tokenCache: { token: string; expiresAt: number } | null = null;

  private getBaseUrl(config?: VoiceProviderConfig): string {
    return (config?.base_url || process.env.VOICE_BACKEND_URL || "https://fallback-voice.sharyx.ai").replace(/\/$/, "");
  }

  private getApiKey(config?: VoiceProviderConfig): string {
    return (config?.api_key || process.env.VOICE_API_KEY || "").trim();
  }

  private getCallerId(config?: VoiceProviderConfig): string | null {
    const raw = (config?.caller_id || process.env.VOICE_CALLER_ID || "").trim();
    // Only use if a valid phone number was explicitly entered (not an email)
    if (raw && !raw.includes("@") && /^\+?[0-9\s\-()]+$/.test(raw)) {
      return raw;
    }
    // Return null so the SaaS engine dynamically resolves the agent's/workspace's own number
    return null;
  }

  /**
   * Dynamically resolves auth token.
   * Supports:
   * 1. Direct JWT Bearer Token (starts with eyJ)
   * 2. Username:Password format in API key field
   * 3. Sharyx private key (shx_priv_...) & environment login fallback
   */
  async getAuthToken(config?: VoiceProviderConfig): Promise<string | null> {
    const rawKey = this.getApiKey(config);

    // If an explicit JWT token was provided directly
    if (rawKey && rawKey.startsWith("eyJ")) {
      return rawKey;
    }

    // Check cached login token
    if (this.tokenCache && this.tokenCache.expiresAt > Date.now()) {
      return this.tokenCache.token;
    }

    const baseUrl = this.getBaseUrl(config);

    // If user provided email:password in the API key field
    let email = process.env.SHARYX_EMAIL || process.env.VOICE_ADMIN_EMAIL || "parthibanbaskaran777@gmail.com";
    let password = process.env.SHARYX_PASSWORD || process.env.VOICE_ADMIN_PASSWORD || "Login123!!";

    if (rawKey && rawKey.includes(":")) {
      const parts = rawKey.split(":");
      email = parts[0].trim();
      password = parts.slice(1).join(":").trim();
    }

    try {
      const res = await axios.post(`${baseUrl}/api/auth/login`, { email, password }, { timeout: 8000 });
      let token = res.data?.token || res.data?.access_token || res.data?.data?.token;

      // Check cookies for token if not in body
      if (!token && res.headers?.["set-cookie"]) {
        const cookies = Array.isArray(res.headers["set-cookie"]) ? res.headers["set-cookie"] : [res.headers["set-cookie"]];
        for (const c of cookies) {
          const match = c.match(/token=([^;]+)/);
          if (match) {
            token = match[1];
            break;
          }
        }
      }

      if (token) {
        this.tokenCache = { token, expiresAt: Date.now() + 3600 * 1000 };
        this.logger.log(`🔑 [SAAS FALLBACK] Authenticated dynamically with ${baseUrl}`);
        return token;
      }
    } catch (err: any) {
      this.logger.warn(`SaaS Fallback login error: ${err.response?.data?.message || err.message}`);
    }

    return rawKey || null;
  }

  async listRemoteAgents(config?: VoiceProviderConfig): Promise<any[]> {
    const token = await this.getAuthToken(config);
    const baseUrl = this.getBaseUrl(config);
    const rawKey = this.getApiKey(config);

    if (!token) {
      this.logger.warn("SaaS Fallback token unavailable; cannot list remote agents");
      return [];
    }

    try {
      const res = await axios.get(`${baseUrl}/api/agent/list`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Cookie: `token=${token}`,
          "x-api-key": rawKey || token,
          "X-API-Key": rawKey || token,
        },
        timeout: 12000,
      });

      const list = res.data?.AddtionalData || res.data?.data || res.data?.agents || (Array.isArray(res.data) ? res.data : []);
      this.logger.log(`📥 [SAAS FALLBACK] Successfully synced ${list.length} agents from ${baseUrl}`);
      return list;
    } catch (err: any) {
      this.logger.warn(`SaaS Fallback listRemoteAgents error on ${baseUrl}: ${err.message}`);
      return [];
    }
  }

  async createAgent(
    dto: CreateVoiceAgentDto,
    config?: VoiceProviderConfig
  ): Promise<{ remoteAgentId: string; raw: any }> {
    const token = await this.getAuthToken(config);
    const baseUrl = this.getBaseUrl(config);

    if (!token) {
      this.logger.warn("SaaS Fallback API key missing; generating local simulated agent ID");
      const simulatedId = `saas_agent_${Date.now()}`;
      return { remoteAgentId: simulatedId, raw: { simulated: true, id: simulatedId } };
    }

    try {
      const payload = {
        name: dto.name,
        prompt: dto.system_prompt,
        voice: dto.voice_id || "en-IN-Wavenet-D",
        model: dto.llm_model || "gemini-2.0-flash",
        language: dto.language || "en",
        first_message: dto.first_message,
      };

      const res = await axios.post(
        `${baseUrl}/api/agent/insert`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Cookie: `token=${token}`,
            "x-api-key": token,
            "X-API-Key": token,
            "Content-Type": "application/json",
          },
          timeout: 12000,
        }
      );

      const remoteAgentId = String(
        res.data?.id || res.data?.data?.id || res.data?.agent?.id || res.data?.agentId || `saas_${Date.now()}`
      );

      this.logger.log(`🎙️ [SAAS FALLBACK] Agent successfully created on platform: ${remoteAgentId} (${dto.name})`);
      return { remoteAgentId, raw: res.data };
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message;
      this.logger.error(`SaaS agent create failed on ${baseUrl}: ${msg}`);
      throw new Error(`Sharyx Voice platform agent creation failed: ${msg}`);
    }
  }

  async updateAgent(
    remoteAgentId: string,
    dto: UpdateVoiceAgentDto,
    config?: VoiceProviderConfig
  ): Promise<any> {
    const token = await this.getAuthToken(config);
    if (!token || remoteAgentId.startsWith("saas_agent_")) {
      return { simulated: true, updated: true };
    }

    try {
      const baseUrl = this.getBaseUrl(config);
      const res = await axios.put(
        `${baseUrl}/api/agent/${remoteAgentId}`,
        {
          name: dto.name,
          prompt: dto.system_prompt,
          voice: dto.voice_id,
          first_message: dto.first_message,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Cookie: `token=${token}`,
          },
          timeout: 10000,
        }
      );
      return res.data;
    } catch (err: any) {
      this.logger.warn(`SaaS update agent failed: ${err.message}`);
      return { error: err.message };
    }
  }

  async deleteAgent(remoteAgentId: string, config?: VoiceProviderConfig): Promise<boolean> {
    const token = await this.getAuthToken(config);
    if (!token || remoteAgentId.startsWith("saas_agent_")) return true;
    try {
      const baseUrl = this.getBaseUrl(config);
      await axios.delete(`${baseUrl}/api/agent/${remoteAgentId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Cookie: `token=${token}`,
        },
        timeout: 8000,
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
    const token = await this.getAuthToken(config);
    const baseUrl = this.getBaseUrl(config);
    const callerId = this.getCallerId(config);

    if (!token) {
      const simulatedCallId = `saas_call_${Date.now()}`;
      this.logger.log(`🎙️ [SAAS FALLBACK SIMULATED] Calling ${dto.phone_number} with agent ${remoteAgentId}`);
      return { callId: simulatedCallId, status: "initiated", raw: { simulated: true } };
    }

    try {
      const payload: Record<string, any> = {
        agent_id: remoteAgentId,
        phone_number: dto.phone_number,
      };
      if (callerId) {
        payload.from_number = callerId;
      }

      const res = await axios.post(
        `${baseUrl}/api/agent/makecall`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Cookie: `token=${token}`,
            "x-api-key": token,
            "X-API-Key": token,
            "Content-Type": "application/json",
          },
          timeout: 15000,
        }
      );

      const callId = String(res.data?.call_id || res.data?.id || res.data?.callId || `saas_call_${Date.now()}`);
      this.logger.log(`📞 [SAAS FALLBACK DISPATCHED] Call ID: ${callId} to ${dto.phone_number} (From: ${callerId})`);
      return { callId, status: "initiated", raw: res.data };
    } catch (err: any) {
      const msg =
        err.response?.data?.Message ||
        err.response?.data?.message ||
        (typeof err.response?.data === "string" ? err.response?.data : JSON.stringify(err.response?.data)) ||
        err.message;
      this.logger.error(`SaaS Fallback makeCall failed: ${msg}`);
      throw new Error(`Sharyx Voice outbound call failed: ${msg}`);
    }
  }

  normalizeWebhook(payload: any): NormalizedVoiceWebhookResult {
    const providerCallId = String(payload.call_id || payload.id || `saas_${Date.now()}`);
    const transcript = payload.transcript || payload.conversation_text || "";
    let recordingUrl = payload.recording_url || payload.audio_url || "";
    const summary = payload.summary || payload.call_summary || "";

    // Normalize S3 recording URLs if returned with relative key
    if (payload.s3_key || (recordingUrl && !recordingUrl.startsWith("http"))) {
      const key = encodeURIComponent(payload.s3_key || recordingUrl);
      recordingUrl = `https://fallback-voice.sharyx.ai/api/PublicAgent/recording/s3?key=${key}`;
    }

    let status = "completed";
    if (payload.status === "failed") status = "failed";
    else if (payload.status === "no-answer") status = "no-answer";
    else if (payload.status === "busy") status = "busy";

    return {
      providerCallId,
      status: status as any,
      durationSeconds: payload.duration_seconds || payload.duration || 0,
      transcript,
      recordingUrl,
      summary,
      outcome: payload.outcome || (summary ? "completed" : undefined),
      extractedSlots: payload.extracted_slots || {},
      raw: payload,
    };
  }
}
