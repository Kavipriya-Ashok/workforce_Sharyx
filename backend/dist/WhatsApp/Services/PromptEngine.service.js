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
var PromptEngineService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PromptEngineService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = __importDefault(require("axios"));
const company_1 = require("../../Database/Table/Admin/company");
const WhatsAppMessage_entity_1 = require("../../Database/Table/WhatsApp/WhatsAppMessage.entity");
const WhatsAppConversation_entity_1 = require("../../Database/Table/WhatsApp/WhatsAppConversation.entity");
const CalendarHelper_1 = require("../Helpers/CalendarHelper");
let PromptEngineService = PromptEngineService_1 = class PromptEngineService {
    constructor() {
        this.logger = new common_1.Logger(PromptEngineService_1.name);
        this.defaultTools = [
            {
                name: "book_appointment",
                description: "Book a Google Meet or office consultation / interview slot",
                parameters: {
                    slot: "ISO date string or human format (e.g. 2026-10-18 10:30 AM)",
                    mode: "ONLINE or OFFICE",
                },
            },
            {
                name: "send_brochure",
                description: "Dispatches the official product catalog or brochure PDF to customer",
                parameters: {
                    category: "General or Enterprise solutions",
                },
            },
            {
                name: "transfer_to_human",
                description: "Escalates chat to a human agent when customer requests live agent",
                parameters: {
                    reason: "Customer request or complex inquiry",
                },
            },
        ];
    }
    buildSystemPrompt(ctx, customPersona) {
        let prompt = "";
        prompt +=
            customPersona ||
                `You are "Sharyx AI", an expert workforce co-pilot. Keep replies concise, helpful, and natural (1-3 sentences maximum for WhatsApp). Follow the user's language (Tamil, English, or Tanglish).`;
        if (ctx.tenantBusinessContext) {
            const b = ctx.tenantBusinessContext;
            prompt += `\n\n[APPLICATION OWNER & BUSINESS IDENTITY]:\n`;
            prompt += `You represent "${b.companyName || "Sharyx Enterprise"}".\n`;
            if (b.servicesList)
                prompt += `- Core Services: ${b.servicesList}\n`;
            if (b.address)
                prompt += `- Operating Address: ${b.address}\n`;
            if (b.businessEmail)
                prompt += `- Business Email: ${b.businessEmail}\n`;
        }
        prompt += `\n\n[CRM CONTACT & LEAD CONTEXT]:\n`;
        if (ctx.leadInfo) {
            prompt += `- Lead Name: ${ctx.leadInfo.name || ctx.senderName}\n`;
            prompt += `- Phone: ${ctx.senderPhone}\n`;
            if (ctx.leadInfo.lead_status)
                prompt += `- Pipeline Stage: ${ctx.leadInfo.lead_status}\n`;
            if (ctx.leadInfo.deal_value)
                prompt += `- Deal Value: ₹${ctx.leadInfo.deal_value}\n`;
            if (ctx.leadInfo.interested_service)
                prompt += `- Interested Service: ${ctx.leadInfo.interested_service}\n`;
        }
        else {
            prompt += `- Contact Status: New Contact (${ctx.senderPhone})\n`;
        }
        if (ctx.omnichannelLogs) {
            const o = ctx.omnichannelLogs;
            if (o.lastCallSummary || o.lastWhatsAppMsg || o.lastEmailLog) {
                prompt += `\n\n[LAST INTERACTION ACROSS CHANNELS]:\n`;
                if (o.lastCallSummary) {
                    prompt += `- Last Phone Call Summary: ${o.lastCallSummary} (Outcome: ${o.lastCallOutcome || "COMPLETED"})\n`;
                }
                if (o.lastWhatsAppMsg) {
                    prompt += `- Last WhatsApp Chat: ${o.lastWhatsAppMsg}\n`;
                }
                if (o.lastEmailLog) {
                    prompt += `- Last Email Touchpoint: ${o.lastEmailLog}\n`;
                }
            }
        }
        if (ctx.activeAppointment) {
            const a = ctx.activeAppointment;
            prompt += `\n\n[CONFIRMED APPOINTMENT & GOOGLE MEET LINK]:\n`;
            prompt += `- Active Meeting Status: ${a.status || "CONFIRMED & SCHEDULED"}\n`;
            prompt += `- Confirmed Date & Time: ${a.dateTime}\n`;
            prompt += `- Google Meet Video URL: ${a.meetingUrl}\n`;
            prompt += `*CRITICAL*: If customer asks for the Google Meet link, meeting link, or time, you MUST share this link (${a.meetingUrl}) directly in your message! Do NOT tell them to check email.\n`;
        }
        if (ctx.kbContext) {
            prompt += `\n\n[VERIFIED KNOWLEDGE BASE CONTEXT]:\n${ctx.kbContext}\n\n**CRITICAL GROUNDING**: Answer accurately using ONLY the verified facts above. Never hallucinate.`;
        }
        const tools = ctx.tools && ctx.tools.length > 0 ? ctx.tools : this.defaultTools;
        prompt += `\n\n[AVAILABLE SAAS TOOLS]:\n${JSON.stringify(tools, null, 2)}\n\n`;
        prompt += `**TOOL CALLING RULE**: If customer explicitly wants to book a slot, get brochure, or talk to human agent, reply ONLY in JSON format: {"action": "execute_tool", "toolName": "<name>", "inputs": {...}}. If no tool is needed, respond with standard friendly text.`;
        if (ctx.mediaContext) {
            prompt += `\n\n[MEDIA CONTEXT]:\n${ctx.mediaContext}\n`;
        }
        return prompt;
    }
    async buildAutoContext(tenantId, senderPhone, senderName, messageText, conversationId) {
        var _a;
        let companyContext = null;
        try {
            const comp = await company_1.company.findOne({ where: {} });
            if (comp) {
                companyContext = {
                    companyName: comp.name || "Sharyx",
                    servicesList: "AI Autonomous Workforce, WhatsApp Cloud Automation, Email AI Copilot, CRM Integration",
                    address: comp.address || "Singapore / India",
                    businessEmail: comp.email || "support@sharyx.ai",
                };
            }
        }
        catch (_b) {
        }
        const history = [];
        if (conversationId) {
            try {
                const msgs = await WhatsAppMessage_entity_1.WhatsAppMessage.find({
                    where: { conversation_id: conversationId },
                    order: { created_on: "DESC" },
                    take: 8,
                });
                msgs.reverse().forEach((m) => {
                    if (m.message_text) {
                        history.push({
                            role: m.direction === "inbound" ? "user" : "assistant",
                            content: m.message_text,
                        });
                    }
                });
            }
            catch (_c) {
            }
        }
        let lastWhatsAppMsg;
        let activeAppointment = undefined;
        try {
            const conv = await WhatsAppConversation_entity_1.WhatsAppConversation.findOne({
                where: { customer_phone: senderPhone },
            });
            if (conv === null || conv === void 0 ? void 0 : conv.last_message_text) {
                lastWhatsAppMsg = conv.last_message_text;
            }
            if ((_a = conv === null || conv === void 0 ? void 0 : conv.meeting_info) === null || _a === void 0 ? void 0 : _a.meet_url) {
                activeAppointment = {
                    status: "CONFIRMED",
                    dateTime: conv.meeting_info.slot || "Tomorrow 10:00 AM",
                    meetingUrl: conv.meeting_info.meet_url,
                };
            }
        }
        catch (_d) { }
        return {
            tenantId: tenantId || "default",
            senderPhone,
            senderName: senderName || senderPhone,
            messageText,
            conversationHistory: history,
            activeAppointment,
            tenantBusinessContext: companyContext || {
                companyName: "Sharyx",
                servicesList: "AI Workforce Solutions & WhatsApp Cloud Automation",
                businessEmail: "support@sharyx.ai",
            },
            leadInfo: {
                name: senderName,
                lead_status: "ACTIVE_INQUIRY",
                interested_service: "WhatsApp AI & Voice Workforce",
            },
            omnichannelLogs: {
                lastWhatsAppMsg,
                lastCallSummary: "Inquired about autonomous WhatsApp co-pilot and AI capabilities",
                lastCallOutcome: "QUALIFIED_PROSPECT",
            },
        };
    }
    async generateReply(ctx, aiConfig) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q;
        const lowerInquiry = ctx.messageText.toLowerCase();
        if ((lowerInquiry.includes("gmeet") ||
            lowerInquiry.includes("meet link") ||
            lowerInquiry.includes("meeting link") ||
            lowerInquiry.includes("link") ||
            lowerInquiry.includes("google meet")) &&
            ((_a = ctx.activeAppointment) === null || _a === void 0 ? void 0 : _a.meetingUrl)) {
            return {
                replyText: `Here are your confirmed meeting details, ${ctx.senderName}:\n\n🗓️ *Date & Time*: ${ctx.activeAppointment.dateTime}\n🎥 *Google Meet Link*: ${ctx.activeAppointment.meetingUrl}\n\nPlease click the link above at the scheduled time to join! 👍`,
            };
        }
        const customPrompt = aiConfig === null || aiConfig === void 0 ? void 0 : aiConfig.system_prompt;
        const systemPrompt = this.buildSystemPrompt(ctx, customPrompt);
        const openAiKey = (aiConfig === null || aiConfig === void 0 ? void 0 : aiConfig.api_key) || process.env.OPENAI_API_KEY;
        const geminiKey = (aiConfig === null || aiConfig === void 0 ? void 0 : aiConfig.api_key) || process.env.GEMINI_API_KEY;
        const isGemini = (aiConfig === null || aiConfig === void 0 ? void 0 : aiConfig.llm_provider) === "gemini" || ((aiConfig === null || aiConfig === void 0 ? void 0 : aiConfig.api_key) && aiConfig.api_key.startsWith("AIzaSy"));
        if (isGemini && geminiKey) {
            try {
                let model = (aiConfig === null || aiConfig === void 0 ? void 0 : aiConfig.llm_model) || "gemini-2.5-flash";
                if (model.includes("1.5")) {
                    model = "gemini-2.5-flash";
                }
                const promptContents = [
                    {
                        parts: [{ text: `${systemPrompt}\n\nRecent Conversation:\n${JSON.stringify(ctx.conversationHistory)}\n\nCustomer Inquiry: ${ctx.messageText}` }],
                    },
                ];
                let response;
                try {
                    response = await axios_1.default.post(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`, { contents: promptContents }, { timeout: 15000 });
                }
                catch (apiErr) {
                    this.logger.warn(`Model ${model} failed, trying gemini-flash-latest...`);
                    response = await axios_1.default.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${geminiKey}`, { contents: promptContents }, { timeout: 15000 });
                }
                const rawText = ((_h = (_g = (_f = (_e = (_d = (_c = (_b = response.data) === null || _b === void 0 ? void 0 : _b.candidates) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.content) === null || _e === void 0 ? void 0 : _e.parts) === null || _f === void 0 ? void 0 : _f[0]) === null || _g === void 0 ? void 0 : _g.text) === null || _h === void 0 ? void 0 : _h.trim()) || "";
                const toolCall = this.parseToolCall(rawText);
                if (toolCall) {
                    return { replyText: await this.getToolConfirmation(toolCall, ctx), toolCall };
                }
                if (rawText)
                    return { replyText: rawText };
            }
            catch (err) {
                this.logger.error("PromptEngine Gemini Error:", ((_j = err === null || err === void 0 ? void 0 : err.response) === null || _j === void 0 ? void 0 : _j.data) || err.message);
            }
        }
        if (!isGemini && openAiKey) {
            try {
                const model = (aiConfig === null || aiConfig === void 0 ? void 0 : aiConfig.llm_model) || "gpt-4o-mini";
                const messages = [
                    { role: "system", content: systemPrompt },
                    ...ctx.conversationHistory.slice(-8),
                    { role: "user", content: ctx.messageText },
                ];
                const response = await axios_1.default.post("https://api.openai.com/v1/chat/completions", {
                    model,
                    messages,
                    temperature: 0.4,
                    max_tokens: 300,
                }, {
                    headers: {
                        Authorization: `Bearer ${openAiKey}`,
                        "Content-Type": "application/json",
                    },
                    timeout: 15000,
                });
                const rawText = ((_p = (_o = (_m = (_l = (_k = response.data) === null || _k === void 0 ? void 0 : _k.choices) === null || _l === void 0 ? void 0 : _l[0]) === null || _m === void 0 ? void 0 : _m.message) === null || _o === void 0 ? void 0 : _o.content) === null || _p === void 0 ? void 0 : _p.trim()) || "";
                const toolCall = this.parseToolCall(rawText);
                if (toolCall) {
                    return { replyText: await this.getToolConfirmation(toolCall, ctx), toolCall };
                }
                if (rawText)
                    return { replyText: rawText };
            }
            catch (err) {
                this.logger.error("PromptEngine OpenAI Error:", ((_q = err === null || err === void 0 ? void 0 : err.response) === null || _q === void 0 ? void 0 : _q.data) || err.message);
            }
        }
        return {
            replyText: (aiConfig === null || aiConfig === void 0 ? void 0 : aiConfig.welcome_message) ||
                "Hello! Thank you for reaching out to Sharyx. Our team has received your message and will assist you shortly.",
        };
    }
    parseToolCall(rawText) {
        try {
            const trimmed = rawText.trim();
            if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
                const parsed = JSON.parse(trimmed);
                if (parsed.action === "execute_tool" && parsed.toolName) {
                    return parsed;
                }
            }
        }
        catch (_a) {
        }
        return null;
    }
    async getToolConfirmation(tool, ctx) {
        var _a;
        switch (tool.toolName) {
            case "book_appointment": {
                const slot = ((_a = tool.inputs) === null || _a === void 0 ? void 0 : _a.slot) || "Tomorrow at 10:00 AM";
                const meetRoom = await CalendarHelper_1.CalendarHelper.createGoogleMeetRoom(`Consultation & Demo with ${(ctx === null || ctx === void 0 ? void 0 : ctx.senderName) || "Customer"}`, slot);
                try {
                    if (ctx === null || ctx === void 0 ? void 0 : ctx.senderPhone) {
                        const conv = await WhatsAppConversation_entity_1.WhatsAppConversation.findOne({
                            where: { customer_phone: ctx.senderPhone },
                        });
                        if (conv) {
                            conv.meeting_info = {
                                slot,
                                meet_url: meetRoom.meetUrl,
                                scheduled_at: new Date().toISOString(),
                            };
                            await conv.save();
                        }
                    }
                }
                catch (err) {
                    this.logger.error("Failed to save meeting_info to conversation:", err.message);
                }
                return `🎉 Perfect! I have scheduled your consultation slot for *${slot}*.\n\n🎥 *Google Meet Link*: ${meetRoom.meetUrl}\n\nPlease join on time from a quiet place. Looking forward to speaking with you! 👍`;
            }
            case "send_brochure":
                return `📄 I've dispatched our official Sharyx 2026 Enterprise brochure and solutions overview PDF to your WhatsApp! Let me know if you have any questions.`;
            case "transfer_to_human":
                return `👨‍💼 Certainly! I am transferring this chat to one of our senior team members. Someone will be with you right away.`;
            default:
                return `Action "${tool.toolName}" has been executed successfully. How else can I assist you today?`;
        }
    }
};
exports.PromptEngineService = PromptEngineService;
exports.PromptEngineService = PromptEngineService = PromptEngineService_1 = __decorate([
    (0, common_1.Injectable)()
], PromptEngineService);
//# sourceMappingURL=PromptEngine.service.js.map