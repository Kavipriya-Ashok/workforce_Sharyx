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
var BlandProvider_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlandProvider = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = __importDefault(require("axios"));
let BlandProvider = BlandProvider_1 = class BlandProvider {
    constructor() {
        this.providerName = "bland";
        this.logger = new common_1.Logger(BlandProvider_1.name);
    }
    getApiKey(config) {
        return ((config === null || config === void 0 ? void 0 : config.api_key) || process.env.BLAND_API_KEY || "").trim();
    }
    getFromNumber(config) {
        return ((config === null || config === void 0 ? void 0 : config.caller_id) || process.env.BLAND_PHONE_NUMBER || "").trim();
    }
    getWebhookUrl() {
        const publicUrl = process.env.PUBLIC_BACKEND_URL || "https://api.sharyx.ai";
        return `${publicUrl}/api/voice/webhook/bland`;
    }
    async createAgent(dto, config) {
        var _a, _b;
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
            const res = await axios_1.default.post("https://api.bland.ai/v1/pathways", payload, {
                headers: {
                    authorization: apiKey,
                    "Content-Type": "application/json",
                },
                timeout: 15000,
            });
            const remoteAgentId = ((_a = res.data) === null || _a === void 0 ? void 0 : _a.pathway_id) || ((_b = res.data) === null || _b === void 0 ? void 0 : _b.id) || `bland_${Date.now()}`;
            this.logger.log(`🎙️ [BLAND AI] Pathway created: ${remoteAgentId} (${dto.name})`);
            return { remoteAgentId, raw: res.data };
        }
        catch (err) {
            this.logger.warn(`Bland createAgent fallback to simulated: ${err.message}`);
            const simulatedId = `bland_agent_${Date.now()}`;
            return { remoteAgentId: simulatedId, raw: { simulated: true, error: err.message } };
        }
    }
    async updateAgent(remoteAgentId, dto, config) {
        const apiKey = this.getApiKey(config);
        if (!apiKey || remoteAgentId.startsWith("bland_"))
            return { simulated: true };
        try {
            const payload = {};
            if (dto.name)
                payload.name = dto.name;
            if (dto.system_prompt)
                payload.prompt = dto.system_prompt;
            if (dto.voice_id)
                payload.voice = dto.voice_id;
            const res = await axios_1.default.post(`https://api.bland.ai/v1/pathways/${remoteAgentId}`, payload, {
                headers: { authorization: apiKey },
                timeout: 15000,
            });
            return res.data;
        }
        catch (err) {
            return { error: err.message };
        }
    }
    async deleteAgent(remoteAgentId, config) {
        const apiKey = this.getApiKey(config);
        if (!apiKey || remoteAgentId.startsWith("bland_"))
            return true;
        try {
            await axios_1.default.delete(`https://api.bland.ai/v1/pathways/${remoteAgentId}`, {
                headers: { authorization: apiKey },
                timeout: 10000,
            });
            return true;
        }
        catch (_a) {
            return false;
        }
    }
    async makeCall(remoteAgentId, dto, config) {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        const apiKey = this.getApiKey(config);
        const fromNumber = this.getFromNumber(config);
        if (!apiKey) {
            const simulatedCallId = `bland_call_${Date.now()}`;
            this.logger.log(`🎙️ [BLAND SIMULATED CALL] Calling ${dto.phone_number} with pathway ${remoteAgentId}`);
            return { callId: simulatedCallId, status: "initiated", raw: { simulated: true } };
        }
        try {
            const payload = {
                phone_number: dto.phone_number,
                task: `You are an AI representative speaking with ${dto.customer_name || "the customer"}. Be professional, friendly, and helpful.`,
                first_sentence: ((_a = dto.custom_variables) === null || _a === void 0 ? void 0 : _a.first_message) || "Hello! Thank you for speaking with us today.",
                voice: ((_b = dto.custom_variables) === null || _b === void 0 ? void 0 : _b.voice_id) || "nat",
                model: "enhanced",
                record: true,
                webhook: this.getWebhookUrl(),
            };
            if (fromNumber)
                payload.from = fromNumber;
            if (remoteAgentId && !remoteAgentId.startsWith("bland_agent_") && !remoteAgentId.startsWith("bland_pathway_")) {
                payload.pathway_id = remoteAgentId;
            }
            if (dto.custom_variables) {
                payload.request_data = dto.custom_variables;
            }
            const res = await axios_1.default.post("https://api.bland.ai/v1/calls", payload, {
                headers: {
                    authorization: apiKey,
                    "Content-Type": "application/json",
                },
                timeout: 15000,
            });
            const callId = ((_c = res.data) === null || _c === void 0 ? void 0 : _c.call_id) || ((_d = res.data) === null || _d === void 0 ? void 0 : _d.id);
            this.logger.log(`📞 [BLAND CALL DISPATCHED] Call ID: ${callId} to ${dto.phone_number}`);
            return { callId, status: "initiated", raw: res.data };
        }
        catch (err) {
            this.logger.error(`Bland makeCall failed: ${((_f = (_e = err.response) === null || _e === void 0 ? void 0 : _e.data) === null || _f === void 0 ? void 0 : _f.message) || err.message}`);
            throw new Error(`Bland outbound call failed: ${((_h = (_g = err.response) === null || _g === void 0 ? void 0 : _g.data) === null || _h === void 0 ? void 0 : _h.message) || err.message}`);
        }
    }
    normalizeWebhook(payload) {
        const callId = (payload === null || payload === void 0 ? void 0 : payload.call_id) || (payload === null || payload === void 0 ? void 0 : payload.id) || "unknown_bland_call";
        const statusRaw = ((payload === null || payload === void 0 ? void 0 : payload.status) || (payload === null || payload === void 0 ? void 0 : payload.call_status) || "").toLowerCase();
        let status = "completed";
        if (statusRaw.includes("busy") || statusRaw.includes("no-answer"))
            status = "no-answer";
        else if (statusRaw.includes("fail") || statusRaw.includes("error"))
            status = "failed";
        else if (statusRaw.includes("queue") || statusRaw.includes("in-progress"))
            status = "in-progress";
        const durationSeconds = (payload === null || payload === void 0 ? void 0 : payload.call_length) ? Math.round(Number(payload.call_length) * 60) : 0;
        const transcript = (payload === null || payload === void 0 ? void 0 : payload.concatenated_transcript) ||
            (Array.isArray(payload === null || payload === void 0 ? void 0 : payload.transcripts)
                ? payload.transcripts.map((t) => `${t.user || t.speaker || "Speaker"}: ${t.text}`).join("\n")
                : (payload === null || payload === void 0 ? void 0 : payload.transcript) || "");
        const summary = (payload === null || payload === void 0 ? void 0 : payload.summary) || (payload === null || payload === void 0 ? void 0 : payload.call_summary) || undefined;
        const recordingUrl = (payload === null || payload === void 0 ? void 0 : payload.recording_url) || undefined;
        const extractedSlots = (payload === null || payload === void 0 ? void 0 : payload.variables) || (payload === null || payload === void 0 ? void 0 : payload.analysis) || (payload === null || payload === void 0 ? void 0 : payload.request_data) || {};
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
};
exports.BlandProvider = BlandProvider;
exports.BlandProvider = BlandProvider = BlandProvider_1 = __decorate([
    (0, common_1.Injectable)()
], BlandProvider);
//# sourceMappingURL=Bland.provider.js.map