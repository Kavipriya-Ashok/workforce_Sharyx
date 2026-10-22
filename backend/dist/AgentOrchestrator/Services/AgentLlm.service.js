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
var AgentLlmService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentLlmService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = __importDefault(require("axios"));
let AgentLlmService = AgentLlmService_1 = class AgentLlmService {
    constructor() {
        this.logger = new common_1.Logger(AgentLlmService_1.name);
    }
    resolve(cfg) {
        const uiKey = (cfg.apiKey || "").trim();
        const isSk = uiKey.startsWith("sk-");
        const openAiKey = (isSk ? uiKey : process.env.OPENAI_API_KEY || "").trim();
        const geminiKey = (process.env.GEMINI_API_KEY || (!isSk && uiKey ? uiKey : "")).trim();
        let provider = cfg.provider;
        if (provider === "openai" && !openAiKey && geminiKey) {
            provider = "gemini";
        }
        if (provider === "gemini" && !geminiKey && openAiKey) {
            provider = "openai";
        }
        if (!provider) {
            provider = openAiKey ? "openai" : geminiKey ? "gemini" : undefined;
        }
        return { provider, geminiKey, openAiKey };
    }
    isAvailable(cfg = {}) {
        return Boolean(this.resolve(cfg).provider);
    }
    async completeJson(systemPrompt, history, userMessage, cfg = {}) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q;
        const { provider, geminiKey, openAiKey } = this.resolve(cfg);
        if (!provider)
            return null;
        const temperature = (_a = cfg.temperature) !== null && _a !== void 0 ? _a : 0.4;
        try {
            if (provider === "openai") {
                const model = cfg.model && !cfg.model.startsWith("gemini") ? cfg.model : "gpt-4o-mini";
                const res = await axios_1.default.post("https://api.openai.com/v1/chat/completions", {
                    model,
                    temperature,
                    max_tokens: 700,
                    response_format: { type: "json_object" },
                    messages: [
                        { role: "system", content: systemPrompt },
                        ...history.slice(-12),
                        { role: "user", content: userMessage },
                    ],
                }, {
                    headers: { Authorization: `Bearer ${openAiKey}`, "Content-Type": "application/json" },
                    timeout: 20000,
                });
                return this.parse((_e = (_d = (_c = (_b = res.data) === null || _b === void 0 ? void 0 : _b.choices) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.message) === null || _e === void 0 ? void 0 : _e.content);
            }
            let model = cfg.model && cfg.model.startsWith("gemini") ? cfg.model : "gemini-2.5-flash";
            if (model.includes("1.5"))
                model = "gemini-2.5-flash";
            const contents = [
                ...history.slice(-12).map((h) => ({
                    role: h.role === "assistant" ? "model" : "user",
                    parts: [{ text: h.content }],
                })),
                { role: "user", parts: [{ text: userMessage }] },
            ];
            const body = {
                systemInstruction: { parts: [{ text: systemPrompt }] },
                contents,
                generationConfig: { temperature, responseMimeType: "application/json", maxOutputTokens: 1024 },
            };
            for (const m of [model, "gemini-flash-latest"]) {
                try {
                    const res = await axios_1.default.post(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${geminiKey}`, body, { timeout: 20000 });
                    const parsed = this.parse((_l = (_k = (_j = (_h = (_g = (_f = res.data) === null || _f === void 0 ? void 0 : _f.candidates) === null || _g === void 0 ? void 0 : _g[0]) === null || _h === void 0 ? void 0 : _h.content) === null || _j === void 0 ? void 0 : _j.parts) === null || _k === void 0 ? void 0 : _k[0]) === null || _l === void 0 ? void 0 : _l.text);
                    if (parsed)
                        return parsed;
                }
                catch (err) {
                    this.logger.warn(`Gemini ${m} failed: ${((_p = (_o = (_m = err === null || err === void 0 ? void 0 : err.response) === null || _m === void 0 ? void 0 : _m.data) === null || _o === void 0 ? void 0 : _o.error) === null || _p === void 0 ? void 0 : _p.message) || err.message}`);
                }
            }
        }
        catch (err) {
            this.logger.error(`LLM (${provider}) error: ${JSON.stringify(((_q = err === null || err === void 0 ? void 0 : err.response) === null || _q === void 0 ? void 0 : _q.data) || err.message)}`);
        }
        return null;
    }
    parse(raw) {
        if (!raw)
            return null;
        let text = raw.trim().replace(/^```json/i, "").replace(/^```/, "").replace(/```$/, "").trim();
        const start = text.indexOf("{");
        const end = text.lastIndexOf("}");
        if (start >= 0 && end > start)
            text = text.slice(start, end + 1);
        try {
            return JSON.parse(text);
        }
        catch (_a) {
            this.logger.warn(`Could not parse LLM JSON: ${text.slice(0, 200)}`);
            return null;
        }
    }
};
exports.AgentLlmService = AgentLlmService;
exports.AgentLlmService = AgentLlmService = AgentLlmService_1 = __decorate([
    (0, common_1.Injectable)()
], AgentLlmService);
//# sourceMappingURL=AgentLlm.service.js.map