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
var EmailAIService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailAIService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = __importDefault(require("axios"));
const EmailAIConfig_entity_1 = require("../../Database/Table/Email/EmailAIConfig.entity");
let EmailAIService = EmailAIService_1 = class EmailAIService {
    constructor() {
        this.logger = new common_1.Logger(EmailAIService_1.name);
    }
    async getConfig(tenantId = "default") {
        return await EmailAIConfig_entity_1.EmailAIConfig.findOne({ where: { tenant_id: tenantId, status: true } });
    }
    async saveConfig(data, userId) {
        var _a;
        let config = await EmailAIConfig_entity_1.EmailAIConfig.findOne({ where: { tenant_id: data.tenant_id || "default" } });
        if (!config) {
            config = new EmailAIConfig_entity_1.EmailAIConfig();
            config.tenant_id = data.tenant_id || "default";
            config.created_by_id = userId || "system";
            config.created_on = new Date();
        }
        config.auto_reply_enabled = (_a = data.auto_reply_enabled) !== null && _a !== void 0 ? _a : true;
        config.system_prompt = data.system_prompt || null;
        config.tone = data.tone || "professional";
        config.llm_provider = data.llm_provider || "openai";
        config.llm_model = data.llm_model || "gpt-4o-mini";
        config.updated_by_id = userId || "system";
        config.updated_on = new Date();
        return await config.save();
    }
    async generateDraft(dto, tenantId = "default") {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s;
        const config = await this.getConfig(tenantId);
        const systemPrompt = (config === null || config === void 0 ? void 0 : config.system_prompt) ||
            `You are an executive email assistant. Tone: ${(config === null || config === void 0 ? void 0 : config.tone) || "professional"}. Draft a concise, courteous reply. Include a proper greeting and sign-off.`;
        const openAiKey = process.env.OPENAI_API_KEY;
        const geminiKey = process.env.GEMINI_API_KEY;
        if (openAiKey) {
            try {
                const response = await axios_1.default.post("https://api.openai.com/v1/chat/completions", {
                    model: (config === null || config === void 0 ? void 0 : config.llm_model) || "gpt-4o-mini",
                    messages: [
                        { role: "system", content: systemPrompt },
                        {
                            role: "user",
                            content: `Subject: ${dto.subject || "No subject"}\nIncoming Message:\n${dto.incoming_body || ""}`,
                        },
                    ],
                    temperature: 0.7,
                    max_tokens: 500,
                }, {
                    headers: {
                        Authorization: `Bearer ${openAiKey}`,
                        "Content-Type": "application/json",
                    },
                });
                const draftedText = (_e = (_d = (_c = (_b = (_a = response.data) === null || _a === void 0 ? void 0 : _a.choices) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.message) === null || _d === void 0 ? void 0 : _d.content) === null || _e === void 0 ? void 0 : _e.trim();
                return {
                    subject: ((_f = dto.subject) === null || _f === void 0 ? void 0 : _f.startsWith("Re:")) ? dto.subject : `Re: ${dto.subject || "Inquiry"}`,
                    draft: draftedText,
                };
            }
            catch (err) {
                this.logger.error("OpenAI email draft generation failed:", ((_g = err === null || err === void 0 ? void 0 : err.response) === null || _g === void 0 ? void 0 : _g.data) || err.message);
            }
        }
        if (geminiKey) {
            try {
                const promptText = `${systemPrompt}\n\nSubject: ${dto.subject || "No subject"}\nIncoming Message:\n${dto.incoming_body || ""}`;
                const response = await axios_1.default.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
                    contents: [{ parts: [{ text: promptText }] }],
                });
                const draftedText = (_p = (_o = (_m = (_l = (_k = (_j = (_h = response.data) === null || _h === void 0 ? void 0 : _h.candidates) === null || _j === void 0 ? void 0 : _j[0]) === null || _k === void 0 ? void 0 : _k.content) === null || _l === void 0 ? void 0 : _l.parts) === null || _m === void 0 ? void 0 : _m[0]) === null || _o === void 0 ? void 0 : _o.text) === null || _p === void 0 ? void 0 : _p.trim();
                return {
                    subject: ((_q = dto.subject) === null || _q === void 0 ? void 0 : _q.startsWith("Re:")) ? dto.subject : `Re: ${dto.subject || "Inquiry"}`,
                    draft: draftedText,
                };
            }
            catch (err) {
                this.logger.error("Gemini email draft generation failed:", ((_r = err === null || err === void 0 ? void 0 : err.response) === null || _r === void 0 ? void 0 : _r.data) || err.message);
            }
        }
        return {
            subject: ((_s = dto.subject) === null || _s === void 0 ? void 0 : _s.startsWith("Re:")) ? dto.subject : `Re: ${dto.subject || "Inquiry"}`,
            draft: `Dear Client,\n\nThank you for reaching out to us regarding "${dto.subject || "your inquiry"}".\n\nWe have received your email and our team is currently reviewing your request. We will provide a comprehensive update shortly.\n\nBest regards,\nSupport Team`,
        };
    }
};
exports.EmailAIService = EmailAIService;
exports.EmailAIService = EmailAIService = EmailAIService_1 = __decorate([
    (0, common_1.Injectable)()
], EmailAIService);
//# sourceMappingURL=EmailAI.service.js.map