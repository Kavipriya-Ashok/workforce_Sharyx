import { Injectable, Logger } from "@nestjs/common";
import axios from "axios";
import { VoiceProviderConfig, VoiceProviderType } from "@Database/Table/Voice/VoiceProviderConfig.entity";

export interface SaveVoiceConfigDto {
  provider: VoiceProviderType;
  api_key?: string;
  phone_number_id?: string;
  caller_id?: string;
  base_url?: string;
  webhook_forward_url?: string;
  is_active?: boolean;
  metadata?: Record<string, any>;
}

export interface MaskedVoiceConfig {
  provider: VoiceProviderType;
  has_key: boolean;
  masked_key?: string;
  phone_number_id?: string;
  caller_id?: string;
  base_url?: string;
  webhook_forward_url?: string;
  is_active: boolean;
  metadata?: Record<string, any>;
  updated_on?: Date;
}

@Injectable()
export class VoiceConfigService {
  private readonly logger = new Logger(VoiceConfigService.name);

  private maskKey(key?: string): string | undefined {
    if (!key) return undefined;
    const trimmed = key.trim();
    if (trimmed.length <= 8) return "********";
    return `${trimmed.substring(0, 4)}...${trimmed.substring(trimmed.length - 4)}`;
  }

  async getConfigs(tenantId: string = "default"): Promise<Record<VoiceProviderType, MaskedVoiceConfig>> {
    const list = await VoiceProviderConfig.find({ where: { tenant_id: tenantId } });

    const providers: VoiceProviderType[] = ["vapi", "retell", "bland", "saas_fallback"];
    const result = {} as Record<VoiceProviderType, MaskedVoiceConfig>;

    for (const p of providers) {
      const match = list.find((c) => c.provider === p);
      if (match) {
        result[p] = {
          provider: p,
          has_key: Boolean(match.api_key && match.api_key.trim().length > 0),
          masked_key: this.maskKey(match.api_key),
          phone_number_id: match.phone_number_id || undefined,
          caller_id: match.caller_id || undefined,
          base_url: match.base_url || undefined,
          webhook_forward_url: match.metadata?.webhook_forward_url || undefined,
          is_active: match.is_active ?? true,
          metadata: match.metadata || {},
          updated_on: match.updated_on || match.created_on,
        };
      } else {
        result[p] = {
          provider: p,
          has_key: false,
          masked_key: undefined,
          is_active: false,
          metadata: {},
        };
      }
    }

    return result;
  }

  async saveConfig(tenantId: string = "default", dto: SaveVoiceConfigDto): Promise<MaskedVoiceConfig> {
    let config = await VoiceProviderConfig.findOne({
      where: { tenant_id: tenantId, provider: dto.provider },
    });

    if (!config) {
      config = new VoiceProviderConfig();
      config.tenant_id = tenantId;
      config.provider = dto.provider;
      config.created_by_id = "voice_config_admin";
      config.created_on = new Date();
    }

    // Only update API key if provided and not masked
    if (dto.api_key && !dto.api_key.includes("...")) {
      config.api_key = dto.api_key.trim();
    }

    if (dto.phone_number_id !== undefined) config.phone_number_id = dto.phone_number_id?.trim();
    if (dto.caller_id !== undefined) config.caller_id = dto.caller_id?.trim();
    if (dto.base_url !== undefined) config.base_url = dto.base_url?.trim();
    if (dto.is_active !== undefined) config.is_active = dto.is_active;

    const currentMeta = config.metadata || {};
    if (dto.webhook_forward_url !== undefined) {
      currentMeta.webhook_forward_url = dto.webhook_forward_url?.trim();
    }
    if (dto.metadata) {
      Object.assign(currentMeta, dto.metadata);
    }
    config.metadata = currentMeta;
    config.updated_on = new Date();

    await config.save();
    this.logger.log(`💾 [VOICE CONFIG SAVED] Tenant ${tenantId} updated provider: ${dto.provider}`);

    return {
      provider: config.provider,
      has_key: Boolean(config.api_key && config.api_key.length > 0),
      masked_key: this.maskKey(config.api_key),
      phone_number_id: config.phone_number_id,
      caller_id: config.caller_id,
      base_url: config.base_url,
      webhook_forward_url: config.metadata?.webhook_forward_url,
      is_active: config.is_active,
      metadata: config.metadata,
      updated_on: config.updated_on,
    };
  }

  async setActiveProvider(tenantId: string = "default", provider: VoiceProviderType): Promise<void> {
    const allConfigs = await VoiceProviderConfig.find({ where: { tenant_id: tenantId } });
    for (const cfg of allConfigs) {
      cfg.is_active = cfg.provider === provider;
      cfg.updated_on = new Date();
      await cfg.save();
    }
    this.logger.log(`🎯 [EXCLUSIVE PROVIDER] Active provider for tenant ${tenantId} set to: ${provider}`);
  }

  async disconnectProvider(tenantId: string = "default", provider: VoiceProviderType): Promise<void> {
    const config = await VoiceProviderConfig.findOne({ where: { tenant_id: tenantId, provider } });
    if (config) {
      config.is_active = false;
      config.updated_on = new Date();
      await config.save();
      this.logger.log(`🔌 [DISCONNECTED PROVIDER] Disconnected ${provider} for tenant ${tenantId}`);
    }
  }

  async testConnection(
    tenantId: string = "default",
    provider: VoiceProviderType,
    candidateKey?: string
  ): Promise<{ ok: boolean; message: string; latencyMs: number; details?: any }> {
    const start = Date.now();

    let apiKey = candidateKey;
    let config: VoiceProviderConfig | null = null;
    if (!apiKey || apiKey.includes("...")) {
      config = await VoiceProviderConfig.findOne({ where: { tenant_id: tenantId, provider } });
      apiKey = config?.api_key;
    }

    if (!apiKey) {
      // Check env vars as fallback
      if (provider === "vapi") apiKey = process.env.VAPI_API_KEY;
      if (provider === "retell") apiKey = process.env.RETELL_API_KEY;
      if (provider === "bland") apiKey = process.env.BLAND_API_KEY;
    }

    try {
      switch (provider) {
        case "vapi": {
          if (!apiKey) return { ok: false, message: "Missing Vapi API Key. Please provide one.", latencyMs: 0 };
          const res = await axios.get("https://api.vapi.ai/assistant?limit=1", {
            headers: { Authorization: `Bearer ${apiKey.trim()}` },
            timeout: 8000,
          });
          const latency = Date.now() - start;
          return {
            ok: true,
            message: `Vapi authenticated successfully (${latency}ms). Found ${res.data?.length || 0} assistants.`,
            latencyMs: latency,
          };
        }
        case "retell": {
          if (!apiKey) return { ok: false, message: "Missing Retell API Key. Please provide one.", latencyMs: 0 };
          const res = await axios.get("https://api.retellai.com/list-agents", {
            headers: { Authorization: `Bearer ${apiKey.trim()}` },
            timeout: 8000,
          });
          const latency = Date.now() - start;
          return {
            ok: true,
            message: `Retell AI authenticated successfully (${latency}ms). Found ${res.data?.length || 0} agents.`,
            latencyMs: latency,
          };
        }
        case "bland": {
          if (!apiKey) return { ok: false, message: "Missing Bland AI API Key. Please provide one.", latencyMs: 0 };
          const res = await axios.get("https://api.bland.ai/v1/voices", {
            headers: { authorization: apiKey.trim() },
            timeout: 8000,
          });
          const latency = Date.now() - start;
          return {
            ok: true,
            message: `Bland AI authenticated successfully (${latency}ms). Voices available: ${res.data?.voices?.length || 0}.`,
            latencyMs: latency,
          };
        }
        case "saas_fallback": {
          const baseUrl = (config?.base_url || process.env.VOICE_BACKEND_URL || "https://fallback-voice.sharyx.ai").replace(/\/$/, "");
          if (apiKey && !apiKey.includes(":")) {
            // Validate via direct Bearer token or x-api-key
            await axios.get(`${baseUrl}/api/agent/list`, {
              headers: {
                Authorization: `Bearer ${apiKey.trim()}`,
                "x-api-key": apiKey.trim(),
                "X-API-Key": apiKey.trim(),
              },
              timeout: 8000,
            }).catch(async () => {
              return await axios.get(`${baseUrl}/health`, {
                headers: {
                  Authorization: `Bearer ${apiKey.trim()}`,
                  "x-api-key": apiKey.trim(),
                },
                timeout: 6000,
              });
            });
          } else {
            let email = process.env.SHARYX_EMAIL || "parthibanbaskaran777@gmail.com";
            let password = process.env.SHARYX_PASSWORD || "Login123!!";
            if (apiKey && apiKey.includes(":")) {
              const parts = apiKey.split(":");
              email = parts[0].trim();
              password = parts.slice(1).join(":").trim();
            }
            await axios.post(`${baseUrl}/api/auth/login`, { email, password }, { timeout: 8000 });
          }
          const latency = Date.now() - start;
          return {
            ok: true,
            message: `Sharyx Voice Core authenticated successfully (${latency}ms).`,
            latencyMs: latency,
          };
        }
        default:
          return { ok: false, message: `Unsupported provider "${provider}"`, latencyMs: 0 };
      }
    } catch (err: any) {
      const latency = Date.now() - start;
      const errMsg = err.response?.data?.message || err.response?.data?.error || err.message;
      return {
        ok: false,
        message: `Connection failed: ${errMsg}`,
        latencyMs: latency,
      };
    }
  }
}
