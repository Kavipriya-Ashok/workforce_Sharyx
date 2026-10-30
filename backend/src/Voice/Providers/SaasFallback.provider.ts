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
    return (config?.api_key || process.env.VOICE_FALLBACK_API_KEY || process.env.VOICE_API_KEY || "").trim();
  }

  private normalizeDestinationPhone(phone: string): string {
    let clean = (phone || "").trim().replace(/[\s\-()]/g, "");
    if (!clean) return clean;
    if (clean.startsWith("+")) return clean;
    if (clean.length === 10) return `+91${clean}`;
    if (clean.length === 12 && clean.startsWith("91")) return `+${clean}`;
    return `+${clean}`;
  }

  /**
   * Resolves caller ID in prioritized order:
   * 1. GET /api/phone-numbers from SaaS: pick assigned tenant number (filtering unusable CLI numbers)
   * 2. config.caller_id if it is a valid phone number and not unusable
   * 3. process.env.VOICE_CALLER_ID
   * 4. Else throw clear Error. (Zero hardcoded numbers in source)
   */
  async resolveCallerId(
    baseUrl: string,
    token: string | null,
    tenantId: string,
    destPhone: string,
    config?: VoiceProviderConfig
  ): Promise<string> {
    const UNUSABLE_NUMBERS = ["8031339240", "60360432353", "19127334409"];
    const destIsIndian = destPhone.startsWith("+91");

    // 1. Fetch remote phone numbers from SaaS
    if (token) {
      try {
        const res = await axios.get(`${baseUrl}/api/phone-numbers`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Cookie: `token=${token}`,
            "x-tenant-id": tenantId,
          },
          timeout: 8000,
        });

        const list = res.data?.AddtionalData || res.data?.data || (Array.isArray(res.data) ? res.data : []);
        const validList = list.filter((item: any) => {
          const num = String(item?.number || item?.phone_number || "").replace(/\D/g, "");
          if (!num) return false;
          if (UNUSABLE_NUMBERS.some((bad) => num.includes(bad))) return false;
          // Only filter out US numbers if destination is Indian and the number is genuinely a US number
          if (destIsIndian && (num.startsWith("1") && num.length === 11)) return false;
          return true;
        });

        if (validList.length > 0) {
          const envDigits = (process.env.VOICE_CALLER_ID || "").replace(/\D/g, "");
          const matched = validList.find((item: any) => {
            const num = String(item?.number || item?.phone_number || "").replace(/\D/g, "");
            return (
              (envDigits && num.includes(envDigits)) ||
              item?.tenant_id === tenantId ||
              item?.tenant?.id === tenantId ||
              item?.tenant?.name === "sharyx24"
            );
          });
          const chosen = matched || validList[0];
          const rawNum = String(chosen.number || chosen.phone_number).trim();
          const formatted = rawNum.startsWith("+") ? rawNum : `+${rawNum}`;
          this.logger.log(`📱 [SAAS CALLER ID] Resolved caller ID from SaaS phone-numbers: ${formatted}`);
          return formatted;
        }
      } catch (err: any) {
        this.logger.warn(`Failed to fetch phone-numbers from SaaS: ${err.message}`);
      }
    }

    // 2. Saved provider config caller_id
    const rawConfig = (config?.caller_id || "").trim();
    if (rawConfig && !rawConfig.includes("@") && /^\+?[0-9\s\-()]+$/.test(rawConfig)) {
      const clean = rawConfig.replace(/[\s\-()]/g, "");
      const digits = clean.replace(/\D/g, "");
      const isBad = UNUSABLE_NUMBERS.some((bad) => digits.includes(bad));
      if (!isBad && (!destIsIndian || (!clean.startsWith("+1") && !clean.startsWith("1")))) {
        const formatted = clean.startsWith("+") ? clean : `+${clean}`;
        this.logger.log(`📱 [SAAS CALLER ID] Using config.caller_id: ${formatted}`);
        return formatted;
      }
    }

    // 3. process.env.VOICE_CALLER_ID fallback
    const rawEnv = (process.env.VOICE_CALLER_ID || "").trim();
    if (rawEnv && !rawEnv.includes("@") && /^\+?[0-9\s\-()]+$/.test(rawEnv)) {
      const clean = rawEnv.replace(/[\s\-()]/g, "");
      const formatted = clean.startsWith("+") ? clean : `+${clean}`;
      this.logger.log(`📱 [SAAS CALLER ID] Using process.env.VOICE_CALLER_ID: ${formatted}`);
      return formatted;
    }

    // 4. No caller ID resolved -> throw clear error
    throw new Error(
      "No valid caller ID found. Please assign an active phone number to your tenant on Sharyx or set VOICE_CALLER_ID."
    );
  }

  /**
   * Dynamically resolves auth token.
   * Authenticates with SaaS login API to obtain valid JWT session token.
   */
  async getAuthToken(config?: VoiceProviderConfig): Promise<string | null> {
    const rawKey = this.getApiKey(config);

    // 1. If an explicit JWT token or API Key (sk_live_ / sk_test_) was provided directly
    if (rawKey && (rawKey.startsWith("eyJ") || rawKey.startsWith("sk_"))) {
      return rawKey;
    }

    // 2. Check cached login token
    if (this.tokenCache && this.tokenCache.expiresAt > Date.now()) {
      return this.tokenCache.token;
    }

    const baseUrl = this.getBaseUrl(config);

    // 3. Authenticate using credentials
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

      // Extract token from Set-Cookie headers if not in body
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

      const rawList = res.data?.AddtionalData || res.data?.data || res.data?.agents || (Array.isArray(res.data) ? res.data : []);
      // Filter out draft agents that do not have active voice models or pipelines
      const list = rawList.filter((a: any) => !a.is_draft);
      this.logger.log(`📥 [SAAS FALLBACK] Successfully synced ${list.length} active agents from ${baseUrl}`);
      return list;
    } catch (err: any) {
      this.logger.warn(`SaaS Fallback listRemoteAgents error on ${baseUrl}: ${err.message}`);
      return [];
    }
  }

  private decodeJwt(token: string): any {
    try {
      const parts = token.split(".");
      if (parts.length === 3) {
        const payload = Buffer.from(parts[1], "base64").toString("utf8");
        return JSON.parse(payload);
      }
    } catch {}
    return {};
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

    const jwtData = token ? this.decodeJwt(token) : {};
    const saasTenantId = jwtData.active_tenant_id || jwtData.tenant_id || "009f2e19-d9c5-4e26-8fa4-4110c75a347f";
    const saasOrgId = jwtData.active_organization_id || jwtData.organization_id || "1dc8f398-4091-46bf-b3b5-a37070e39949";
    const saasWorkspaceId = jwtData.active_workspace_id || jwtData.workspace_id || "69eca637-38a3-4984-be9d-4421162b4e12";

    try {
      const payload = {
        name: dto.name,
        prompt: dto.system_prompt,
        system_prompt: dto.system_prompt,
        voice: dto.voice_id || "Priya",
        tts_voice_id: dto.voice_id || "Priya",
        tts_model: "eleven_flash_v2",
        stt_model: "stt-rt-v4",
        model: dto.llm_model || "gpt-4o-mini",
        llm_model: dto.llm_model || "gpt-4o-mini",
        language: dto.language || "en",
        first_message: dto.first_message,
        first_message_mode: "assistant_first",
        interruption_enabled: true,
        interruption_sensitivity: "Medium",
        is_draft: false,
        tenant_id: saasTenantId,
        workspace_id: saasWorkspaceId,
        organization_id: saasOrgId,
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
        `${baseUrl}/api/agent/update/${remoteAgentId}`,
        {
          name: dto.name,
          first_message: dto.first_message,
          first_message_mode: "assistant_first",
          system_prompt: dto.system_prompt,
          prompt: dto.system_prompt,
          is_draft: false,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Cookie: `token=${token}`,
            "x-api-key": token,
            "X-API-Key": token,
            "Content-Type": "application/json",
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
    const tenantId = dto.tenantId || "default";

    if (!token) {
      const simulatedCallId = `saas_call_${Date.now()}`;
      this.logger.log(`🎙️ [SAAS FALLBACK SIMULATED] Calling ${dto.phone_number} with agent ${remoteAgentId}`);
      return { callId: simulatedCallId, status: "initiated", raw: { simulated: true } };
    }

    const cleanDest = this.normalizeDestinationPhone(dto.phone_number);
    const callerId = await this.resolveCallerId(baseUrl, token, tenantId, cleanDest, config);

    let activeAgentId = remoteAgentId;
    // If fallback is invoked with an external agent ID (like Vapi/Retell), resolve to an active SaaS agent
    if (token) {
      try {
        const remoteAgents = await this.listRemoteAgents(config);
        const exists = remoteAgents.some((a) => (a.id || a.agent_id) === activeAgentId);
        if (!exists && remoteAgents.length > 0) {
          const preferredName = (dto.custom_variables?.agent_name || "").toLowerCase();
          const match = remoteAgents.find((a) => preferredName && (a.name || "").toLowerCase().includes(preferredName));
          activeAgentId = match ? (match.id || match.agent_id) : (remoteAgents[0].id || remoteAgents[0].agent_id);
          this.logger.log(`🔄 [SAAS FALLBACK AGENT RESOLVED] Mapped agent ${remoteAgentId} -> SaaS Agent: ${activeAgentId}`);
        }
      } catch (agentResolveErr: any) {
        this.logger.warn(`Could not resolve SaaS remote agent: ${agentResolveErr.message}`);
      }
    }

    // Personalization: Sync prompt & first_message with SaaS before makecall
    const systemPrompt = dto.custom_variables?.system_prompt;
    const firstMessage = dto.custom_variables?.first_message;
    const agentName = dto.custom_variables?.agent_name || "AI Assistant";

    if (systemPrompt || firstMessage) {
      try {
        this.logger.log(
          `🔄 [SAAS PERSONALIZATION] Updating agent ${activeAgentId} with prompt & first_message before call...`
        );
        await axios.put(
          `${baseUrl}/api/agent/update/${activeAgentId}`,
          {
            name: agentName,
            first_message: firstMessage,
            first_message_mode: "assistant_first",
            system_prompt: systemPrompt,
            is_draft: false,
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Cookie: `token=${token}`,
              "x-api-key": token,
              "X-API-Key": token,
              "Content-Type": "application/json",
            },
            timeout: 10000,
          }
        );
        this.logger.log(`✅ [SAAS PERSONALIZATION] Agent ${activeAgentId} updated successfully`);
      } catch (updateErr: any) {
        this.logger.warn(
          `⚠️ [SAAS PERSONALIZATION WARNING] Failed to update agent ${activeAgentId}: ${
            updateErr.response?.data?.message || updateErr.message
          }. Continuing with call dispatch.`
        );
      }
    }

    const jwtData = token ? this.decodeJwt(token) : {};
    const saasTenantId = jwtData.active_tenant_id || jwtData.tenant_id;
    const saasOrgId = jwtData.active_organization_id || jwtData.organization_id;
    const saasWorkspaceId = jwtData.active_workspace_id || jwtData.workspace_id;

    // Flat metadata: lead_id, tenant_id, phone, objective, first_message, custom variables
    const flatMetadata: Record<string, any> = {
      lead_id: dto.lead_id || "",
      tenant_id: saasTenantId || tenantId,
      ...(saasOrgId ? { organization_id: saasOrgId } : {}),
      ...(saasWorkspaceId ? { workspace_id: saasWorkspaceId } : {}),
      phone: cleanDest,
      first_message: firstMessage || "",
      objective: dto.custom_variables?.reason || dto.custom_variables?.objective || "",
      ...(config?.metadata?.webhook_forward_url ? { webhook_url: config.metadata.webhook_forward_url, callback_url: config.metadata.webhook_forward_url } : {}),
      ...(dto.custom_variables || {}),
    };

    // MakeCall payload: agent_id, name, phone_number, from_number, metadata (NO customer_name at root)
    const payload = {
      agent_id: activeAgentId,
      name: dto.customer_name || "Customer",
      phone_number: cleanDest,
      from_number: callerId,
      metadata: flatMetadata,
    };

    const headers = {
      Authorization: `Bearer ${token}`,
      Cookie: `token=${token}`,
      "x-api-key": token,
      "X-API-Key": token,
      ...(saasTenantId ? { "x-tenant-id": saasTenantId } : {}),
      ...(saasOrgId ? { "x-organization-id": saasOrgId } : {}),
      ...(saasWorkspaceId ? { "x-workspace-id": saasWorkspaceId } : {}),
      "Content-Type": "application/json",
    };

    const maxRetries = 4;
    let lastErr: any = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.logger.log(
          `📞 [SAAS MAKECALL] Attempt ${attempt}/${maxRetries} -> To: ${cleanDest}, From: ${callerId}, Agent: ${remoteAgentId}`
        );

        const res = await axios.post(`${baseUrl}/api/agent/makecall`, payload, {
          headers,
          timeout: 15000,
        });

        this.logger.log(`📦 [SAAS MAKECALL RAW RESPONSE]: ${JSON.stringify(res.data, null, 2)}`);
        const callId = String(
          res.data?.call_id || res.data?.id || res.data?.callId || `saas_call_${Date.now()}`
        );
        this.logger.log(
          `📞 [SAAS MAKECALL DISPATCHED] Call ID: ${callId} to ${cleanDest} (From: ${callerId}) on attempt ${attempt}`
        );
        return { callId, status: "initiated", raw: res.data };
      } catch (err: any) {
        lastErr = err;
        const msg =
          err.response?.data?.Message ||
          err.response?.data?.message ||
          (typeof err.response?.data === "string" ? err.response?.data : JSON.stringify(err.response?.data)) ||
          err.message ||
          "";

        // Retry ONLY on HTTP 500 with "Too many connections" (with progressive backoff)
        if (msg.toLowerCase().includes("too many connections") && attempt < maxRetries) {
          const delayMs = attempt * 1500;
          this.logger.warn(`SaaS connection busy (Too many connections), retrying in ${delayMs / 1000}s (attempt ${attempt}/${maxRetries})...`);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          continue;
        }

        // Never retry other errors to prevent ringing the customer twice
        break;
      }
    }

    const errBody = lastErr?.response?.data
      ? (typeof lastErr.response.data === "object" ? JSON.stringify(lastErr.response.data) : lastErr.response.data)
      : lastErr?.message || "Unknown error";
    this.logger.error(`SaaS Fallback makeCall failed: ${errBody}`);
    throw new Error(`Sharyx Voice outbound call failed: ${errBody}`);
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
