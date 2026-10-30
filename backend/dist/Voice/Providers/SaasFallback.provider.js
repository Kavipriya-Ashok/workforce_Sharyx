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
var SaasFallbackProvider_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SaasFallbackProvider = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = __importDefault(require("axios"));
let SaasFallbackProvider = SaasFallbackProvider_1 = class SaasFallbackProvider {
    constructor() {
        this.providerName = "saas_fallback";
        this.logger = new common_1.Logger(SaasFallbackProvider_1.name);
        this.tokenCache = null;
    }
    getBaseUrl(config) {
        return ((config === null || config === void 0 ? void 0 : config.base_url) || process.env.VOICE_BACKEND_URL || "https://fallback-voice.sharyx.ai").replace(/\/$/, "");
    }
    getApiKey(config) {
        return ((config === null || config === void 0 ? void 0 : config.api_key) || process.env.VOICE_FALLBACK_API_KEY || process.env.VOICE_API_KEY || "").trim();
    }
    normalizeDestinationPhone(phone) {
        let clean = (phone || "").trim().replace(/[\s\-()]/g, "");
        if (!clean)
            return clean;
        if (clean.startsWith("+"))
            return clean;
        if (clean.length === 10)
            return `+91${clean}`;
        if (clean.length === 12 && clean.startsWith("91"))
            return `+${clean}`;
        return `+${clean}`;
    }
    async resolveCallerId(baseUrl, token, tenantId, destPhone, config) {
        var _a, _b;
        const UNUSABLE_NUMBERS = ["8031339240", "60360432353", "19127334409"];
        const destIsIndian = destPhone.startsWith("+91");
        if (token) {
            try {
                const res = await axios_1.default.get(`${baseUrl}/api/phone-numbers`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        Cookie: `token=${token}`,
                        "x-tenant-id": tenantId,
                    },
                    timeout: 8000,
                });
                const list = ((_a = res.data) === null || _a === void 0 ? void 0 : _a.AddtionalData) || ((_b = res.data) === null || _b === void 0 ? void 0 : _b.data) || (Array.isArray(res.data) ? res.data : []);
                const validList = list.filter((item) => {
                    const num = String((item === null || item === void 0 ? void 0 : item.number) || (item === null || item === void 0 ? void 0 : item.phone_number) || "").replace(/\D/g, "");
                    if (!num)
                        return false;
                    if (UNUSABLE_NUMBERS.some((bad) => num.includes(bad)))
                        return false;
                    if (destIsIndian && (num.startsWith("1") && num.length === 11))
                        return false;
                    return true;
                });
                if (validList.length > 0) {
                    const envDigits = (process.env.VOICE_CALLER_ID || "").replace(/\D/g, "");
                    const matched = validList.find((item) => {
                        var _a, _b;
                        const num = String((item === null || item === void 0 ? void 0 : item.number) || (item === null || item === void 0 ? void 0 : item.phone_number) || "").replace(/\D/g, "");
                        return ((envDigits && num.includes(envDigits)) ||
                            (item === null || item === void 0 ? void 0 : item.tenant_id) === tenantId ||
                            ((_a = item === null || item === void 0 ? void 0 : item.tenant) === null || _a === void 0 ? void 0 : _a.id) === tenantId ||
                            ((_b = item === null || item === void 0 ? void 0 : item.tenant) === null || _b === void 0 ? void 0 : _b.name) === "sharyx24");
                    });
                    const chosen = matched || validList[0];
                    const rawNum = String(chosen.number || chosen.phone_number).trim();
                    const formatted = rawNum.startsWith("+") ? rawNum : `+${rawNum}`;
                    this.logger.log(`📱 [SAAS CALLER ID] Resolved caller ID from SaaS phone-numbers: ${formatted}`);
                    return formatted;
                }
            }
            catch (err) {
                this.logger.warn(`Failed to fetch phone-numbers from SaaS: ${err.message}`);
            }
        }
        const rawConfig = ((config === null || config === void 0 ? void 0 : config.caller_id) || "").trim();
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
        const rawEnv = (process.env.VOICE_CALLER_ID || "").trim();
        if (rawEnv && !rawEnv.includes("@") && /^\+?[0-9\s\-()]+$/.test(rawEnv)) {
            const clean = rawEnv.replace(/[\s\-()]/g, "");
            const formatted = clean.startsWith("+") ? clean : `+${clean}`;
            this.logger.log(`📱 [SAAS CALLER ID] Using process.env.VOICE_CALLER_ID: ${formatted}`);
            return formatted;
        }
        throw new Error("No valid caller ID found. Please assign an active phone number to your tenant on Sharyx or set VOICE_CALLER_ID.");
    }
    async getAuthToken(config) {
        var _a, _b, _c, _d, _e, _f, _g;
        const rawKey = this.getApiKey(config);
        if (rawKey && (rawKey.startsWith("eyJ") || rawKey.startsWith("sk_"))) {
            return rawKey;
        }
        if (this.tokenCache && this.tokenCache.expiresAt > Date.now()) {
            return this.tokenCache.token;
        }
        const baseUrl = this.getBaseUrl(config);
        let email = process.env.SHARYX_EMAIL || process.env.VOICE_ADMIN_EMAIL || "parthibanbaskaran777@gmail.com";
        let password = process.env.SHARYX_PASSWORD || process.env.VOICE_ADMIN_PASSWORD || "Login123!!";
        if (rawKey && rawKey.includes(":")) {
            const parts = rawKey.split(":");
            email = parts[0].trim();
            password = parts.slice(1).join(":").trim();
        }
        try {
            const res = await axios_1.default.post(`${baseUrl}/api/auth/login`, { email, password }, { timeout: 8000 });
            let token = ((_a = res.data) === null || _a === void 0 ? void 0 : _a.token) || ((_b = res.data) === null || _b === void 0 ? void 0 : _b.access_token) || ((_d = (_c = res.data) === null || _c === void 0 ? void 0 : _c.data) === null || _d === void 0 ? void 0 : _d.token);
            if (!token && ((_e = res.headers) === null || _e === void 0 ? void 0 : _e["set-cookie"])) {
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
        }
        catch (err) {
            this.logger.warn(`SaaS Fallback login error: ${((_g = (_f = err.response) === null || _f === void 0 ? void 0 : _f.data) === null || _g === void 0 ? void 0 : _g.message) || err.message}`);
        }
        return rawKey || null;
    }
    async listRemoteAgents(config) {
        var _a, _b, _c;
        const token = await this.getAuthToken(config);
        const baseUrl = this.getBaseUrl(config);
        const rawKey = this.getApiKey(config);
        if (!token) {
            this.logger.warn("SaaS Fallback token unavailable; cannot list remote agents");
            return [];
        }
        try {
            const res = await axios_1.default.get(`${baseUrl}/api/agent/list`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Cookie: `token=${token}`,
                    "x-api-key": rawKey || token,
                    "X-API-Key": rawKey || token,
                },
                timeout: 12000,
            });
            const rawList = ((_a = res.data) === null || _a === void 0 ? void 0 : _a.AddtionalData) || ((_b = res.data) === null || _b === void 0 ? void 0 : _b.data) || ((_c = res.data) === null || _c === void 0 ? void 0 : _c.agents) || (Array.isArray(res.data) ? res.data : []);
            const list = rawList.filter((a) => !a.is_draft);
            this.logger.log(`📥 [SAAS FALLBACK] Successfully synced ${list.length} active agents from ${baseUrl}`);
            return list;
        }
        catch (err) {
            this.logger.warn(`SaaS Fallback listRemoteAgents error on ${baseUrl}: ${err.message}`);
            return [];
        }
    }
    decodeJwt(token) {
        try {
            const parts = token.split(".");
            if (parts.length === 3) {
                const payload = Buffer.from(parts[1], "base64").toString("utf8");
                return JSON.parse(payload);
            }
        }
        catch (_a) { }
        return {};
    }
    async createAgent(dto, config) {
        var _a, _b, _c, _d, _e, _f, _g, _h;
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
            const res = await axios_1.default.post(`${baseUrl}/api/agent/insert`, payload, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Cookie: `token=${token}`,
                    "x-api-key": token,
                    "X-API-Key": token,
                    "Content-Type": "application/json",
                },
                timeout: 12000,
            });
            const remoteAgentId = String(((_a = res.data) === null || _a === void 0 ? void 0 : _a.id) || ((_c = (_b = res.data) === null || _b === void 0 ? void 0 : _b.data) === null || _c === void 0 ? void 0 : _c.id) || ((_e = (_d = res.data) === null || _d === void 0 ? void 0 : _d.agent) === null || _e === void 0 ? void 0 : _e.id) || ((_f = res.data) === null || _f === void 0 ? void 0 : _f.agentId) || `saas_${Date.now()}`);
            this.logger.log(`🎙️ [SAAS FALLBACK] Agent successfully created on platform: ${remoteAgentId} (${dto.name})`);
            return { remoteAgentId, raw: res.data };
        }
        catch (err) {
            const msg = ((_h = (_g = err.response) === null || _g === void 0 ? void 0 : _g.data) === null || _h === void 0 ? void 0 : _h.message) || err.message;
            this.logger.error(`SaaS agent create failed on ${baseUrl}: ${msg}`);
            throw new Error(`Sharyx Voice platform agent creation failed: ${msg}`);
        }
    }
    async updateAgent(remoteAgentId, dto, config) {
        const token = await this.getAuthToken(config);
        if (!token || remoteAgentId.startsWith("saas_agent_")) {
            return { simulated: true, updated: true };
        }
        try {
            const baseUrl = this.getBaseUrl(config);
            const res = await axios_1.default.put(`${baseUrl}/api/agent/update/${remoteAgentId}`, {
                name: dto.name,
                first_message: dto.first_message,
                first_message_mode: "assistant_first",
                system_prompt: dto.system_prompt,
                prompt: dto.system_prompt,
                is_draft: false,
            }, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Cookie: `token=${token}`,
                    "x-api-key": token,
                    "X-API-Key": token,
                    "Content-Type": "application/json",
                },
                timeout: 10000,
            });
            return res.data;
        }
        catch (err) {
            this.logger.warn(`SaaS update agent failed: ${err.message}`);
            return { error: err.message };
        }
    }
    async deleteAgent(remoteAgentId, config) {
        const token = await this.getAuthToken(config);
        if (!token || remoteAgentId.startsWith("saas_agent_"))
            return true;
        try {
            const baseUrl = this.getBaseUrl(config);
            await axios_1.default.delete(`${baseUrl}/api/agent/${remoteAgentId}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Cookie: `token=${token}`,
                },
                timeout: 8000,
            });
            return true;
        }
        catch (_a) {
            return false;
        }
    }
    async makeCall(remoteAgentId, dto, config) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v;
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
        if (token) {
            try {
                const remoteAgents = await this.listRemoteAgents(config);
                const exists = remoteAgents.some((a) => (a.id || a.agent_id) === activeAgentId);
                if (!exists && remoteAgents.length > 0) {
                    const preferredName = (((_a = dto.custom_variables) === null || _a === void 0 ? void 0 : _a.agent_name) || "").toLowerCase();
                    const match = remoteAgents.find((a) => preferredName && (a.name || "").toLowerCase().includes(preferredName));
                    activeAgentId = match ? (match.id || match.agent_id) : (remoteAgents[0].id || remoteAgents[0].agent_id);
                    this.logger.log(`🔄 [SAAS FALLBACK AGENT RESOLVED] Mapped agent ${remoteAgentId} -> SaaS Agent: ${activeAgentId}`);
                }
            }
            catch (agentResolveErr) {
                this.logger.warn(`Could not resolve SaaS remote agent: ${agentResolveErr.message}`);
            }
        }
        const systemPrompt = (_b = dto.custom_variables) === null || _b === void 0 ? void 0 : _b.system_prompt;
        const firstMessage = (_c = dto.custom_variables) === null || _c === void 0 ? void 0 : _c.first_message;
        const agentName = ((_d = dto.custom_variables) === null || _d === void 0 ? void 0 : _d.agent_name) || "AI Assistant";
        if (systemPrompt || firstMessage) {
            try {
                this.logger.log(`🔄 [SAAS PERSONALIZATION] Updating agent ${activeAgentId} with prompt & first_message before call...`);
                await axios_1.default.put(`${baseUrl}/api/agent/update/${activeAgentId}`, {
                    name: agentName,
                    first_message: firstMessage,
                    first_message_mode: "assistant_first",
                    system_prompt: systemPrompt,
                    is_draft: false,
                }, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        Cookie: `token=${token}`,
                        "x-api-key": token,
                        "X-API-Key": token,
                        "Content-Type": "application/json",
                    },
                    timeout: 10000,
                });
                this.logger.log(`✅ [SAAS PERSONALIZATION] Agent ${activeAgentId} updated successfully`);
            }
            catch (updateErr) {
                this.logger.warn(`⚠️ [SAAS PERSONALIZATION WARNING] Failed to update agent ${activeAgentId}: ${((_f = (_e = updateErr.response) === null || _e === void 0 ? void 0 : _e.data) === null || _f === void 0 ? void 0 : _f.message) || updateErr.message}. Continuing with call dispatch.`);
            }
        }
        const jwtData = token ? this.decodeJwt(token) : {};
        const saasTenantId = jwtData.active_tenant_id || jwtData.tenant_id;
        const saasOrgId = jwtData.active_organization_id || jwtData.organization_id;
        const saasWorkspaceId = jwtData.active_workspace_id || jwtData.workspace_id;
        const flatMetadata = Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({ lead_id: dto.lead_id || "", tenant_id: saasTenantId || tenantId }, (saasOrgId ? { organization_id: saasOrgId } : {})), (saasWorkspaceId ? { workspace_id: saasWorkspaceId } : {})), { phone: cleanDest, first_message: firstMessage || "", objective: ((_g = dto.custom_variables) === null || _g === void 0 ? void 0 : _g.reason) || ((_h = dto.custom_variables) === null || _h === void 0 ? void 0 : _h.objective) || "" }), (((_j = config === null || config === void 0 ? void 0 : config.metadata) === null || _j === void 0 ? void 0 : _j.webhook_forward_url) ? { webhook_url: config.metadata.webhook_forward_url, callback_url: config.metadata.webhook_forward_url } : {})), (dto.custom_variables || {}));
        const payload = {
            agent_id: activeAgentId,
            name: dto.customer_name || "Customer",
            phone_number: cleanDest,
            from_number: callerId,
            metadata: flatMetadata,
        };
        const headers = Object.assign(Object.assign(Object.assign(Object.assign({ Authorization: `Bearer ${token}`, Cookie: `token=${token}`, "x-api-key": token, "X-API-Key": token }, (saasTenantId ? { "x-tenant-id": saasTenantId } : {})), (saasOrgId ? { "x-organization-id": saasOrgId } : {})), (saasWorkspaceId ? { "x-workspace-id": saasWorkspaceId } : {})), { "Content-Type": "application/json" });
        const maxRetries = 4;
        let lastErr = null;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                this.logger.log(`📞 [SAAS MAKECALL] Attempt ${attempt}/${maxRetries} -> To: ${cleanDest}, From: ${callerId}, Agent: ${remoteAgentId}`);
                const res = await axios_1.default.post(`${baseUrl}/api/agent/makecall`, payload, {
                    headers,
                    timeout: 15000,
                });
                this.logger.log(`📦 [SAAS MAKECALL RAW RESPONSE]: ${JSON.stringify(res.data, null, 2)}`);
                const callId = String(((_k = res.data) === null || _k === void 0 ? void 0 : _k.call_id) || ((_l = res.data) === null || _l === void 0 ? void 0 : _l.id) || ((_m = res.data) === null || _m === void 0 ? void 0 : _m.callId) || `saas_call_${Date.now()}`);
                this.logger.log(`📞 [SAAS MAKECALL DISPATCHED] Call ID: ${callId} to ${cleanDest} (From: ${callerId}) on attempt ${attempt}`);
                return { callId, status: "initiated", raw: res.data };
            }
            catch (err) {
                lastErr = err;
                const msg = ((_p = (_o = err.response) === null || _o === void 0 ? void 0 : _o.data) === null || _p === void 0 ? void 0 : _p.Message) ||
                    ((_r = (_q = err.response) === null || _q === void 0 ? void 0 : _q.data) === null || _r === void 0 ? void 0 : _r.message) ||
                    (typeof ((_s = err.response) === null || _s === void 0 ? void 0 : _s.data) === "string" ? (_t = err.response) === null || _t === void 0 ? void 0 : _t.data : JSON.stringify((_u = err.response) === null || _u === void 0 ? void 0 : _u.data)) ||
                    err.message ||
                    "";
                if (msg.toLowerCase().includes("too many connections") && attempt < maxRetries) {
                    const delayMs = attempt * 1500;
                    this.logger.warn(`SaaS connection busy (Too many connections), retrying in ${delayMs / 1000}s (attempt ${attempt}/${maxRetries})...`);
                    await new Promise((resolve) => setTimeout(resolve, delayMs));
                    continue;
                }
                break;
            }
        }
        const errBody = ((_v = lastErr === null || lastErr === void 0 ? void 0 : lastErr.response) === null || _v === void 0 ? void 0 : _v.data)
            ? (typeof lastErr.response.data === "object" ? JSON.stringify(lastErr.response.data) : lastErr.response.data)
            : (lastErr === null || lastErr === void 0 ? void 0 : lastErr.message) || "Unknown error";
        this.logger.error(`SaaS Fallback makeCall failed: ${errBody}`);
        throw new Error(`Sharyx Voice outbound call failed: ${errBody}`);
    }
    normalizeWebhook(payload) {
        const providerCallId = String(payload.call_id || payload.id || `saas_${Date.now()}`);
        const transcript = payload.transcript || payload.conversation_text || "";
        let recordingUrl = payload.recording_url || payload.audio_url || "";
        const summary = payload.summary || payload.call_summary || "";
        if (payload.s3_key || (recordingUrl && !recordingUrl.startsWith("http"))) {
            const key = encodeURIComponent(payload.s3_key || recordingUrl);
            recordingUrl = `https://fallback-voice.sharyx.ai/api/PublicAgent/recording/s3?key=${key}`;
        }
        let status = "completed";
        if (payload.status === "failed")
            status = "failed";
        else if (payload.status === "no-answer")
            status = "no-answer";
        else if (payload.status === "busy")
            status = "busy";
        return {
            providerCallId,
            status: status,
            durationSeconds: payload.duration_seconds || payload.duration || 0,
            transcript,
            recordingUrl,
            summary,
            outcome: payload.outcome || (summary ? "completed" : undefined),
            extractedSlots: payload.extracted_slots || {},
            raw: payload,
        };
    }
};
exports.SaasFallbackProvider = SaasFallbackProvider;
exports.SaasFallbackProvider = SaasFallbackProvider = SaasFallbackProvider_1 = __decorate([
    (0, common_1.Injectable)()
], SaasFallbackProvider);
//# sourceMappingURL=SaasFallback.provider.js.map