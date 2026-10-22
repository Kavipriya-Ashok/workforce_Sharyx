"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var VoiceConfigService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.VoiceConfigService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = __importDefault(require("axios"));
const VoiceProviderConfig_entity_1 = require("../../Database/Table/Voice/VoiceProviderConfig.entity");
let VoiceConfigService = VoiceConfigService_1 = class VoiceConfigService {
    constructor() {
        this.logger = new common_1.Logger(VoiceConfigService_1.name);
    }
    maskKey(key) {
        if (!key)
            return undefined;
        const trimmed = key.trim();
        if (trimmed.length <= 8)
            return "********";
        return `${trimmed.substring(0, 4)}...${trimmed.substring(trimmed.length - 4)}`;
    }
    async getConfigs(tenantId = "default") {
        var _a, _b;
        const list = await VoiceProviderConfig_entity_1.VoiceProviderConfig.find({ where: { tenant_id: tenantId } });
        const providers = ["vapi", "retell", "bland", "saas_fallback"];
        const result = {};
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
                    webhook_forward_url: ((_a = match.metadata) === null || _a === void 0 ? void 0 : _a.webhook_forward_url) || undefined,
                    is_active: (_b = match.is_active) !== null && _b !== void 0 ? _b : true,
                    metadata: match.metadata || {},
                    updated_on: match.updated_on || match.created_on,
                };
            }
            else {
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
    async saveConfig(tenantId = "default", dto) {
        var _a, _b, _c, _d, _e;
        let config = await VoiceProviderConfig_entity_1.VoiceProviderConfig.findOne({
            where: { tenant_id: tenantId, provider: dto.provider },
        });
        if (!config) {
            config = new VoiceProviderConfig_entity_1.VoiceProviderConfig();
            config.tenant_id = tenantId;
            config.provider = dto.provider;
            config.created_by_id = "voice_config_admin";
            config.created_on = new Date();
        }
        if (dto.api_key && !dto.api_key.includes("...")) {
            config.api_key = dto.api_key.trim();
        }
        if (dto.phone_number_id !== undefined)
            config.phone_number_id = (_a = dto.phone_number_id) === null || _a === void 0 ? void 0 : _a.trim();
        if (dto.caller_id !== undefined)
            config.caller_id = (_b = dto.caller_id) === null || _b === void 0 ? void 0 : _b.trim();
        if (dto.base_url !== undefined)
            config.base_url = (_c = dto.base_url) === null || _c === void 0 ? void 0 : _c.trim();
        if (dto.is_active !== undefined)
            config.is_active = dto.is_active;
        const currentMeta = config.metadata || {};
        if (dto.webhook_forward_url !== undefined) {
            currentMeta.webhook_forward_url = (_d = dto.webhook_forward_url) === null || _d === void 0 ? void 0 : _d.trim();
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
            webhook_forward_url: (_e = config.metadata) === null || _e === void 0 ? void 0 : _e.webhook_forward_url,
            is_active: config.is_active,
            metadata: config.metadata,
            updated_on: config.updated_on,
        };
    }
    async setActiveProvider(tenantId = "default", provider) {
        const allConfigs = await VoiceProviderConfig_entity_1.VoiceProviderConfig.find({ where: { tenant_id: tenantId } });
        for (const cfg of allConfigs) {
            cfg.is_active = cfg.provider === provider;
            cfg.updated_on = new Date();
            await cfg.save();
        }
        this.logger.log(`🎯 [EXCLUSIVE PROVIDER] Active provider for tenant ${tenantId} set to: ${provider}`);
    }
    async disconnectProvider(tenantId = "default", provider) {
        const config = await VoiceProviderConfig_entity_1.VoiceProviderConfig.findOne({ where: { tenant_id: tenantId, provider } });
        if (config) {
            config.is_active = false;
            config.updated_on = new Date();
            await config.save();
            this.logger.log(`🔌 [DISCONNECTED PROVIDER] Disconnected ${provider} for tenant ${tenantId}`);
        }
    }
    async testConnection(tenantId = "default", provider, candidateKey) {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        const start = Date.now();
        let apiKey = candidateKey;
        let config = null;
        if (!apiKey || apiKey.includes("...")) {
            config = await VoiceProviderConfig_entity_1.VoiceProviderConfig.findOne({ where: { tenant_id: tenantId, provider } });
            apiKey = config === null || config === void 0 ? void 0 : config.api_key;
        }
        if (!apiKey) {
            if (provider === "vapi")
                apiKey = process.env.VAPI_API_KEY;
            if (provider === "retell")
                apiKey = process.env.RETELL_API_KEY;
            if (provider === "bland")
                apiKey = process.env.BLAND_API_KEY;
        }
        try {
            switch (provider) {
                case "vapi": {
                    if (!apiKey)
                        return { ok: false, message: "Missing Vapi API Key. Please provide one.", latencyMs: 0 };
                    const res = await axios_1.default.get("https://api.vapi.ai/assistant?limit=1", {
                        headers: { Authorization: `Bearer ${apiKey.trim()}` },
                        timeout: 8000,
                    });
                    const latency = Date.now() - start;
                    return {
                        ok: true,
                        message: `Vapi authenticated successfully (${latency}ms). Found ${((_a = res.data) === null || _a === void 0 ? void 0 : _a.length) || 0} assistants.`,
                        latencyMs: latency,
                    };
                }
                case "retell": {
                    if (!apiKey)
                        return { ok: false, message: "Missing Retell API Key. Please provide one.", latencyMs: 0 };
                    const res = await axios_1.default.get("https://api.retellai.com/list-agents", {
                        headers: { Authorization: `Bearer ${apiKey.trim()}` },
                        timeout: 8000,
                    });
                    const latency = Date.now() - start;
                    return {
                        ok: true,
                        message: `Retell AI authenticated successfully (${latency}ms). Found ${((_b = res.data) === null || _b === void 0 ? void 0 : _b.length) || 0} agents.`,
                        latencyMs: latency,
                    };
                }
                case "bland": {
                    if (!apiKey)
                        return { ok: false, message: "Missing Bland AI API Key. Please provide one.", latencyMs: 0 };
                    const res = await axios_1.default.get("https://api.bland.ai/v1/voices", {
                        headers: { authorization: apiKey.trim() },
                        timeout: 8000,
                    });
                    const latency = Date.now() - start;
                    return {
                        ok: true,
                        message: `Bland AI authenticated successfully (${latency}ms). Voices available: ${((_d = (_c = res.data) === null || _c === void 0 ? void 0 : _c.voices) === null || _d === void 0 ? void 0 : _d.length) || 0}.`,
                        latencyMs: latency,
                    };
                }
                case "saas_fallback": {
                    const baseUrl = ((config === null || config === void 0 ? void 0 : config.base_url) || process.env.VOICE_BACKEND_URL || "https://fallback-voice.sharyx.ai").replace(/\/$/, "");
                    if (apiKey && !apiKey.includes(":")) {
                        await axios_1.default.get(`${baseUrl}/api/agent/list`, {
                            headers: {
                                Authorization: `Bearer ${apiKey.trim()}`,
                                "x-api-key": apiKey.trim(),
                                "X-API-Key": apiKey.trim(),
                            },
                            timeout: 8000,
                        }).catch(async () => {
                            return await axios_1.default.get(`${baseUrl}/health`, {
                                headers: {
                                    Authorization: `Bearer ${apiKey.trim()}`,
                                    "x-api-key": apiKey.trim(),
                                },
                                timeout: 6000,
                            });
                        });
                    }
                    else {
                        let email = process.env.SHARYX_EMAIL || "parthibanbaskaran777@gmail.com";
                        let password = process.env.SHARYX_PASSWORD || "Login123!!";
                        if (apiKey && apiKey.includes(":")) {
                            const parts = apiKey.split(":");
                            email = parts[0].trim();
                            password = parts.slice(1).join(":").trim();
                        }
                        await axios_1.default.post(`${baseUrl}/api/auth/login`, { email, password }, { timeout: 8000 });
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
        }
        catch (err) {
            const latency = Date.now() - start;
            const errMsg = ((_f = (_e = err.response) === null || _e === void 0 ? void 0 : _e.data) === null || _f === void 0 ? void 0 : _f.message) || ((_h = (_g = err.response) === null || _g === void 0 ? void 0 : _g.data) === null || _h === void 0 ? void 0 : _h.error) || err.message;
            return {
                ok: false,
                message: `Connection failed: ${errMsg}`,
                latencyMs: latency,
            };
        }
    }
};
exports.VoiceConfigService = VoiceConfigService;
exports.VoiceConfigService = VoiceConfigService = VoiceConfigService_1 = __decorate([
    (0, common_1.Injectable)()
], VoiceConfigService);
//# sourceMappingURL=VoiceConfig.service.js.map