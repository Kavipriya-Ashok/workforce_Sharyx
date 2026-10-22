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
var VapiProvider_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.VapiProvider = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = __importDefault(require("axios"));
let VapiProvider = VapiProvider_1 = class VapiProvider {
    constructor() {
        this.providerName = "vapi";
        this.logger = new common_1.Logger(VapiProvider_1.name);
    }
    getApiKey(config) {
        return ((config === null || config === void 0 ? void 0 : config.api_key) || process.env.VAPI_API_KEY || "").trim();
    }
    getPhoneNumberId(config) {
        return ((config === null || config === void 0 ? void 0 : config.phone_number_id) || process.env.VAPI_PHONE_NUMBER_ID || "").trim();
    }
    getWebhookUrl() {
        const publicUrl = process.env.PUBLIC_BACKEND_URL || "https://api.sharyx.ai";
        return `${publicUrl}/api/voice/webhook/vapi`;
    }
    async createAgent(dto, config) {
        var _a, _b, _c, _d;
        const apiKey = this.getApiKey(config);
        if (!apiKey) {
            this.logger.warn("Vapi API key missing; generating simulated remote agent ID");
            const simulatedId = `vapi_asst_${Date.now()}`;
            return { remoteAgentId: simulatedId, raw: { simulated: true, id: simulatedId } };
        }
        try {
            const payload = Object.assign({ name: dto.name, model: {
                    provider: "openai",
                    model: dto.llm_model || "gpt-4o-mini",
                    temperature: (_a = dto.temperature) !== null && _a !== void 0 ? _a : 0.4,
                    messages: [{ role: "system", content: dto.system_prompt }],
                }, voice: {
                    provider: dto.voice_provider === "elevenlabs" ? "11labs" : (dto.voice_provider || "11labs"),
                    voiceId: dto.voice_id || "21m00Tcm4TlvDq8ikWAM",
                }, firstMessage: dto.first_message || "Hello, thank you for connecting with us! How can I assist you today?", serverUrl: this.getWebhookUrl() }, (dto.transfer_phone_number ? { forwardingPhoneNumber: dto.transfer_phone_number } : {}));
            const res = await axios_1.default.post("https://api.vapi.ai/assistant", payload, {
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    "Content-Type": "application/json",
                },
                timeout: 15000,
            });
            const remoteAgentId = (_b = res.data) === null || _b === void 0 ? void 0 : _b.id;
            this.logger.log(`🎙️ [VAPI] Assistant created on Vapi platform: ${remoteAgentId} (${dto.name})`);
            return { remoteAgentId, raw: res.data };
        }
        catch (err) {
            const msg = ((_d = (_c = err.response) === null || _c === void 0 ? void 0 : _c.data) === null || _d === void 0 ? void 0 : _d.message) || err.message;
            this.logger.error(`Vapi create assistant failed: ${msg}`);
            throw new Error(`Vapi agent creation failed: ${msg}`);
        }
    }
    async listRemoteAgents(config) {
        const apiKey = this.getApiKey(config);
        if (!apiKey)
            return [];
        try {
            const res = await axios_1.default.get("https://api.vapi.ai/assistant", {
                headers: { Authorization: `Bearer ${apiKey}` },
                timeout: 10000,
            });
            return Array.isArray(res.data) ? res.data : [];
        }
        catch (err) {
            this.logger.warn(`Failed to list Vapi assistants: ${err.message}`);
            return [];
        }
    }
    async updateAgent(remoteAgentId, dto, config) {
        const apiKey = this.getApiKey(config);
        if (!apiKey || remoteAgentId.startsWith("vapi_asst_")) {
            return { simulated: true, updated: true };
        }
        try {
            const payload = {};
            if (dto.name)
                payload.name = dto.name;
            if (dto.first_message)
                payload.firstMessage = dto.first_message;
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
            const res = await axios_1.default.patch(`https://api.vapi.ai/assistant/${remoteAgentId}`, payload, {
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    "Content-Type": "application/json",
                },
                timeout: 15000,
            });
            return res.data;
        }
        catch (err) {
            this.logger.warn(`Vapi update assistant failed: ${err.message}`);
            return { error: err.message };
        }
    }
    async deleteAgent(remoteAgentId, config) {
        const apiKey = this.getApiKey(config);
        if (!apiKey || remoteAgentId.startsWith("vapi_asst_"))
            return true;
        try {
            await axios_1.default.delete(`https://api.vapi.ai/assistant/${remoteAgentId}`, {
                headers: { Authorization: `Bearer ${apiKey}` },
                timeout: 10000,
            });
            return true;
        }
        catch (_a) {
            return false;
        }
    }
    async makeCall(remoteAgentId, dto, config) {
        var _a, _b, _c, _d, _e;
        const apiKey = this.getApiKey(config);
        const phoneNumberId = this.getPhoneNumberId(config);
        if (!apiKey) {
            const simulatedCallId = `vapi_call_${Date.now()}`;
            this.logger.log(`🎙️ [VAPI SIMULATED CALL] Calling ${dto.phone_number} with assistant ${remoteAgentId}`);
            return { callId: simulatedCallId, status: "initiated", raw: { simulated: true } };
        }
        try {
            const payload = {
                assistantId: remoteAgentId,
                customer: {
                    number: dto.phone_number,
                    name: dto.customer_name || "Valued Customer",
                },
            };
            let resolvedPhoneId = phoneNumberId;
            if (!resolvedPhoneId) {
                try {
                    const listRes = await axios_1.default.get("https://api.vapi.ai/phone-number", {
                        headers: { Authorization: `Bearer ${apiKey}` },
                        timeout: 6000,
                    });
                    if (Array.isArray(listRes.data) && listRes.data.length > 0) {
                        resolvedPhoneId = listRes.data[0].id;
                        this.logger.log(`📞 [VAPI AUTO-RESOLVED PHONE] Auto-detected caller ID: ${listRes.data[0].number || listRes.data[0].id}`);
                    }
                }
                catch (err) {
                    this.logger.warn(`Could not auto-fetch Vapi phone numbers: ${err.message}`);
                }
            }
            if (resolvedPhoneId) {
                payload.phoneNumberId = resolvedPhoneId;
            }
            if (dto.custom_variables) {
                payload.assistantOverrides = Object.assign({ variableValues: dto.custom_variables }, (dto.custom_variables.first_message ? { firstMessage: dto.custom_variables.first_message } : {}));
            }
            const res = await axios_1.default.post("https://api.vapi.ai/call/phone", payload, {
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    "Content-Type": "application/json",
                },
                timeout: 15000,
            });
            const callId = (_a = res.data) === null || _a === void 0 ? void 0 : _a.id;
            this.logger.log(`📞 [VAPI CALL DISPATCHED] Call ID: ${callId} to ${dto.phone_number}`);
            return { callId, status: "initiated", raw: res.data };
        }
        catch (err) {
            this.logger.error(`Vapi makeCall failed: ${((_c = (_b = err.response) === null || _b === void 0 ? void 0 : _b.data) === null || _c === void 0 ? void 0 : _c.message) || err.message}`);
            throw new Error(`Vapi outbound call failed: ${((_e = (_d = err.response) === null || _d === void 0 ? void 0 : _d.data) === null || _e === void 0 ? void 0 : _e.message) || err.message}`);
        }
    }
    normalizeWebhook(payload) {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        const message = (payload === null || payload === void 0 ? void 0 : payload.message) || payload;
        const type = (message === null || message === void 0 ? void 0 : message.type) || (payload === null || payload === void 0 ? void 0 : payload.type);
        const call = (message === null || message === void 0 ? void 0 : message.call) || (payload === null || payload === void 0 ? void 0 : payload.call) || {};
        const providerCallId = call.id || message.callId || payload.callId || `vapi_${Date.now()}`;
        const transcript = (message === null || message === void 0 ? void 0 : message.transcript) ||
            ((_a = call.artifact) === null || _a === void 0 ? void 0 : _a.transcript) ||
            (Array.isArray(call.messages)
                ? call.messages.map((m) => `${m.role}: ${m.message}`).join("\n")
                : "");
        const recordingUrl = ((_b = call.artifact) === null || _b === void 0 ? void 0 : _b.recordingUrl) ||
            ((_c = call.artifact) === null || _c === void 0 ? void 0 : _c.stereoRecordingUrl) ||
            message.recordingUrl ||
            "";
        const summary = ((_d = call.analysis) === null || _d === void 0 ? void 0 : _d.summary) ||
            ((_e = message === null || message === void 0 ? void 0 : message.analysis) === null || _e === void 0 ? void 0 : _e.summary) ||
            (message === null || message === void 0 ? void 0 : message.summary) ||
            "";
        let status = "completed";
        if (call.status === "ended") {
            const reason = call.endedReason || message.endedReason;
            if (reason === "customer-did-not-answer" || reason === "no-answer")
                status = "no-answer";
            else if (reason === "customer-busy" || reason === "busy")
                status = "busy";
            else if ((reason === null || reason === void 0 ? void 0 : reason.includes("fail")) || (reason === null || reason === void 0 ? void 0 : reason.includes("error")))
                status = "failed";
            else
                status = "completed";
        }
        const durationSeconds = call.duration ||
            (call.endedAt && call.startedAt
                ? Math.round((new Date(call.endedAt).getTime() - new Date(call.startedAt).getTime()) / 1000)
                : 0);
        return {
            providerCallId,
            status: status,
            durationSeconds,
            transcript,
            recordingUrl,
            summary,
            outcome: ((_g = (_f = call.analysis) === null || _f === void 0 ? void 0 : _f.structuredData) === null || _g === void 0 ? void 0 : _g.outcome) || (summary ? "completed" : undefined),
            extractedSlots: ((_h = call.analysis) === null || _h === void 0 ? void 0 : _h.structuredData) || {},
            raw: payload,
        };
    }
};
exports.VapiProvider = VapiProvider;
exports.VapiProvider = VapiProvider = VapiProvider_1 = __decorate([
    (0, common_1.Injectable)()
], VapiProvider);
//# sourceMappingURL=Vapi.provider.js.map