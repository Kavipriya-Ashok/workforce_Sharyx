"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var EmailAIService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailAIService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = __importDefault(require("axios"));
const EmailAIConfig_entity_1 = require("../../Database/Table/Email/EmailAIConfig.entity");
const lead_1 = require("../../Database/Table/Lead/lead");
let EmailAIService = EmailAIService_1 = class EmailAIService {
    constructor() {
        this.logger = new common_1.Logger(EmailAIService_1.name);
    }
    async getConfig(tenantId = "default") {
        let config = await EmailAIConfig_entity_1.EmailAIConfig.findOne({ where: { tenant_id: tenantId, status: true } });
        if (!config && tenantId !== "default") {
            config = await EmailAIConfig_entity_1.EmailAIConfig.findOne({ where: { tenant_id: "default", status: true } });
        }
        if (!config) {
            config = new EmailAIConfig_entity_1.EmailAIConfig();
            config.tenant_id = tenantId;
            config.auto_reply_enabled = true;
            config.tone = "professional";
            config.llm_provider = process.env.GEMINI_API_KEY ? "gemini" : "openai";
            config.llm_model = "gemini-1.5-flash";
            config.system_prompt = "You are a professional AI sales and support copilot. Draft courteous, concise, and helpful replies to client inquiries.";
            config.created_by_id = "system";
            config.created_on = new Date();
            try {
                await config.save();
            }
            catch (err) {
                this.logger.debug(`Could not save default AI config: ${err.message}`);
            }
        }
        return config;
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
        config.llm_provider = data.llm_provider || "gemini";
        config.llm_model = data.llm_model || "gemini-2.5-flash";
        if (data.api_key !== undefined) {
            config.api_key = data.api_key;
        }
        config.updated_by_id = userId || "system";
        config.updated_on = new Date();
        return await config.save();
    }
    async generateDraft(dto, tenantId = "default") {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w;
        const config = await this.getConfig(tenantId);
        const recipientName = dto.lead_name || "Valued Client";
        const openAiKey = (config === null || config === void 0 ? void 0 : config.api_key) && (config === null || config === void 0 ? void 0 : config.llm_provider) === "openai" ? config.api_key : process.env.OPENAI_API_KEY;
        const geminiKey = (config === null || config === void 0 ? void 0 : config.api_key) && (config === null || config === void 0 ? void 0 : config.llm_provider) === "gemini" ? config.api_key : (process.env.GEMINI_API_KEY || process.env.GEMINI_KEY);
        let gmeetUrl = "https://meet.google.com/shx-demo-room";
        try {
            const { CalendarHelper } = await Promise.resolve().then(() => __importStar(require("../../WhatsApp/Helpers/CalendarHelper")));
            const meetRes = await CalendarHelper.createGoogleMeetRoom(`Sharyx Session - ${recipientName}`);
            if (meetRes === null || meetRes === void 0 ? void 0 : meetRes.meetUrl) {
                gmeetUrl = meetRes.meetUrl;
            }
        }
        catch (_x) { }
        const combinedText = `${dto.subject || ""} ${dto.incoming_body || ""}`.toLowerCase();
        const isRecruitment = /(?:job|vacancy|career|resume|cv|hiring|apply|applicant|candidate|interview|opening|employment|ctc|notice period|reliev)/i.test(combinedText);
        const isDemoAccepted = /(?:(?:yes|yeah|sure|okay|ok|let's|book|schedule|share|send|provide).*(?:demo|meet|link|call|walkthrough|session|slot)|^(?:yes|yeah|sure|okay|ok|fine|yep|definitely|let's do it|let's book|agreed)[!.,\s]*$)/i.test(((_a = dto.incoming_body) === null || _a === void 0 ? void 0 : _a.trim()) || "");
        let threadSection = "";
        if (dto.conversation_history && dto.conversation_history.length > 0) {
            threadSection = `\n\nRecent Conversation Thread History:\n` +
                dto.conversation_history
                    .map((m) => `[${m.direction.toUpperCase()}]: ${m.body.slice(0, 300)}`)
                    .join("\n");
        }
        const phoneInfo = dto.phone_number
            ? `Customer Phone on File: YES (${dto.phone_number})`
            : dto.has_phone
                ? `Customer Phone on File: YES (Provided)`
                : `Customer Phone on File: NO (Not provided yet)`;
        const customInstruction = ((_b = config === null || config === void 0 ? void 0 : config.system_prompt) === null || _b === void 0 ? void 0 : _b.trim())
            ? `\n\nADMIN CONFIGURED INSTRUCTIONS & KNOWLEDGE BASE:\n${config.system_prompt.trim()}\n`
            : "";
        const systemPrompt = `You are "Sharyx AI", the official executive assistant and qualification copilot for Sharyx.
Tone: ${(config === null || config === void 0 ? void 0 : config.tone) || "professional, warm, direct, and helpful"}.${customInstruction}

CRITICAL CONVERSATIONAL RULES (Follow strictly based on track):

TRACK A: RECRUITMENT & JOB CANDIDATE (REC-001 to REC-040 Use Cases):
- If the sender is inquiring about jobs, vacancies, or submitted a resume:
  * Acknowledge their application warmly in the email thread.
  * NEVER ask again for details already provided in the incoming email or thread history (REC-022, REC-023).
  * Collect ONLY the missing screening details from the 14 required fields:
    1) Full name & Mobile number (with country code, required for scheduling/follow-up)
    2) Resume/CV in PDF format (or accessible PDF link; if corrupted/non-PDF, politely request PDF; if candidate cannot share resume right now, collect contact & essential profile details)
    3) Job title / role applied for (*Frontend Developer*, *AI Solutions Engineer*, *Business Development Executive*)
    4) Total and relevant experience (clarify if ambiguous)
    5) Current/last company
    6) Employment status (working, serving notice, or relieved — DO NOT assume they have left their job! Ask employment status first, then conditionally ask notice period/expected relieving date if employed, or last working date if relieved)
    7) Current/last and expected salary (record separately; clarify monthly/annual & CTC basis; if candidate declines current salary disclosure, accept politely and continue)
    8) Relocation availability (Yes/No/Conditional; if cannot relocate, note constraint for HR assessment)
    9) Preferred interview date & time (Mon-Sat, 10:00 AM - 6:00 PM IST)
  * If the candidate is ready for an interview or selected an available slot, confirm the interview and include: Role, Date, Time, Timezone (IST / GMT+5:30), and this confirmed Google Meet link: ${gmeetUrl}.
  * Handle rescheduling, cancellation, or data correction/deletion requests politely.

TRACK B: SERVICES INQUIRY & SALES DEMO QUALIFICATION (SAL Use Cases):
- DO NOT mention WhatsApp! Keep the communication professional and direct.
- STEP 1 (If Customer Phone is NO):
  * Answer their question or acknowledge their message warmly.
  * Ask: "Could you please share your phone number so our team can coordinate directly with you?"
- STEP 2 (If Customer Phone is YES, but Demo is NOT yet booked):
  * Acknowledge their contact number.
  * Strictly ask: "Do you have any doubts regarding our services, or shall we book a quick live demo to walk you through everything?"
- STEP 3 (If Customer accepted demo / said "Yes / Okay / Sure / Book demo / Share link"):
  * Confirm the demo session enthusiastically.
  * Share the confirmed Google Meet link: ${gmeetUrl}
  * Invite them to join or confirm their preferred time slot.

GENERAL MEMORY & FORMATTING:
- Read the thread history below. Directly continue the conversation from the customer's last message.
- Do NOT repeat greetings or restart from scratch if an ongoing thread exists.
- Keep the response short (2 to 3 paragraphs max) and human-like. Include proper greeting and sign-off.`;
        const userPromptContent = `RECIPIENT CONTEXT:
- Recipient Name: ${recipientName}
- Company: ${dto.company_name || "Not specified"}
- ${phoneInfo}
- Track Detected: ${isRecruitment ? "RECRUITMENT_CANDIDATE" : "SALES_SERVICES"}
- Demo Requested/Accepted: ${isDemoAccepted ? "YES" : "NO"}
- Google Meet Link Available: ${gmeetUrl}
- Subject: ${dto.subject || "No subject"}
- Incoming Message: ${dto.incoming_body || ""}${threadSection}`;
        if (openAiKey) {
            try {
                const response = await axios_1.default.post("https://api.openai.com/v1/chat/completions", {
                    model: (config === null || config === void 0 ? void 0 : config.llm_model) || "gpt-4o-mini",
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: userPromptContent },
                    ],
                    temperature: 0.7,
                    max_tokens: 500,
                }, {
                    headers: {
                        Authorization: `Bearer ${openAiKey}`,
                        "Content-Type": "application/json",
                    },
                });
                const draftedText = (_g = (_f = (_e = (_d = (_c = response.data) === null || _c === void 0 ? void 0 : _c.choices) === null || _d === void 0 ? void 0 : _d[0]) === null || _e === void 0 ? void 0 : _e.message) === null || _f === void 0 ? void 0 : _f.content) === null || _g === void 0 ? void 0 : _g.trim();
                return {
                    subject: ((_h = dto.subject) === null || _h === void 0 ? void 0 : _h.startsWith("Re:")) ? dto.subject : `Re: ${dto.subject || "Inquiry"}`,
                    draft: draftedText,
                };
            }
            catch (err) {
                this.logger.error("OpenAI email draft generation failed:", ((_j = err === null || err === void 0 ? void 0 : err.response) === null || _j === void 0 ? void 0 : _j.data) || err.message);
            }
        }
        if (geminiKey) {
            const selectedModel = (config === null || config === void 0 ? void 0 : config.llm_model) || "gemini-2.5-flash";
            const modelsToTry = [selectedModel, "gemini-2.5-flash", "gemini-flash-latest"];
            const uniqueModels = modelsToTry.filter((v, i, a) => a.indexOf(v) === i);
            for (const model of uniqueModels) {
                try {
                    const response = await axios_1.default.post(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`, {
                        systemInstruction: { parts: [{ text: systemPrompt }] },
                        contents: [{ parts: [{ text: userPromptContent }] }],
                    }, { timeout: 15000 });
                    const draftedText = (_r = (_q = (_p = (_o = (_m = (_l = (_k = response.data) === null || _k === void 0 ? void 0 : _k.candidates) === null || _l === void 0 ? void 0 : _l[0]) === null || _m === void 0 ? void 0 : _m.content) === null || _o === void 0 ? void 0 : _o.parts) === null || _p === void 0 ? void 0 : _p[0]) === null || _q === void 0 ? void 0 : _q.text) === null || _r === void 0 ? void 0 : _r.trim();
                    if (draftedText) {
                        return {
                            subject: ((_s = dto.subject) === null || _s === void 0 ? void 0 : _s.startsWith("Re:")) ? dto.subject : `Re: ${dto.subject || "Inquiry"}`,
                            draft: draftedText,
                        };
                    }
                }
                catch (err) {
                    const errMsg = ((_v = (_u = (_t = err === null || err === void 0 ? void 0 : err.response) === null || _t === void 0 ? void 0 : _t.data) === null || _u === void 0 ? void 0 : _u.error) === null || _v === void 0 ? void 0 : _v.message) || err.message;
                    this.logger.warn(`Gemini (${model}) draft failed: ${errMsg}`);
                    if ((errMsg === null || errMsg === void 0 ? void 0 : errMsg.includes("API_KEY_INVALID")) || (errMsg === null || errMsg === void 0 ? void 0 : errMsg.includes("API key not valid"))) {
                        this.logger.error("The provided GEMINI_API_KEY is invalid. Gemini keys from Google AI Studio must start with 'AIzaSy'.");
                        break;
                    }
                }
            }
        }
        let fallbackDraft = "";
        if (isRecruitment) {
            if (isDemoAccepted || combinedText.includes("interview")) {
                fallbackDraft = `Dear ${recipientName},\n\nThank you for sharing your availability. We are pleased to invite you for an interview discussion regarding your application.\n\n🔗 Google Meet Interview Link: ${gmeetUrl}\n\nPlease join the meeting at the scheduled time or let us know if you need to adjust the timing. Looking forward to speaking with you!\n\nBest regards,\nSharyx Talent Acquisition`;
            }
            else {
                fallbackDraft = `Dear ${recipientName},\n\nThank you for your interest in joining Sharyx! We have received your application regarding "${dto.subject || "Open Roles"}".\n\nTo proceed with the screening round, could you please confirm your total experience, current employment status (serving notice/relieved), and share your updated resume/CV?\n\nBest regards,\nSharyx Talent Acquisition`;
            }
        }
        else {
            if (isDemoAccepted) {
                fallbackDraft = `Dear ${recipientName},\n\nWonderful! We would be delighted to host a live demo and walk you through our workforce automation platform.\n\n🔗 Google Meet Demo Link: ${gmeetUrl}\n\nPlease feel free to join or reply with your preferred time slot tomorrow so we can ensure our solutions team is ready for you.\n\nBest regards,\nSharyx AI Team`;
            }
            else if (dto.phone_number || dto.has_phone) {
                const ph = dto.phone_number ? ` (${dto.phone_number})` : "";
                fallbackDraft = `Dear ${recipientName},\n\nThank you for reaching out! We have noted your contact number${ph}.\n\nDo you have any doubts regarding our services, or shall we book a quick live demo to walk you through everything?\n\nBest regards,\nSharyx AI Team`;
            }
            else {
                fallbackDraft = `Dear ${recipientName},\n\nThank you for reaching out regarding "${dto.subject || "our services"}".\n\nWe have received your inquiry and our team is eager to assist you! Could you please share your phone number so our specialist can coordinate directly with you?\n\nBest regards,\nSharyx AI Team`;
            }
        }
        return {
            subject: ((_w = dto.subject) === null || _w === void 0 ? void 0 : _w.startsWith("Re:")) ? dto.subject : `Re: ${dto.subject || "Inquiry"}`,
            draft: fallbackDraft,
        };
    }
    async generateLeadFollowupDraft(leadId, customPrompt, intent, tenantId = "default") {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q;
        const foundLead = await lead_1.lead.findOne({ where: { id: leadId } });
        const leadName = foundLead ? foundLead.name || `${foundLead.first_name || ""} ${foundLead.last_name || ""}`.trim() : "Valued Client";
        const company = (foundLead === null || foundLead === void 0 ? void 0 : foundLead.company_name) || "your company";
        const status = (foundLead === null || foundLead === void 0 ? void 0 : foundLead.lead_status) || "Active";
        const notes = (foundLead === null || foundLead === void 0 ? void 0 : foundLead.notes) || "Expressed interest in our services";
        const promptText = `
You are an expert sales representative and business development executive.
Draft a highly personalized, compelling B2B email to:
- Recipient Name: ${leadName}
- Company: ${company}
- Current Pipeline Status: ${status}
- Background Context / Notes: ${notes}
- Email Goal / Objective: ${intent || "Follow up on previous touchpoint and schedule a quick 15-minute call"}
- User Instructions: ${customPrompt || "Keep it concise, friendly, respectful, and include a clear call-to-action."}

STRICT INSTRUCTION: Output ONLY a valid JSON object without markdown or code fences. Format:
{
  "subject": "Compelling subject line here",
  "body_html": "<p>Hi ${leadName},</p><p>Message content...</p><p>Best regards,<br/>Team</p>"
}
    `.trim();
        const openAiKey = process.env.OPENAI_API_KEY;
        const geminiKey = process.env.GEMINI_API_KEY;
        if (geminiKey) {
            const modelsToTry = ["gemini-1.5-flash", "gemini-2.5-flash", "gemini-flash-latest"];
            for (const model of modelsToTry) {
                try {
                    const response = await axios_1.default.post(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`, {
                        contents: [{ parts: [{ text: promptText }] }],
                    }, { timeout: 15000 });
                    let rawText = ((_g = (_f = (_e = (_d = (_c = (_b = (_a = response.data) === null || _a === void 0 ? void 0 : _a.candidates) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.content) === null || _d === void 0 ? void 0 : _d.parts) === null || _e === void 0 ? void 0 : _e[0]) === null || _f === void 0 ? void 0 : _f.text) === null || _g === void 0 ? void 0 : _g.trim()) || "";
                    rawText = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();
                    const parsed = JSON.parse(rawText);
                    if (parsed.subject && parsed.body_html) {
                        return {
                            subject: parsed.subject,
                            body_html: parsed.body_html,
                        };
                    }
                }
                catch (err) {
                    const errMsg = ((_k = (_j = (_h = err === null || err === void 0 ? void 0 : err.response) === null || _h === void 0 ? void 0 : _h.data) === null || _j === void 0 ? void 0 : _j.error) === null || _k === void 0 ? void 0 : _k.message) || err.message;
                    this.logger.warn(`Gemini (${model}) attempt failed: ${errMsg}`);
                    if ((errMsg === null || errMsg === void 0 ? void 0 : errMsg.includes("API_KEY_INVALID")) || (errMsg === null || errMsg === void 0 ? void 0 : errMsg.includes("API key not valid"))) {
                        this.logger.error("The provided GEMINI_API_KEY in .env is invalid. Gemini keys from Google AI Studio must start with 'AIzaSy'.");
                        break;
                    }
                }
            }
        }
        if (openAiKey) {
            try {
                const response = await axios_1.default.post("https://api.openai.com/v1/chat/completions", {
                    model: "gpt-4o-mini",
                    messages: [{ role: "user", content: promptText }],
                    temperature: 0.7,
                    max_tokens: 600,
                }, {
                    headers: {
                        Authorization: `Bearer ${openAiKey}`,
                        "Content-Type": "application/json",
                    },
                });
                let rawText = ((_q = (_p = (_o = (_m = (_l = response.data) === null || _l === void 0 ? void 0 : _l.choices) === null || _m === void 0 ? void 0 : _m[0]) === null || _o === void 0 ? void 0 : _o.message) === null || _p === void 0 ? void 0 : _p.content) === null || _q === void 0 ? void 0 : _q.trim()) || "";
                rawText = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();
                const parsed = JSON.parse(rawText);
                return {
                    subject: parsed.subject,
                    body_html: parsed.body_html,
                };
            }
            catch (err) {
                this.logger.warn(`OpenAI lead draft generation failed: ${err.message}`);
            }
        }
        return {
            subject: `Following up regarding ${company}`,
            body_html: `<p>Hi ${leadName},</p><p>I hope this email finds you well.</p><p>I'm following up on our recent conversation regarding how we can support ${company}. Based on your interests, I'd love to share a quick demonstration of how our automation solutions can streamline your operations.</p><p>Would you have 15 minutes open later this week for a brief conversation?</p><p>Best regards,<br/><strong>Business Development Team</strong><br/>Sharyx</p>`,
        };
    }
};
exports.EmailAIService = EmailAIService;
exports.EmailAIService = EmailAIService = EmailAIService_1 = __decorate([
    (0, common_1.Injectable)()
], EmailAIService);
//# sourceMappingURL=EmailAI.service.js.map