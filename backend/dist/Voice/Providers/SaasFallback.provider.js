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
        return ((config === null || config === void 0 ? void 0 : config.api_key) || process.env.VOICE_API_KEY || "").trim();
    }
    getCallerId(config) {
        const raw = ((config === null || config === void 0 ? void 0 : config.caller_id) || process.env.VOICE_CALLER_ID || "").trim();
        if (raw && !raw.includes("@") && /^\+?[0-9\s\-()]+$/.test(raw)) {
            return raw;
        }
        return null;
    }
    async getAuthToken(config) {
        var _a, _b, _c, _d, _e, _f, _g;
        const rawKey = this.getApiKey(config);
        if (rawKey && rawKey.startsWith("eyJ")) {
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
            const list = ((_a = res.data) === null || _a === void 0 ? void 0 : _a.AddtionalData) || ((_b = res.data) === null || _b === void 0 ? void 0 : _b.data) || ((_c = res.data) === null || _c === void 0 ? void 0 : _c.agents) || (Array.isArray(res.data) ? res.data : []);
            this.logger.log(`📥 [SAAS FALLBACK] Successfully synced ${list.length} agents from ${baseUrl}`);
            return list;
        }
        catch (err) {
            this.logger.warn(`SaaS Fallback listRemoteAgents error on ${baseUrl}: ${err.message}`);
            return [];
        }
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
        try {
            const payload = {
                name: dto.name,
                prompt: dto.system_prompt,
                voice: dto.voice_id || "en-IN-Wavenet-D",
                model: dto.llm_model || "gemini-2.0-flash",
                language: dto.language || "en",
                first_message: dto.first_message,
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
            const res = await axios_1.default.put(`${baseUrl}/api/agent/${remoteAgentId}`, {
                name: dto.name,
                prompt: dto.system_prompt,
                voice: dto.voice_id,
                first_message: dto.first_message,
            }, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Cookie: `token=${token}`,
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
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
        const token = await this.getAuthToken(config);
        const baseUrl = this.getBaseUrl(config);
        const callerId = this.getCallerId(config);
        if (!token) {
            const simulatedCallId = `saas_call_${Date.now()}`;
            this.logger.log(`🎙️ [SAAS FALLBACK SIMULATED] Calling ${dto.phone_number} with agent ${remoteAgentId}`);
            return { callId: simulatedCallId, status: "initiated", raw: { simulated: true } };
        }
        try {
            const payload = {
                agent_id: remoteAgentId,
                phone_number: dto.phone_number,
            };
            if (callerId) {
                payload.from_number = callerId;
            }
            const res = await axios_1.default.post(`${baseUrl}/api/agent/makecall`, payload, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Cookie: `token=${token}`,
                    "x-api-key": token,
                    "X-API-Key": token,
                    "Content-Type": "application/json",
                },
                timeout: 15000,
            });
            const callId = String(((_a = res.data) === null || _a === void 0 ? void 0 : _a.call_id) || ((_b = res.data) === null || _b === void 0 ? void 0 : _b.id) || ((_c = res.data) === null || _c === void 0 ? void 0 : _c.callId) || `saas_call_${Date.now()}`);
            this.logger.log(`📞 [SAAS FALLBACK DISPATCHED] Call ID: ${callId} to ${dto.phone_number} (From: ${callerId})`);
            return { callId, status: "initiated", raw: res.data };
        }
        catch (err) {
            const msg = ((_e = (_d = err.response) === null || _d === void 0 ? void 0 : _d.data) === null || _e === void 0 ? void 0 : _e.Message) ||
                ((_g = (_f = err.response) === null || _f === void 0 ? void 0 : _f.data) === null || _g === void 0 ? void 0 : _g.message) ||
                (typeof ((_h = err.response) === null || _h === void 0 ? void 0 : _h.data) === "string" ? (_j = err.response) === null || _j === void 0 ? void 0 : _j.data : JSON.stringify((_k = err.response) === null || _k === void 0 ? void 0 : _k.data)) ||
                err.message;
            this.logger.error(`SaaS Fallback makeCall failed: ${msg}`);
            throw new Error(`Sharyx Voice outbound call failed: ${msg}`);
        }
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