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
var RetellProvider_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RetellProvider = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = __importDefault(require("axios"));
let RetellProvider = RetellProvider_1 = class RetellProvider {
    constructor() {
        this.providerName = "retell";
        this.logger = new common_1.Logger(RetellProvider_1.name);
    }
    getApiKey(config) {
        return ((config === null || config === void 0 ? void 0 : config.api_key) || process.env.RETELL_API_KEY || "").trim();
    }
    getFromNumber(config) {
        return ((config === null || config === void 0 ? void 0 : config.caller_id) || process.env.RETELL_PHONE_NUMBER || "").trim();
    }
    getWebhookUrl() {
        const publicUrl = process.env.PUBLIC_BACKEND_URL || "https://api.sharyx.ai";
        return `${publicUrl}/api/voice/webhook/retell`;
    }
    async createAgent(dto, config) {
        var _a, _b, _c, _d, _e;
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
            const res = await axios_1.default.post("https://api.retellai.com/create-agent", payload, {
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    "Content-Type": "application/json",
                },
                timeout: 15000,
            });
            const remoteAgentId = (_a = res.data) === null || _a === void 0 ? void 0 : _a.agent_id;
            this.logger.log(`🎙️ [RETELL] Agent created: ${remoteAgentId} (${dto.name})`);
            return { remoteAgentId, raw: res.data };
        }
        catch (err) {
            this.logger.error(`Retell create agent failed: ${((_c = (_b = err.response) === null || _b === void 0 ? void 0 : _b.data) === null || _c === void 0 ? void 0 : _c.message) || err.message}`);
            throw new Error(`Retell agent creation failed: ${((_e = (_d = err.response) === null || _d === void 0 ? void 0 : _d.data) === null || _e === void 0 ? void 0 : _e.message) || err.message}`);
        }
    }
    async updateAgent(remoteAgentId, dto, config) {
        const apiKey = this.getApiKey(config);
        if (!apiKey || remoteAgentId.startsWith("retell_agent_")) {
            return { simulated: true, updated: true };
        }
        try {
            const payload = {};
            if (dto.name)
                payload.agent_name = dto.name;
            if (dto.first_message)
                payload.begin_message = dto.first_message;
            if (dto.system_prompt)
                payload.general_prompt = dto.system_prompt;
            if (dto.voice_id)
                payload.voice_id = dto.voice_id;
            const res = await axios_1.default.patch(`https://api.retellai.com/update-agent/${remoteAgentId}`, payload, {
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    "Content-Type": "application/json",
                },
                timeout: 15000,
            });
            return res.data;
        }
        catch (err) {
            this.logger.warn(`Retell update agent failed: ${err.message}`);
            return { error: err.message };
        }
    }
    async deleteAgent(remoteAgentId, config) {
        const apiKey = this.getApiKey(config);
        if (!apiKey || remoteAgentId.startsWith("retell_agent_"))
            return true;
        try {
            await axios_1.default.delete(`https://api.retellai.com/delete-agent/${remoteAgentId}`, {
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
        const fromNumber = this.getFromNumber(config);
        if (!apiKey) {
            const simulatedCallId = `retell_call_${Date.now()}`;
            this.logger.log(`🎙️ [RETELL SIMULATED CALL] Calling ${dto.phone_number} with agent ${remoteAgentId}`);
            return { callId: simulatedCallId, status: "initiated", raw: { simulated: true } };
        }
        try {
            const payload = {
                agent_id: remoteAgentId,
                to_number: dto.phone_number,
            };
            if (fromNumber)
                payload.from_number = fromNumber;
            if (dto.custom_variables)
                payload.retell_llm_dynamic_variables = dto.custom_variables;
            const res = await axios_1.default.post("https://api.retellai.com/v2/create-phone-call", payload, {
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    "Content-Type": "application/json",
                },
                timeout: 15000,
            });
            const callId = (_a = res.data) === null || _a === void 0 ? void 0 : _a.call_id;
            this.logger.log(`📞 [RETELL CALL DISPATCHED] Call ID: ${callId} to ${dto.phone_number}`);
            return { callId, status: "initiated", raw: res.data };
        }
        catch (err) {
            this.logger.error(`Retell makeCall failed: ${((_c = (_b = err.response) === null || _b === void 0 ? void 0 : _b.data) === null || _c === void 0 ? void 0 : _c.message) || err.message}`);
            throw new Error(`Retell outbound call failed: ${((_e = (_d = err.response) === null || _d === void 0 ? void 0 : _d.data) === null || _e === void 0 ? void 0 : _e.message) || err.message}`);
        }
    }
    normalizeWebhook(payload) {
        var _a, _b, _c;
        const data = (payload === null || payload === void 0 ? void 0 : payload.call) || (payload === null || payload === void 0 ? void 0 : payload.data) || payload;
        const providerCallId = data.call_id || data.id || `retell_${Date.now()}`;
        const transcript = data.transcript || "";
        const recordingUrl = data.recording_url || "";
        const summary = ((_a = data.call_analysis) === null || _a === void 0 ? void 0 : _a.call_summary) || data.summary || "";
        let status = "completed";
        if (data.call_status === "registered" || data.call_status === "ongoing")
            status = "in-progress";
        else if (data.disconnection_reason === "user_did_not_answer")
            status = "no-answer";
        else if (data.disconnection_reason === "user_busy")
            status = "busy";
        else if (data.call_status === "error")
            status = "failed";
        else
            status = "completed";
        const durationSeconds = data.duration_ms ? Math.round(data.duration_ms / 1000) : 0;
        return {
            providerCallId,
            status: status,
            durationSeconds,
            transcript,
            recordingUrl,
            summary,
            outcome: ((_b = data.call_analysis) === null || _b === void 0 ? void 0 : _b.user_sentiment) || (summary ? "completed" : undefined),
            extractedSlots: ((_c = data.call_analysis) === null || _c === void 0 ? void 0 : _c.custom_analysis_data) || {},
            raw: payload,
        };
    }
};
exports.RetellProvider = RetellProvider;
exports.RetellProvider = RetellProvider = RetellProvider_1 = __decorate([
    (0, common_1.Injectable)()
], RetellProvider);
//# sourceMappingURL=Retell.provider.js.map