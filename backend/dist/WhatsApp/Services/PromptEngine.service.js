"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var PromptEngineService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PromptEngineService = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const axios_1 = __importDefault(require("axios"));
const company_1 = require("../../Database/Table/Admin/company");
const WhatsAppMessage_entity_1 = require("../../Database/Table/WhatsApp/WhatsAppMessage.entity");
const WhatsAppConversation_entity_1 = require("../../Database/Table/WhatsApp/WhatsAppConversation.entity");
const lead_1 = require("../../Database/Table/Lead/lead");
const CalendarHelper_1 = require("../Helpers/CalendarHelper");
const JobOpenings_service_1 = require("../../Service/Lead/JobOpenings.service");
let PromptEngineService = PromptEngineService_1 = class PromptEngineService {
    constructor(events, openingsService) {
        this.events = events;
        this.openingsService = openingsService;
        this.logger = new common_1.Logger(PromptEngineService_1.name);
        this.defaultTools = [
            {
                name: "book_appointment",
                description: "Book a Google Meet demo, consultation, or job interview slot",
                parameters: {
                    slot: "Date and time of appointment (e.g. Tomorrow at 11:00 AM or Mon-Sat 10 AM - 6 PM IST)",
                    type: "demo or interview or consultation",
                    mode: "ONLINE or OFFICE",
                },
            },
            {
                name: "capture_contact",
                description: "Save customer or candidate contact details into CRM leads database",
                parameters: {
                    name: "Full name",
                    email: "Email address",
                    phone: "Phone number",
                    company: "Company or organization name (optional)",
                    role: "Applied job role (optional)",
                    preferred_location: "Preferred location city (optional)",
                },
            },
            {
                name: "dispatch_voice_call",
                description: "Initiates an immediate outbound AI sales phone call to customer's phone",
                parameters: {
                    phone: "Customer phone number to dial",
                    reason: "Reason for the sales/consultation call",
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
                description: "Escalates chat to a human agent when customer requests live support",
                parameters: {
                    reason: "Customer request or complex inquiry",
                },
            },
        ];
    }
    buildSystemPrompt(ctx, customPersona) {
        let prompt = "";
        const masterPrompt = (customPersona || "").trim();
        if (masterPrompt) {
            prompt += `# MASTER SYSTEM PROMPT & BEHAVIOR DIRECTIVE (FOLLOW STRICTLY):\n${masterPrompt}\n\n`;
        }
        else {
            prompt += `You are "Sharyx AI", an expert workforce co-pilot. Keep replies warm, professional, helpful, and concise (1-3 sentences maximum for WhatsApp). Always follow the user's language (Tamil, English, or Tanglish).\n\n`;
        }
        if (ctx.tenantBusinessContext) {
            const b = ctx.tenantBusinessContext;
            prompt += `\n\n[APPLICATION OWNER & BUSINESS IDENTITY]:\n`;
            prompt += `You represent "${b.companyName || "Sharyx Enterprise"}".\n`;
            if (b.servicesList)
                prompt += `- Core Solutions: ${b.servicesList}\n`;
            if (b.address)
                prompt += `- Address: ${b.address}\n`;
            if (b.businessEmail)
                prompt += `- Support Email: ${b.businessEmail}\n`;
        }
        prompt += `\n\n[CRM CONTACT & PROFILE CONTEXT]:\n`;
        if (ctx.leadInfo) {
            prompt += `- Contact Name: ${ctx.leadInfo.name || ctx.senderName}\n`;
            prompt += `- Phone: ${ctx.senderPhone}\n`;
            if (ctx.leadInfo.email)
                prompt += `- Email: ${ctx.leadInfo.email}\n`;
            if (ctx.leadInfo.lead_status)
                prompt += `- Pipeline Stage: ${ctx.leadInfo.lead_status}\n`;
            if (ctx.leadInfo.is_candidate)
                prompt += `- Candidate Stage: ${ctx.leadInfo.candidate_stage || "screening"}\n`;
            if (ctx.leadInfo.interested_service)
                prompt += `- Notes / Interest: ${ctx.leadInfo.interested_service}\n`;
        }
        else {
            prompt += `- Contact: New Lead (${ctx.senderPhone})\n`;
        }
        if (ctx.omnichannelLogs) {
            const o = ctx.omnichannelLogs;
            if (o.lastCallSummary || o.lastWhatsAppMsg || o.lastEmailLog) {
                prompt += `\n\n[LAST INTERACTION ACROSS CHANNELS]:\n`;
                if (o.lastCallSummary) {
                    prompt += `- Last Phone Call Summary: ${o.lastCallSummary} (Outcome: ${o.lastCallOutcome || "COMPLETED"})\n`;
                }
                if (o.lastWhatsAppMsg) {
                    prompt += `- Last WhatsApp Message: ${o.lastWhatsAppMsg}\n`;
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
            prompt += `*CRITICAL*: If customer asks for the Google Meet link, meeting link, or time, share this link (${a.meetingUrl}) directly in your message! Do NOT tell them to check email.\n`;
        }
        if (ctx.openRolesContext) {
            prompt += `\n\n[LIVE HR JOB OPENINGS & HIRING CONTEXT]:\n${ctx.openRolesContext}\n\n`;
            prompt += `*RECRUITMENT & HIRING INSTRUCTIONS*:
- When a candidate or job seeker asks about jobs, openings, career opportunities, or applying, refer ONLY to the verified roles above.
- Never invent roles or locations.
- If customer provides their name or email, use the "capture_contact" tool.
- If customer confirms a slot for an interview, use the "book_appointment" tool.`;
        }
        if (ctx.kbContext) {
            prompt += `\n\n[VERIFIED KNOWLEDGE BASE CONTEXT]:\n${ctx.kbContext}\n\n**CRITICAL GROUNDING**: Answer accurately using ONLY the verified facts above. Never hallucinate.`;
        }
        const tools = ctx.tools && ctx.tools.length > 0 ? ctx.tools : this.defaultTools;
        prompt += `\n\n[AVAILABLE SAAS TOOLS]:\n${JSON.stringify(tools, null, 2)}\n\n`;
        prompt += `**TOOL CALLING RULE**: If customer explicitly wants to book a meeting/interview, save contact info, request a sales phone call, get brochure, or transfer to human, reply ONLY in JSON format: {"action": "execute_tool", "toolName": "<name>", "inputs": {...}}. If no tool is needed, respond with standard friendly, concise text.`;
        if (ctx.mediaContext) {
            prompt += `\n\n[MEDIA CONTEXT]:\n${ctx.mediaContext}\n`;
        }
        if (masterPrompt) {
            prompt += `\n\nREMINDER: Strictly follow the persona, tone, language, and guidelines defined in the MASTER SYSTEM PROMPT above.`;
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
                    servicesList: "AI Autonomous Workforce, WhatsApp Cloud Automation, Email AI Copilot, Voice Telephony, CRM Integration",
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
        let leadInfo = undefined;
        try {
            const ld = await lead_1.lead.findOne({ where: { phone: senderPhone } });
            if (ld) {
                leadInfo = {
                    name: ld.name,
                    email: ld.email,
                    lead_status: ld.lead_status,
                    deal_value: ld.score,
                    interested_service: ld.notes,
                    is_candidate: ld.is_candidate,
                    candidate_stage: ld.candidate_stage,
                };
            }
        }
        catch (_d) { }
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
        catch (_e) { }
        let openRolesContext;
        try {
            if (this.openingsService) {
                const { promptBlock } = await this.openingsService.formatOpenRolesForPrompt(tenantId || "default");
                openRolesContext = promptBlock;
            }
        }
        catch (err) {
            this.logger.warn(`Could not load open roles: ${err.message}`);
        }
        return {
            tenantId: tenantId || "default",
            senderPhone,
            senderName: senderName || senderPhone,
            messageText,
            conversationHistory: history,
            leadInfo: leadInfo || {
                name: senderName,
                lead_status: "ACTIVE_INQUIRY",
                interested_service: "WhatsApp AI & Voice Workforce",
            },
            activeAppointment,
            openRolesContext,
            tenantBusinessContext: companyContext || {
                companyName: "Sharyx",
                servicesList: "AI Workforce Solutions & WhatsApp Cloud Automation",
                businessEmail: "support@sharyx.ai",
            },
            omnichannelLogs: {
                lastWhatsAppMsg,
                lastCallSummary: "Inquired about autonomous WhatsApp co-pilot and AI capabilities",
                lastCallOutcome: "QUALIFIED_PROSPECT",
            },
        };
    }
    async generateReply(ctx, aiConfig) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w;
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
        const userApiKey = ((aiConfig === null || aiConfig === void 0 ? void 0 : aiConfig.api_key) || "").trim();
        const openAiKey = (userApiKey.startsWith("sk-") ? userApiKey : "") || (process.env.OPENAI_API_KEY || "").trim();
        const geminiKey = (!userApiKey.startsWith("sk-") && userApiKey ? userApiKey : "") || (process.env.GEMINI_API_KEY || "").trim();
        const isGemini = (aiConfig === null || aiConfig === void 0 ? void 0 : aiConfig.llm_provider) === "gemini" ||
            (!(aiConfig === null || aiConfig === void 0 ? void 0 : aiConfig.llm_provider) && Boolean(geminiKey)) ||
            (userApiKey && !userApiKey.startsWith("sk-"));
        if (isGemini && geminiKey) {
            try {
                let model = (aiConfig === null || aiConfig === void 0 ? void 0 : aiConfig.llm_model) || "gemini-2.5-flash";
                if (model === "gemini-2.0-flash" || model === "gemini-3.8-flash") {
                    model = "gemini-2.5-flash";
                }
                const candidateModels = [model, "gemini-2.5-flash", "gemini-flash-latest", "gemini-1.5-flash"];
                const contents = [
                    ...ctx.conversationHistory.slice(-10).map((h) => ({
                        role: h.role === "assistant" ? "model" : "user",
                        parts: [{ text: h.content }],
                    })),
                    {
                        role: "user",
                        parts: [{ text: ctx.messageText }],
                    },
                ];
                let response;
                for (const m of candidateModels) {
                    try {
                        response = await axios_1.default.post(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${geminiKey}`, {
                            systemInstruction: {
                                parts: [{ text: systemPrompt }],
                            },
                            contents,
                            generationConfig: {
                                temperature: 0.3,
                                maxOutputTokens: 600,
                            },
                        }, { timeout: 15000 });
                        if ((_g = (_f = (_e = (_d = (_c = (_b = response === null || response === void 0 ? void 0 : response.data) === null || _b === void 0 ? void 0 : _b.candidates) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.content) === null || _e === void 0 ? void 0 : _e.parts) === null || _f === void 0 ? void 0 : _f[0]) === null || _g === void 0 ? void 0 : _g.text) {
                            break;
                        }
                    }
                    catch (modelErr) {
                        this.logger.warn(`Gemini model ${m} attempt failed, trying next fallback...`);
                    }
                }
                const rawText = ((_p = (_o = (_m = (_l = (_k = (_j = (_h = response === null || response === void 0 ? void 0 : response.data) === null || _h === void 0 ? void 0 : _h.candidates) === null || _j === void 0 ? void 0 : _j[0]) === null || _k === void 0 ? void 0 : _k.content) === null || _l === void 0 ? void 0 : _l.parts) === null || _m === void 0 ? void 0 : _m[0]) === null || _o === void 0 ? void 0 : _o.text) === null || _p === void 0 ? void 0 : _p.trim()) || "";
                const toolCall = this.parseToolCall(rawText);
                if (toolCall) {
                    return { replyText: await this.getToolConfirmation(toolCall, ctx), toolCall };
                }
                if (rawText)
                    return { replyText: rawText };
            }
            catch (err) {
                this.logger.error("PromptEngine Gemini Error:", ((_q = err === null || err === void 0 ? void 0 : err.response) === null || _q === void 0 ? void 0 : _q.data) || err.message);
            }
        }
        if (!isGemini && openAiKey) {
            try {
                const model = (aiConfig === null || aiConfig === void 0 ? void 0 : aiConfig.llm_model) && !aiConfig.llm_model.startsWith("gemini") ? aiConfig.llm_model : "gpt-4o-mini";
                const messages = [
                    { role: "system", content: systemPrompt },
                    ...ctx.conversationHistory.slice(-8).map((h) => ({
                        role: h.role === "assistant" ? "assistant" : "user",
                        content: h.content,
                    })),
                    { role: "user", content: ctx.messageText },
                ];
                const response = await axios_1.default.post("https://api.openai.com/v1/chat/completions", {
                    model,
                    messages,
                    temperature: 0.3,
                    max_tokens: 500,
                }, {
                    headers: {
                        Authorization: `Bearer ${openAiKey}`,
                        "Content-Type": "application/json",
                    },
                    timeout: 15000,
                });
                const rawText = ((_v = (_u = (_t = (_s = (_r = response.data) === null || _r === void 0 ? void 0 : _r.choices) === null || _s === void 0 ? void 0 : _s[0]) === null || _t === void 0 ? void 0 : _t.message) === null || _u === void 0 ? void 0 : _u.content) === null || _v === void 0 ? void 0 : _v.trim()) || "";
                const toolCall = this.parseToolCall(rawText);
                if (toolCall) {
                    return { replyText: await this.getToolConfirmation(toolCall, ctx), toolCall };
                }
                if (rawText)
                    return { replyText: rawText };
            }
            catch (err) {
                this.logger.error("PromptEngine OpenAI Error:", ((_w = err === null || err === void 0 ? void 0 : err.response) === null || _w === void 0 ? void 0 : _w.data) || err.message);
            }
        }
        return {
            replyText: (aiConfig === null || aiConfig === void 0 ? void 0 : aiConfig.welcome_message) ||
                "Hello! Thank you for reaching out to Sharyx. Our team has received your message and will assist you shortly.",
        };
    }
    parseToolCall(rawText) {
        try {
            let trimmed = rawText.trim();
            if (trimmed.startsWith("```json")) {
                trimmed = trimmed.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
            }
            else if (trimmed.startsWith("```")) {
                trimmed = trimmed.replace(/^```\s*/, "").replace(/```$/, "").trim();
            }
            if (trimmed.includes('{"action": "execute_tool"') || trimmed.includes('{"action":"execute_tool"')) {
                const jsonMatch = trimmed.match(/\{[\s\S]*"action"\s*:\s*"execute_tool"[\s\S]*\}/);
                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);
                    if (parsed.action === "execute_tool" && parsed.toolName) {
                        return parsed;
                    }
                }
            }
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
        var _a, _b, _c, _d;
        switch (tool.toolName) {
            case "book_appointment": {
                const slot = ((_a = tool.inputs) === null || _a === void 0 ? void 0 : _a.slot) || "Tomorrow at 11:00 AM";
                const meetingType = ((_b = tool.inputs) === null || _b === void 0 ? void 0 : _b.type) || "demo";
                const isInterview = /(?:interview|candidate|job)/i.test(`${meetingType} ${(ctx === null || ctx === void 0 ? void 0 : ctx.senderName) || ""}`);
                const meetRoom = await CalendarHelper_1.CalendarHelper.createGoogleMeetRoom(`${isInterview ? "Interview" : "Demo & Consultation"} with ${(ctx === null || ctx === void 0 ? void 0 : ctx.senderName) || "Customer"}`, slot);
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
                        const ld = await lead_1.lead.findOne({ where: { phone: ctx.senderPhone } });
                        if (ld) {
                            ld.preferred_interview_slot = slot;
                            ld.interview_link = meetRoom.meetUrl;
                            if (isInterview) {
                                ld.is_candidate = true;
                                ld.lead_status = "INTERVIEW_SCHEDULED";
                            }
                            await ld.save();
                            if (ld.email) {
                                this.events.emit("agent.outcome", {
                                    tenantId: (ctx === null || ctx === void 0 ? void 0 : ctx.tenantId) || "default",
                                    phone: ctx.senderPhone,
                                    email: ld.email,
                                    leadName: ld.name || (ctx === null || ctx === void 0 ? void 0 : ctx.senderName) || "Candidate",
                                    outcome: isInterview ? "Interview Scheduled" : "Demo Booked",
                                    event: isInterview ? "interview_booked" : "demo_booked",
                                    summary: `${isInterview ? "Interview" : "Demo"} confirmed for ${slot}. Google Meet link: ${meetRoom.meetUrl}`,
                                    agentName: "Sharyx AI",
                                    channel: "whatsapp",
                                    meetUrl: meetRoom.meetUrl,
                                    customVariables: {
                                        applied_role: ld.job_title || "Backend Developer",
                                        meeting_slot: slot,
                                        meet_url: meetRoom.meetUrl,
                                    },
                                });
                                this.logger.log(`📧 [EMAIL CONFIRMATION TRIGGERED] Sent meet link to ${ld.email}`);
                            }
                        }
                    }
                }
                catch (err) {
                    this.logger.error("Failed to save meeting_info to conversation:", err.message);
                }
                if (ctx === null || ctx === void 0 ? void 0 : ctx.senderPhone) {
                    this.events.emit("voice.call.requested", {
                        tenantId: ctx.tenantId || "default",
                        phone: ctx.senderPhone,
                        customerName: ctx.senderName,
                        scheduledType: isInterview ? "interview" : "demo",
                        reason: isInterview ? "Interview scheduled" : "Demo consultation scheduled",
                        meetingSlot: slot,
                        meetUrl: meetRoom.meetUrl,
                        agentKey: isInterview ? "recruitment" : "sales",
                    });
                }
                return `🎉 Perfect! I have scheduled your ${isInterview ? "interview" : "consultation"} for *${slot}*.\n\n🎥 *Google Meet Link*: ${meetRoom.meetUrl}\n\nPlease click the link to join at the scheduled time. Looking forward to speaking with you! 👍`;
            }
            case "capture_contact": {
                const { name, email, phone, company: compName, role, preferred_location, relocation } = tool.inputs || {};
                try {
                    const targetPhone = phone || (ctx === null || ctx === void 0 ? void 0 : ctx.senderPhone);
                    let ld = targetPhone ? await lead_1.lead.findOne({ where: { phone: targetPhone } }) : null;
                    if (!ld && (ctx === null || ctx === void 0 ? void 0 : ctx.senderPhone)) {
                        ld = await lead_1.lead.findOne({ where: { phone: ctx.senderPhone } });
                    }
                    if (!ld) {
                        ld = new lead_1.lead();
                        ld.tenant_id = (ctx === null || ctx === void 0 ? void 0 : ctx.tenantId) || "default";
                        ld.phone = targetPhone || (ctx === null || ctx === void 0 ? void 0 : ctx.senderPhone) || "unknown";
                        ld.source = lead_1.LeadSource.WHATSAPP;
                        ld.lead_status = lead_1.LeadStatus.NEW;
                    }
                    if (name)
                        ld.name = name;
                    if (email)
                        ld.email = email;
                    if (compName)
                        ld.company_name = compName;
                    if (role) {
                        ld.is_candidate = true;
                        ld.notes = `${ld.notes || ""}\nRole: ${role}, Location: ${preferred_location || "N/A"}, Relocation: ${relocation || "N/A"}`.trim();
                    }
                    ld.last_contacted_at = new Date();
                    await ld.save();
                    if (ctx === null || ctx === void 0 ? void 0 : ctx.senderPhone) {
                        const conv = await WhatsAppConversation_entity_1.WhatsAppConversation.findOne({ where: { customer_phone: ctx.senderPhone } });
                        if (conv) {
                            if (name)
                                conv.customer_name = name;
                            if (ld.id)
                                conv.lead_id = ld.id;
                            await conv.save();
                        }
                    }
                }
                catch (err) {
                    this.logger.error("Failed to capture contact to CRM:", err.message);
                }
                const candidateName = name || (ctx === null || ctx === void 0 ? void 0 : ctx.senderName) || "there";
                const targetRole = role ? `for the *${role}* position` : "";
                return `Great to connect with you, ${candidateName}! 🌟 I have noted your application ${targetRole}.

To complete your candidate profile, could you please share:
1. Your email address (so we can send calendar invites & meet links)
2. Total & relevant experience
3. Current company & employment status (serving notice / relieved)
4. Expected CTC
5. Your updated resume / CV (PDF link or attach file)

Whenever you're ready, we can also schedule a quick Google Meet interview round! 🚀`;
            }
            case "dispatch_voice_call": {
                const callPhone = ((_c = tool.inputs) === null || _c === void 0 ? void 0 : _c.phone) || (ctx === null || ctx === void 0 ? void 0 : ctx.senderPhone);
                const reason = ((_d = tool.inputs) === null || _d === void 0 ? void 0 : _d.reason) || "Customer requested live sales phone call";
                if (callPhone) {
                    this.events.emit("voice.call.requested", {
                        tenantId: (ctx === null || ctx === void 0 ? void 0 : ctx.tenantId) || "default",
                        phone: callPhone,
                        customerName: ctx === null || ctx === void 0 ? void 0 : ctx.senderName,
                        scheduledType: "sales_call",
                        reason,
                        agentKey: "sales",
                    });
                    return `📞 I have initiated an immediate outbound phone call to *${callPhone}*! Our AI Sales Specialist is calling you right now. Please check your phone! 👍`;
                }
                return `I'd be glad to connect you with our sales team! Could you please share your phone number so we can call you right away?`;
            }
            case "send_brochure":
                return `📄 I've shared our official Sharyx 2026 product guide and enterprise brochure. Please feel free to ask any questions or let me know if you would like to book a demo!`;
            case "transfer_to_human": {
                try {
                    if (ctx === null || ctx === void 0 ? void 0 : ctx.senderPhone) {
                        const conv = await WhatsAppConversation_entity_1.WhatsAppConversation.findOne({ where: { customer_phone: ctx.senderPhone } });
                        if (conv) {
                            conv.conversation_status = "human_takeover";
                            await conv.save();
                        }
                    }
                }
                catch (_e) { }
                return `👨‍💼 Certainly! I have escalated this conversation to our senior team. A team representative will connect with you shortly.`;
            }
            default:
                return `Action "${tool.toolName}" has been executed successfully. How else can I help you today?`;
        }
    }
};
exports.PromptEngineService = PromptEngineService;
exports.PromptEngineService = PromptEngineService = PromptEngineService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [event_emitter_1.EventEmitter2,
        JobOpenings_service_1.JobOpeningsService])
], PromptEngineService);
//# sourceMappingURL=PromptEngine.service.js.map