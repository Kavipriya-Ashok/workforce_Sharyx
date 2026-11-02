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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var VoiceCallService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.VoiceCallService = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const typeorm_1 = require("typeorm");
const axios_1 = __importDefault(require("axios"));
const VoiceCallLog_entity_1 = require("../../Database/Table/Voice/VoiceCallLog.entity");
const VoiceAgent_entity_1 = require("../../Database/Table/Voice/VoiceAgent.entity");
const VoiceProviderConfig_entity_1 = require("../../Database/Table/Voice/VoiceProviderConfig.entity");
const WhatsAppMessage_entity_1 = require("../../Database/Table/WhatsApp/WhatsAppMessage.entity");
const EmailLog_entity_1 = require("../../Database/Table/Email/EmailLog.entity");
const ConversationAgentState_entity_1 = require("../../Database/Table/Agent/ConversationAgentState.entity");
const lead_1 = require("../../Database/Table/Lead/lead");
const lead_activity_1 = require("../../Database/Table/Lead/lead_activity");
const VoiceFactory_service_1 = require("./VoiceFactory.service");
const AgentTools_service_1 = require("../../AgentOrchestrator/Services/AgentTools.service");
const AgentLlm_service_1 = require("../../AgentOrchestrator/Services/AgentLlm.service");
let VoiceCallService = VoiceCallService_1 = class VoiceCallService {
    constructor(factory, events, llm) {
        this.factory = factory;
        this.events = events;
        this.llm = llm;
        this.logger = new common_1.Logger(VoiceCallService_1.name);
        this.recentCallDispatches = new Map();
        this.lastVapiSyncTime = 0;
    }
    async handleVoiceCallRequest(event) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q;
        const tenantId = event.tenantId || "default";
        const cleanPhone = (event.phone || "").replace(/\D/g, "").slice(-10);
        const now = Date.now();
        const lastDispatched = this.recentCallDispatches.get(cleanPhone);
        if (lastDispatched && now - lastDispatched < 90000) {
            this.logger.warn(`⏳ [DUPLICATE CALL SUPPRESSED] Call to ${event.phone} already dispatched ${Math.round((now - lastDispatched) / 1000)}s ago. Skipping duplicate request.`);
            return;
        }
        this.recentCallDispatches.set(cleanPhone, now);
        this.logger.log(`📞 [EVENT TRIGGERED CALL] Call to ${event.phone} (Tenant: ${tenantId}, Type: ${event.scheduledType || "auto"}, Target: ${event.agentKey || "sales"})`);
        const activeConfig = await VoiceProviderConfig_entity_1.VoiceProviderConfig.findOne({
            where: { tenant_id: tenantId, is_active: true },
        });
        let connectedProvider = activeConfig === null || activeConfig === void 0 ? void 0 : activeConfig.provider;
        if (!connectedProvider) {
            const allConfigs = await VoiceProviderConfig_entity_1.VoiceProviderConfig.find({ where: { tenant_id: tenantId } });
            const withKey = allConfigs.find((c) => c.api_key && c.api_key.trim().length > 0 && c.is_active !== false);
            if (withKey) {
                connectedProvider = withKey.provider;
            }
            else if (process.env.VAPI_API_KEY) {
                connectedProvider = "vapi";
            }
            else {
                connectedProvider = "saas_fallback";
            }
        }
        const isInterview = event.scheduledType === "interview" ||
            event.agentKey === "recruitment" ||
            /interview/i.test(event.reason || "");
        const targetAgentKey = isInterview ? "recruitment" : (event.agentKey || "sales");
        let agent = null;
        if (event.agentId) {
            agent = await VoiceAgent_entity_1.VoiceAgent.findOne({ where: { id: event.agentId } });
            if (!agent) {
                agent = await VoiceAgent_entity_1.VoiceAgent.findOne({ where: { remote_agent_id: event.agentId } });
            }
        }
        if (!agent && event.agentKey) {
            agent = await VoiceAgent_entity_1.VoiceAgent.findOne({
                where: {
                    tenant_id: tenantId,
                    provider: connectedProvider,
                    template_key: event.agentKey,
                    status: true,
                    is_enabled: true,
                },
            });
            if (!agent) {
                agent = await VoiceAgent_entity_1.VoiceAgent.findOne({
                    where: {
                        provider: connectedProvider,
                        template_key: event.agentKey,
                        status: true,
                    },
                });
            }
            if (!agent) {
                agent = await VoiceAgent_entity_1.VoiceAgent.findOne({
                    where: { name: event.agentKey, status: true },
                });
            }
        }
        if (!agent) {
            agent = await VoiceAgent_entity_1.VoiceAgent.findOne({
                where: {
                    tenant_id: tenantId,
                    provider: connectedProvider,
                    template_key: targetAgentKey,
                    status: true,
                    is_enabled: true,
                },
            });
        }
        if (!agent) {
            agent = await VoiceAgent_entity_1.VoiceAgent.findOne({
                where: {
                    tenant_id: tenantId,
                    provider: connectedProvider,
                    template_key: targetAgentKey,
                    status: true,
                },
            });
        }
        if (!agent) {
            agent = await VoiceAgent_entity_1.VoiceAgent.findOne({
                where: { tenant_id: tenantId, provider: connectedProvider, status: true, is_enabled: true },
            });
        }
        if (!agent) {
            agent = await VoiceAgent_entity_1.VoiceAgent.findOne({
                where: { tenant_id: tenantId, provider: connectedProvider, status: true },
            });
        }
        if (!agent) {
            agent = await VoiceAgent_entity_1.VoiceAgent.findOne({
                where: { tenant_id: tenantId, template_key: targetAgentKey, status: true },
            });
        }
        if (!agent) {
            agent = await VoiceAgent_entity_1.VoiceAgent.findOne({ where: { tenant_id: tenantId, status: true } });
        }
        if (!agent) {
            try {
                agent = new VoiceAgent_entity_1.VoiceAgent();
                agent.tenant_id = tenantId;
                agent.name = isInterview ? "Talent Recruiter (Sarah)" : "Sales Specialist (Alex)";
                agent.provider = connectedProvider;
                agent.template_key = targetAgentKey;
                agent.status = true;
                agent.is_enabled = true;
                agent.remote_agent_id = `${connectedProvider}_agent_${Date.now()}`;
                agent.system_prompt = isInterview
                    ? "You are Sarah, an executive recruiter calling a candidate who just scheduled an interview on Google Meet. Acknowledge their scheduled slot, confirm their availability, and answer any quick questions."
                    : "You are Alex, a sales specialist calling a prospect who just scheduled a product demo on Google Meet. Acknowledge their scheduled slot, warmly confirm the meeting, and ask if they have any initial questions.";
                agent.first_message = isInterview
                    ? "Hello {{customer_name}}, this is Sarah from Sharyx AI following up on your interview scheduled for {{meeting_slot}}! We've sent your Google Meet link. Are you looking forward to the discussion?"
                    : "Hello {{customer_name}}, this is Alex from Sharyx AI following up on the demo you just scheduled for {{meeting_slot}}! We've sent the Google Meet link. Do you have any quick questions before our session?";
                await agent.save();
            }
            catch (agentErr) {
                this.logger.warn(`Could not auto-create fallback VoiceAgent: ${agentErr.message}`);
            }
        }
        if (!agent) {
            this.logger.warn(`No VoiceAgent could be resolved for tenant ${tenantId} to handle voice.call.requested`);
            return;
        }
        let stateSlots = {};
        let matchedLead = null;
        let candidateName = event.customerName || "";
        let customerEmail = "";
        try {
            if (cleanPhone) {
                const stateRec = await ConversationAgentState_entity_1.ConversationAgentState.findOne({
                    where: [{ customer_phone: (0, typeorm_1.Like)(`%${cleanPhone}%`) }],
                    order: { updated_on: "DESC" },
                });
                if (stateRec) {
                    stateSlots = stateRec.collected_slots || {};
                    if (!candidateName && stateRec.customer_name)
                        candidateName = stateRec.customer_name;
                    if (stateRec.customer_email)
                        customerEmail = stateRec.customer_email;
                }
                if (event.leadId) {
                    matchedLead = await lead_1.lead.findOne({ where: { id: event.leadId } });
                }
                if (!matchedLead) {
                    matchedLead = await lead_1.lead.findOne({
                        where: [{ phone: (0, typeorm_1.Like)(`%${cleanPhone}%`) }],
                        order: { created_on: "DESC" },
                    });
                }
                if (matchedLead) {
                    if (!candidateName && matchedLead.name)
                        candidateName = matchedLead.name;
                    if (!customerEmail && matchedLead.email)
                        customerEmail = matchedLead.email;
                }
            }
        }
        catch (ctxErr) {
            this.logger.warn(`Could not load candidate state/lead context: ${ctxErr.message}`);
        }
        const customerName = candidateName || "there";
        const appliedRole = event.appliedRole ||
            event.role ||
            ((_a = event.customVariables) === null || _a === void 0 ? void 0 : _a.applied_role) ||
            ((_b = event.customVariables) === null || _b === void 0 ? void 0 : _b.role) ||
            stateSlots.applied_role ||
            stateSlots.job_title ||
            stateSlots.role ||
            (matchedLead === null || matchedLead === void 0 ? void 0 : matchedLead.job_title) ||
            "";
        const experience = stateSlots.experience ||
            stateSlots.total_experience ||
            ((matchedLead === null || matchedLead === void 0 ? void 0 : matchedLead.total_experience) ? `${matchedLead.total_experience} years` : "");
        const noticePeriod = stateSlots.notice_period ||
            stateSlots.employment_status ||
            (matchedLead === null || matchedLead === void 0 ? void 0 : matchedLead.employment_status) ||
            "";
        const expectedCtc = stateSlots.expected_ctc ||
            ((matchedLead === null || matchedLead === void 0 ? void 0 : matchedLead.expected_ctc) ? `${matchedLead.expected_ctc} LPA` : "");
        const resumeInfo = stateSlots.resume_filename ||
            stateSlots.resume_url ||
            (matchedLead === null || matchedLead === void 0 ? void 0 : matchedLead.resume_url) ||
            "";
        const companyName = stateSlots.company ||
            (matchedLead === null || matchedLead === void 0 ? void 0 : matchedLead.company_name) ||
            "";
        const slotText = event.meetingSlot ||
            ((_c = event.customVariables) === null || _c === void 0 ? void 0 : _c.meeting_slot) ||
            ((_d = event.customVariables) === null || _d === void 0 ? void 0 : _d.scheduled_slot) ||
            ((_e = stateSlots.appointment) === null || _e === void 0 ? void 0 : _e.slot) ||
            (matchedLead === null || matchedLead === void 0 ? void 0 : matchedLead.preferred_interview_slot) ||
            "your upcoming session";
        const meetUrlText = event.meetUrl ||
            ((_f = event.customVariables) === null || _f === void 0 ? void 0 : _f.meet_url) ||
            ((_g = stateSlots.appointment) === null || _g === void 0 ? void 0 : _g.meet_url) ||
            (matchedLead === null || matchedLead === void 0 ? void 0 : matchedLead.interview_link) ||
            "";
        const scheduledType = isInterview ? "interview" : "demo";
        const defaultReason = isInterview ? "Interview scheduled" : "You scheduled demo";
        const reasonText = event.reason || defaultReason;
        let chatSummary = "";
        let emailSummary = "";
        try {
            if (cleanPhone) {
                const recentMsgs = await WhatsAppMessage_entity_1.WhatsAppMessage.find({
                    where: [
                        { sender_phone: (0, typeorm_1.Like)(`%${cleanPhone}%`) },
                        { recipient_phone: (0, typeorm_1.Like)(`%${cleanPhone}%`) },
                    ],
                    order: { created_on: "DESC" },
                    take: 8,
                });
                if (recentMsgs && recentMsgs.length > 0) {
                    chatSummary = recentMsgs
                        .reverse()
                        .map((m) => `${m.direction === "inbound" ? "Customer" : "Assistant"}: "${(m.message_text || "").replace(/\n+/g, " ").slice(0, 150)}"`)
                        .join("\n");
                }
            }
            if (customerEmail || (matchedLead === null || matchedLead === void 0 ? void 0 : matchedLead.id)) {
                const emailWhere = [];
                if (customerEmail)
                    emailWhere.push({ from_email: customerEmail }, { to_email: customerEmail });
                if (matchedLead === null || matchedLead === void 0 ? void 0 : matchedLead.id)
                    emailWhere.push({ lead_id: matchedLead.id });
                const recentEmails = await EmailLog_entity_1.EmailLog.find({
                    where: emailWhere,
                    order: { created_on: "DESC" },
                    take: 5,
                });
                if (recentEmails && recentEmails.length > 0) {
                    emailSummary = recentEmails
                        .reverse()
                        .map((e) => `${e.direction === "inbound" ? "Customer Email" : "Sent Email"} (${e.subject || "No subject"}): "${(e.body_text || "").replace(/\s+/g, " ").slice(0, 150)}"`)
                        .join("\n");
                }
            }
        }
        catch (chatErr) {
            this.logger.warn(`Could not load chat/email history for voice call: ${chatErr.message}`);
        }
        if (((_h = event.customVariables) === null || _h === void 0 ? void 0 : _h.email_summary) && !emailSummary.includes(event.customVariables.email_summary)) {
            emailSummary = emailSummary ? `${event.customVariables.email_summary}\n${emailSummary}` : event.customVariables.email_summary;
        }
        const callHistory = Array.isArray((_j = matchedLead === null || matchedLead === void 0 ? void 0 : matchedLead.custom_fields) === null || _j === void 0 ? void 0 : _j.call_history)
            ? matchedLead.custom_fields.call_history
            : [];
        const prevCallSummary = ((_l = (_k = matchedLead === null || matchedLead === void 0 ? void 0 : matchedLead.custom_fields) === null || _k === void 0 ? void 0 : _k.last_voice_call) === null || _l === void 0 ? void 0 : _l.summary) || (((_m = callHistory[0]) === null || _m === void 0 ? void 0 : _m.summary) || "");
        const preferredLocation = stateSlots.preferred_location || ((_p = (_o = matchedLead === null || matchedLead === void 0 ? void 0 : matchedLead.custom_fields) === null || _o === void 0 ? void 0 : _o.recruitment_profile) === null || _p === void 0 ? void 0 : _p.preferred_location) || (matchedLead === null || matchedLead === void 0 ? void 0 : matchedLead.relocation) || "";
        const contextLines = [
            `Customer / Candidate Name: ${customerName}`,
            companyName ? `Company: ${companyName}` : "",
            customerEmail ? `Email: ${customerEmail}` : "",
            appliedRole ? `Applied Role / Position: ${appliedRole}` : "",
            experience ? `Experience: ${experience}` : "",
            noticePeriod ? `Employment / Notice Period: ${noticePeriod}` : "",
            expectedCtc ? `Expected CTC: ${expectedCtc}` : "",
            preferredLocation ? `Preferred Location & Relocation: ${preferredLocation}` : "",
            resumeInfo ? `Resume on File: ${resumeInfo}` : "",
            slotText && slotText !== "your upcoming session" ? `Scheduled ${isInterview ? "Interview" : "Demo"} Slot: ${slotText}` : "",
            meetUrlText ? `Google Meet Link Already Sent on WhatsApp & Email: ${meetUrlText}` : "",
            prevCallSummary ? `Previous Voice Call Summary: ${prevCallSummary}` : "",
            reasonText ? `Call Reason: ${reasonText}` : "",
            chatSummary ? `\nRecent WhatsApp Conversation:\n${chatSummary}` : "",
            emailSummary ? `\nRecent Email Thread:\n${emailSummary}` : "",
        ].filter(Boolean);
        const hasRichContext = Boolean(chatSummary || emailSummary || appliedRole || meetUrlText || prevCallSummary);
        const defaultBookingGreeting = isInterview
            ? `Hello ${customerName}! This is ${agent.name} from Sharyx Talent Acquisition following up on your ${appliedRole ? `${appliedRole} role interview` : "interview"} scheduled for ${slotText}. We have sent your Google Meet link on WhatsApp and Email. Do you have any quick questions before your interview?`
            : meetUrlText
                ? `Hello ${customerName}! This is ${agent.name} from Sharyx AI following up on the demo you scheduled for ${slotText}. We have shared the Google Meet link on your WhatsApp and Email. Is there anything specific you would like us to focus on during the session?`
                : `Hello ${customerName}! This is ${agent.name} from Sharyx AI following up with you. How can I assist you today?`;
        let agentFirstMessage = event.firstMessage;
        let spokenTalkingPoints = [];
        if (!agentFirstMessage && (chatSummary || emailSummary || appliedRole || slotText)) {
            try {
                const spokenRes = await this.generateSpokenCallSummary({
                    customerName,
                    agentName: agent.name,
                    role: appliedRole,
                    slot: slotText,
                    meetUrl: meetUrlText,
                    chatSummary,
                    emailSummary,
                    isInterview,
                    language: ((_q = event.customVariables) === null || _q === void 0 ? void 0 : _q.language) || "en",
                });
                if (spokenRes === null || spokenRes === void 0 ? void 0 : spokenRes.spokenFirstSentence) {
                    agentFirstMessage = spokenRes.spokenFirstSentence;
                    spokenTalkingPoints = spokenRes.inCallTalkingPoints || [];
                    this.logger.log(`🎙️ [AI NATURAL SPOKEN SUMMARY SCRIPT]: "${agentFirstMessage}"`);
                }
            }
            catch (sumErr) {
                this.logger.debug(`Spoken summary fallback: ${sumErr.message}`);
            }
        }
        if (!agentFirstMessage) {
            agentFirstMessage = defaultBookingGreeting;
        }
        const basePrompt = isInterview
            ? `You are ${agent.name}, the Talent Acquisition Specialist at Sharyx. You are calling ${customerName} to follow up on their ${appliedRole ? `${appliedRole} role` : ""} interview scheduled for ${slotText}.
CRITICAL INSTRUCTIONS:
- The candidate ALREADY applied, completed screening, and booked their interview!
- Under NO circumstances should you ask 'What position did you apply for?' or 'Do you have time for a screening?'. You ALREADY know their details!
- Confidently acknowledge their scheduled interview (${slotText}) and Google Meet link (${meetUrlText || "sent on WhatsApp & Email"}), and answer any questions they have about the company, role, or interview process.`
            : agent.system_prompt ||
                `You are ${agent.name}. You are speaking on a phone call with ${customerName}. Be helpful, natural, and concise.`;
        const talkingPointsSection = spokenTalkingPoints.length > 0
            ? `\n\n# IN-CALL SPOKEN TALKING POINTS (KEY FACTS TO ANSWER CUSTOMER QUESTIONS):\n${spokenTalkingPoints.map((p) => `- ${p}`).join("\n")}\n- REMINDER: Never recite long URLs! Tell the customer: "The clickable Google Meet link is right in your WhatsApp chat and email inbox."`
            : "";
        const agentSystemPrompt = `${basePrompt}${talkingPointsSection}\n\n# OMNICHANNEL CUSTOMER & BOOKING SUMMARY (USE THIS CONTEXT NATURALLY — DO NOT ASK AGAIN FOR DETAILS ALREADY LISTED HERE):\n${contextLines.join("\n")}`;
        const callPayload = Object.assign({ scheduled_type: scheduledType, reason: reasonText, meeting_slot: slotText, meet_url: meetUrlText, customer_name: customerName, customer_email: customerEmail || (matchedLead === null || matchedLead === void 0 ? void 0 : matchedLead.email) || "", email: customerEmail || (matchedLead === null || matchedLead === void 0 ? void 0 : matchedLead.email) || "", phone_number: cleanPhone, company_name: companyName, applied_role: appliedRole, experience: experience, notice_period: noticePeriod, expected_ctc: expectedCtc, chat_summary: chatSummary.slice(0, 800), email_summary: emailSummary.slice(0, 800), first_message: agentFirstMessage, spoken_first_sentence: agentFirstMessage, in_call_talking_points: spokenTalkingPoints, system_prompt: agentSystemPrompt, force_override: hasRichContext, event_type: event.scheduledType || "agent_call" }, (event.customVariables || {}));
        this.logger.log(`📞 [ROUTED TO VOICE AGENT] Platform: ${agent.provider.toUpperCase()} | Agent: ${agent.name} (${agent.id}) | RemoteID: ${agent.remote_agent_id}`);
        await this.dispatchCall({
            agent_id: agent.id,
            phone_number: event.phone,
            customer_name: event.customerName,
            lead_id: event.leadId,
            tenantId: tenantId,
            custom_variables: callPayload,
        }).catch((err) => this.logger.error(`Failed to handle voice.call.requested: ${err.message}`));
    }
    async generateSpokenCallSummary(params) {
        const { customerName, agentName, role, slot, meetUrl, chatSummary, emailSummary, isInterview, language = "en", } = params;
        const systemPrompt = `You are an expert AI Voice Scriptwriter crafting a natural, human spoken telephone opening.
A customer just received messages on WhatsApp and Email. Now an AI agent named "${agentName}" from Sharyx is calling them to give a quick, polite verbal summary.

CRITICAL VOICE & CONVERSATIONAL RULES:
1. "spokenFirstSentence":
   - Keep it concise: strictly under 28 words (6-9 seconds of natural speech).
   - Conversational, warm, and polite.
   - Acknowledge their scheduled ${isInterview ? "interview" : "demo"} for ${slot || "their upcoming session"}.
   - Explicitly mention that full details & Google Meet link have been sent to their WhatsApp and Email.
   - NEVER recite raw URLs, email addresses, or database IDs over the phone.
   - End with a gentle check question (e.g. "Do you have any quick questions?" or "Does this time work for you?").
   - Language mode: ${language === "tamil" ? "Natural spoken Tanglish / Spoken Tamil" : "Natural conversational spoken English"}.

2. "inCallTalkingPoints":
   - 3-4 bullet points summarizing key facts (Role: ${role || "Open Position"}, Slot: ${slot}, Platform: Google Meet on WhatsApp/Email).
   - Instruction: If the customer asks for the link, politely remind them that the clickable Google Meet link is right inside their WhatsApp chat and email inbox.

Return ONLY a valid JSON object matching this schema:
{
  "spokenFirstSentence": "string",
  "inCallTalkingPoints": ["string", "string", "string"]
}`;
        const userMessage = `Customer: ${customerName}
Scheduled Type: ${isInterview ? "Interview Follow-up" : "Product Demo"}
Role: ${role || "N/A"}
Slot: ${slot || "N/A"}
Meet Link: ${meetUrl || "Google Meet"}
Recent WhatsApp:
"""${chatSummary ? chatSummary.slice(0, 400) : "N/A"}"""
Recent Email:
"""${emailSummary ? emailSummary.slice(0, 400) : "N/A"}"""`;
        try {
            const res = await this.llm.completeJson(systemPrompt, [], userMessage, { temperature: 0.3 });
            if ((res === null || res === void 0 ? void 0 : res.spokenFirstSentence) && res.spokenFirstSentence.trim().length > 10) {
                return {
                    spokenFirstSentence: res.spokenFirstSentence.trim(),
                    inCallTalkingPoints: Array.isArray(res.inCallTalkingPoints) ? res.inCallTalkingPoints : [],
                };
            }
        }
        catch (err) {
            this.logger.warn(`Could not generate LLM spoken summary: ${err.message}`);
        }
        return null;
    }
    interpolatePrompt(template, vars) {
        if (!template)
            return template;
        return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
            return vars[key] !== undefined && vars[key] !== null ? String(vars[key]) : `{{${key}}}`;
        });
    }
    async dispatchCall(dto) {
        var _a, _b, _c;
        const tenantId = dto.tenantId || "default";
        const activeConfig = await VoiceProviderConfig_entity_1.VoiceProviderConfig.findOne({
            where: { tenant_id: tenantId, is_active: true },
        });
        const connectedProvider = (activeConfig === null || activeConfig === void 0 ? void 0 : activeConfig.provider) || (process.env.VAPI_API_KEY ? "vapi" : "saas_fallback");
        let agent = null;
        if (dto.agent_id) {
            agent = await VoiceAgent_entity_1.VoiceAgent.findOne({ where: { id: dto.agent_id } });
            if (!agent) {
                agent = await VoiceAgent_entity_1.VoiceAgent.findOne({ where: { remote_agent_id: dto.agent_id } });
            }
            if (agent && agent.provider !== connectedProvider) {
                const preferredCounterpart = await VoiceAgent_entity_1.VoiceAgent.findOne({
                    where: {
                        tenant_id: tenantId,
                        provider: connectedProvider,
                        template_key: agent.template_key || "sales",
                        status: true,
                    },
                });
                if (preferredCounterpart) {
                    this.logger.log(`🔄 [CONNECTED PLATFORM ROUTING] Re-routing from ${agent.provider} agent to active ${connectedProvider} agent: ${preferredCounterpart.name}`);
                    agent = preferredCounterpart;
                }
            }
        }
        if (!agent) {
            const scheduledType = ((_a = dto.custom_variables) === null || _a === void 0 ? void 0 : _a.scheduled_type) || ((_b = dto.custom_variables) === null || _b === void 0 ? void 0 : _b.event_type) || "";
            const isInterview = /interview/i.test(scheduledType) || /interview/i.test(((_c = dto.custom_variables) === null || _c === void 0 ? void 0 : _c.reason) || "");
            const desiredTemplate = isInterview ? "recruitment" : "sales";
            agent = await VoiceAgent_entity_1.VoiceAgent.findOne({
                where: { tenant_id: tenantId, provider: connectedProvider, template_key: desiredTemplate, status: true, is_enabled: true },
            });
            if (!agent) {
                agent = await VoiceAgent_entity_1.VoiceAgent.findOne({
                    where: { tenant_id: tenantId, provider: connectedProvider, template_key: desiredTemplate, status: true },
                });
            }
            if (!agent) {
                agent = await VoiceAgent_entity_1.VoiceAgent.findOne({
                    where: { tenant_id: tenantId, provider: connectedProvider, status: true, is_enabled: true },
                });
            }
            if (!agent) {
                agent = await VoiceAgent_entity_1.VoiceAgent.findOne({
                    where: { tenant_id: tenantId, provider: connectedProvider, status: true },
                });
            }
            if (!agent) {
                agent = await VoiceAgent_entity_1.VoiceAgent.findOne({ where: { tenant_id: tenantId, status: true } });
            }
            if (!agent)
                throw new common_1.NotFoundException(`No active Voice Agent found for tenant ${tenantId}`);
        }
        const provider = this.factory.getProvider(agent.provider);
        const config = await VoiceProviderConfig_entity_1.VoiceProviderConfig.findOne({
            where: { tenant_id: tenantId, provider: agent.provider, is_active: true },
        });
        let leadRec = dto.lead_id ? await lead_1.lead.findOne({ where: { id: dto.lead_id } }) : null;
        const cleanPhoneForLead = (dto.phone_number || "").replace(/\D/g, "").slice(-10);
        if (!leadRec && cleanPhoneForLead.length >= 8) {
            leadRec = await lead_1.lead.findOne({
                where: { phone: (0, typeorm_1.Like)(`%${cleanPhoneForLead}`) },
                order: { created_on: "DESC" },
            });
            if (!leadRec) {
                leadRec = new lead_1.lead();
                leadRec.tenant_id = tenantId;
                leadRec.name = dto.customer_name || "Voice Lead";
                leadRec.phone = dto.phone_number;
                leadRec.source = "voice";
                leadRec.lead_status = "new";
                leadRec.created_by_id = "voice_dispatch";
                leadRec.created_on = new Date();
                await leadRec.save();
            }
        }
        const dynamicVariables = Object.assign({ customer_name: dto.customer_name || (leadRec === null || leadRec === void 0 ? void 0 : leadRec.name) || "Customer", customer_email: (leadRec === null || leadRec === void 0 ? void 0 : leadRec.email) || "", email: (leadRec === null || leadRec === void 0 ? void 0 : leadRec.email) || "", phone_number: dto.phone_number, lead_status: (leadRec === null || leadRec === void 0 ? void 0 : leadRec.lead_status) || "new", lead_source: (leadRec === null || leadRec === void 0 ? void 0 : leadRec.source) || "voice", company_name: (leadRec === null || leadRec === void 0 ? void 0 : leadRec.company_name) || "", applied_role: (leadRec === null || leadRec === void 0 ? void 0 : leadRec.job_title) || "", experience: (leadRec === null || leadRec === void 0 ? void 0 : leadRec.total_experience) ? `${leadRec.total_experience} years` : "", meeting_slot: (leadRec === null || leadRec === void 0 ? void 0 : leadRec.preferred_interview_slot) || "your upcoming session", meet_url: (leadRec === null || leadRec === void 0 ? void 0 : leadRec.interview_link) || "", current_date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }), current_time: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }), agent_name: agent.name }, (dto.custom_variables || {}));
        let promptTemplate = dynamicVariables.system_prompt || agent.system_prompt;
        if (!dynamicVariables.force_override &&
            (dynamicVariables.chat_summary || dynamicVariables.email_summary || dynamicVariables.meet_url || dynamicVariables.applied_role)) {
            const summaryBlock = [
                `Customer Name: ${dynamicVariables.customer_name}`,
                dynamicVariables.company_name ? `Company: ${dynamicVariables.company_name}` : "",
                dynamicVariables.applied_role ? `Applied Role: ${dynamicVariables.applied_role}` : "",
                dynamicVariables.experience ? `Experience: ${dynamicVariables.experience}` : "",
                dynamicVariables.meeting_slot && dynamicVariables.meeting_slot !== "your upcoming session"
                    ? `Scheduled Slot: ${dynamicVariables.meeting_slot}`
                    : "",
                dynamicVariables.meet_url ? `Google Meet Link Sent: ${dynamicVariables.meet_url}` : "",
                dynamicVariables.chat_summary ? `WhatsApp Summary:\n${dynamicVariables.chat_summary}` : "",
                dynamicVariables.email_summary ? `Email Summary:\n${dynamicVariables.email_summary}` : "",
            ]
                .filter(Boolean)
                .join("\n");
            promptTemplate = `${promptTemplate || ""}\n\n# CUSTOMER & OMNICHANNEL SUMMARY:\n${summaryBlock}`;
            dynamicVariables.force_override = true;
        }
        const interpolatedSystemPrompt = this.interpolatePrompt(promptTemplate, dynamicVariables);
        dynamicVariables.system_prompt = interpolatedSystemPrompt;
        const interpolatedGreeting = this.interpolatePrompt(dynamicVariables.first_message || agent.first_message || "Hello! How can I assist you today?", dynamicVariables);
        dynamicVariables.first_message = interpolatedGreeting;
        dto.custom_variables = dynamicVariables;
        let res;
        try {
            try {
                res = await provider.makeCall(agent.remote_agent_id, dto, config || undefined);
            }
            catch (err) {
                if (agent.provider !== "saas_fallback") {
                    const fallbackConfig = await VoiceProviderConfig_entity_1.VoiceProviderConfig.findOne({
                        where: { tenant_id: tenantId, provider: "saas_fallback", is_active: true },
                    });
                    if (fallbackConfig && fallbackConfig.is_active) {
                        this.logger.warn(`Primary voice provider ${agent.provider} failed: ${err.message}. Attempting SaaS Fallback...`);
                        const fallbackProvider = this.factory.getProvider("saas_fallback");
                        res = await fallbackProvider.makeCall(agent.remote_agent_id, dto, fallbackConfig);
                    }
                    else {
                        throw err;
                    }
                }
                else {
                    const vapiConfig = await VoiceProviderConfig_entity_1.VoiceProviderConfig.findOne({
                        where: { tenant_id: tenantId, provider: "vapi", is_active: true },
                    });
                    if (vapiConfig && vapiConfig.api_key && vapiConfig.api_key.trim().length > 0) {
                        this.logger.warn(`SaaS Telephony call failed: ${err.message}. Attempting Vapi fallback...`);
                        const vapiProvider = this.factory.getProvider("vapi");
                        res = await vapiProvider.makeCall(agent.remote_agent_id, dto, vapiConfig);
                    }
                    else {
                        throw err;
                    }
                }
            }
        }
        catch (dispatchErr) {
            try {
                const failedCallLog = new VoiceCallLog_entity_1.VoiceCallLog();
                failedCallLog.tenant_id = tenantId;
                failedCallLog.agent_id = agent.id;
                failedCallLog.agent_name = agent.name;
                failedCallLog.provider = agent.provider;
                failedCallLog.provider_call_id = `failed_${Date.now()}`;
                failedCallLog.customer_phone = dto.phone_number;
                failedCallLog.customer_name = dto.customer_name || (leadRec === null || leadRec === void 0 ? void 0 : leadRec.name) || "Customer";
                failedCallLog.lead_id = leadRec === null || leadRec === void 0 ? void 0 : leadRec.id;
                failedCallLog.direction = "outbound";
                failedCallLog.call_status = "failed";
                failedCallLog.summary = dispatchErr.message || "Outbound call failed";
                failedCallLog.extracted_slots = dynamicVariables;
                failedCallLog.created_by_id = "voice_call_service";
                failedCallLog.created_on = new Date();
                await failedCallLog.save();
            }
            catch (logErr) {
                this.logger.error(`Failed to record failed call log: ${logErr.message}`);
            }
            throw dispatchErr;
        }
        const callLog = new VoiceCallLog_entity_1.VoiceCallLog();
        callLog.tenant_id = tenantId;
        callLog.agent_id = agent.id;
        callLog.agent_name = agent.name;
        callLog.provider = agent.provider;
        callLog.provider_call_id = res.callId;
        callLog.customer_phone = dto.phone_number;
        callLog.customer_name = dto.customer_name || (leadRec === null || leadRec === void 0 ? void 0 : leadRec.name) || "Customer";
        callLog.lead_id = leadRec === null || leadRec === void 0 ? void 0 : leadRec.id;
        callLog.direction = "outbound";
        callLog.call_status = res.status || "initiated";
        callLog.extracted_slots = dynamicVariables;
        callLog.created_by_id = "voice_call_service";
        callLog.created_on = new Date();
        await callLog.save();
        if (leadRec) {
            const callReason = dynamicVariables.reason || `Outbound call via ${agent.name}`;
            const activity = new lead_activity_1.lead_activity();
            activity.lead_id = leadRec.id;
            activity.tenant_id = tenantId;
            activity.activity_type = "CALL";
            activity.title = `📞 Outbound Call Initiated: ${agent.name} (${agent.provider.toUpperCase()})`;
            activity.description = `Provider: ${agent.provider.toUpperCase()} | Agent: ${agent.name} | Call ID: ${res.callId}`;
            activity.metadata = {
                call_id: res.callId,
                provider: agent.provider,
                agent_name: agent.name,
                reason: callReason,
            };
            activity.performer_name = `${agent.name} (${agent.provider.toUpperCase()})`;
            activity.created_by_id = "voice_service";
            activity.created_on = new Date();
            await activity.save().catch(() => null);
            try {
                leadRec.custom_fields = Object.assign(Object.assign({}, (leadRec.custom_fields || {})), { last_voice_call: {
                        call_id: res.callId,
                        provider: agent.provider,
                        agent_name: agent.name,
                        status: res.status || "initiated",
                        outcome: "Call In Progress",
                        summary: `Dialing via ${agent.name}...`,
                        recording_url: null,
                        transcript: null,
                        duration_seconds: 0,
                        scheduled_type: dynamicVariables.scheduled_type || "outbound",
                        reason: callReason,
                        meeting_slot: dynamicVariables.meeting_slot || null,
                        meet_url: dynamicVariables.meet_url || null,
                        timestamp: new Date().toISOString(),
                    } });
                leadRec.updated_on = new Date();
                await leadRec.save().catch(() => null);
            }
            catch (saveLeadErr) {
                this.logger.warn(`Could not update lead custom_fields: ${saveLeadErr.message}`);
            }
        }
        if (agent.provider === "vapi" && res.callId && !res.callId.startsWith("vapi_call_")) {
            this.pollVapiCallCompletion(res.callId, tenantId).catch(() => null);
        }
        this.logger.log(`📞 [CALL INITIATED] ${dto.phone_number} via ${agent.provider} (Log ID: ${callLog.id})`);
        return callLog;
    }
    async pollVapiCallCompletion(callId, tenantId = "default") {
        const config = await VoiceProviderConfig_entity_1.VoiceProviderConfig.findOne({
            where: { tenant_id: tenantId, provider: "vapi", is_active: true },
        });
        const apiKey = ((config === null || config === void 0 ? void 0 : config.api_key) || process.env.VAPI_API_KEY || "").trim();
        for (let attempt = 1; attempt <= 30; attempt++) {
            await new Promise((r) => setTimeout(r, 6000));
            try {
                if (apiKey) {
                    const res = await axios_1.default.get(`https://api.vapi.ai/call/${callId}`, {
                        headers: { Authorization: `Bearer ${apiKey}` },
                        timeout: 8000,
                    });
                    const rc = res.data;
                    if (rc && rc.status === "ended") {
                        await this.syncCallLogsFromVapi(tenantId, true);
                        const log = await VoiceCallLog_entity_1.VoiceCallLog.findOne({ where: { provider_call_id: callId } });
                        if (log) {
                            this.logger.log(`✅ [AUTO-POLL COMPLETE] Call ${callId} finished with outcome: ${log.call_outcome}`);
                            const analyzed = this.analyzeCallTranscript(log.transcript, log.summary, log.call_outcome);
                            await this.syncCallOutcomeToLeadAndTriggerAutomation(log, analyzed.eventName, true);
                        }
                        break;
                    }
                }
                else {
                    await this.syncCallLogsFromVapi(tenantId, true);
                    const log = await VoiceCallLog_entity_1.VoiceCallLog.findOne({ where: { provider_call_id: callId } });
                    if (log && log.call_status === "completed" && (log.transcript || log.recording_url)) {
                        this.logger.log(`✅ [AUTO-POLL COMPLETE] Call ${callId} finished with outcome: ${log.call_outcome}`);
                        const analyzed = this.analyzeCallTranscript(log.transcript, log.summary, log.call_outcome);
                        await this.syncCallOutcomeToLeadAndTriggerAutomation(log, analyzed.eventName, true);
                        break;
                    }
                }
            }
            catch (_a) {
            }
        }
    }
    analyzeCallTranscript(transcript, rawSummary, structuredOutcome) {
        const cleanTranscript = (transcript || "").trim();
        const lines = cleanTranscript
            .split(/\r?\n/)
            .map((l) => l.trim())
            .filter(Boolean);
        const userLines = lines
            .filter((l) => /^(user|customer|caller|human)\s*:/i.test(l))
            .map((l) => l.replace(/^(user|customer|caller|human)\s*:\s*/i, "").trim());
        const aiLines = lines
            .filter((l) => /^(ai|assistant|bot|agent)\s*:/i.test(l))
            .map((l) => l.replace(/^(ai|assistant|bot|agent)\s*:\s*/i, "").trim());
        const customerText = userLines.join(" ").toLowerCase();
        const fullText = `${customerText} ${(rawSummary || "").toLowerCase()}`;
        let outcome = structuredOutcome || "";
        let eventName = "call_completed";
        const aiText = aiLines.join(" ").toLowerCase();
        if (/\b(price|pricing|quotation|quote|cost|plan|package|charges|rate|budget|how much|fee|fees|estimate|proposal|subscription|monthly|starter|growth|enterprise|email automation details|service details|what are the services)\b/i.test(customerText) ||
            /\b(price|pricing|quotation|quote|cost estimate|five thousand rupees|fifteen thousand rupees|eighteen thousand rupees|starter plan|growth plan|send_quotation)\b/i.test(`${rawSummary || ""} ${aiText}`)) {
            outcome = "Pricing & Quotation Requested";
            eventName = "quotation_requested";
        }
        else if (/\b(not interested|no thanks|don't want|stop calling|wrong number|busy right now)\b/i.test(customerText)) {
            outcome = "Not Interested";
            eventName = "not_interested";
        }
        else if (/\b(placement|interview|job|position|candidate|hiring|resume|ctc|career|vacancy|fresher|internship|opening|recruitment|recruiter)\b/i.test(customerText) ||
            /\b(placement|interview|job|position|candidate|hiring|resume|ctc|career|vacancy|fresher|internship|recruitment)\b/i.test(rawSummary || "")) {
            outcome = /\b(placement)\b/i.test(`${customerText} ${rawSummary || ""}`)
                ? "Placement & Interview Inquiry"
                : "Interview Scheduled";
            eventName = "interview_booked";
        }
        else if (/\b(appointment|book|schedule|doctor|visit|slot|tomorrow|morning|afternoon|monday|tuesday|wednesday|thursday|friday|saturday|10:00|11:00|2:00|3:00|4:00|5:00|available at the time)\b/i.test(customerText) ||
            /\b(looking forward to speaking with you on|confirmed your appointment|booked your demo|scheduled your session)\b/i.test(aiText)) {
            outcome = "Appointment Scheduled";
            eventName = "appointment_booked";
        }
        else if (/\b(demo|walkthrough|presentation|show me|google meet|gmail link|meet link|meeting)\b/i.test(customerText)) {
            outcome = "Demo Booked";
            eventName = "appointment_booked";
        }
        else if (/\b(whatsapp|send me|send details|share details|anupunga|brochure|catalog|course details|service details)\b/i.test(customerText) ||
            /\b(send.*whatsapp|share.*whatsapp)\b/i.test(aiText)) {
            outcome = "WhatsApp Details Requested";
            eventName = "quotation_requested";
        }
        else if (/\b(call back|callback|call me later|another time)\b/i.test(customerText)) {
            outcome = "Callback Requested";
            eventName = "callback_requested";
        }
        else if (/\b(service|services|details|interested|tell me|help|order|need|want)\b/i.test(customerText)) {
            outcome = "Interested - Info Requested";
            eventName = "lead_qualified";
        }
        else if (userLines.length > 0) {
            outcome = outcome || "Interested";
            eventName = "lead_qualified";
        }
        else if (fullText.includes("pricing") || fullText.includes("quotation")) {
            outcome = "Pricing & Quotation Requested";
            eventName = "quotation_requested";
        }
        else {
            outcome = outcome || "Call Completed";
            eventName = "call_completed";
        }
        const isTechnicalReason = !rawSummary ||
            /^(assistant-not-found|customer-ended-call|assistant-ended-call|silence-timed-out|Call completed|exceeded-max-duration)$/i.test(rawSummary.trim());
        let summary = !isTechnicalReason ? rawSummary.trim() : "";
        if (!summary) {
            if (userLines.length > 0) {
                const customerAsked = userLines.slice(0, 3).join(" | ");
                const aiReplied = aiLines.length > 1 ? aiLines[aiLines.length - 1] : aiLines[0] || "";
                summary = `Customer inquired: "${customerAsked.slice(0, 220)}"${aiReplied ? ` — AI Response: "${aiReplied.slice(0, 140)}"` : ""} (Outcome: ${outcome})`;
            }
            else if (aiLines.length > 0) {
                summary = `AI greeted customer ("${aiLines[0].slice(0, 140)}"). Customer did not respond during the call.`;
            }
            else {
                summary = `Outbound AI voice call completed (${outcome}).`;
            }
        }
        return { outcome, eventName, summary };
    }
    async handleWebhook(providerName, payload) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
        const provider = this.factory.getProvider(providerName);
        const normalized = provider.normalizeWebhook(payload);
        this.logger.log(`📡 [VOICE WEBHOOK RECEIVED] ${providerName} Call ${normalized.providerCallId} -> ${normalized.status}`);
        let callLog = await VoiceCallLog_entity_1.VoiceCallLog.findOne({
            where: { provider_call_id: normalized.providerCallId },
        });
        if (!callLog && normalized.providerCallId) {
            callLog = new VoiceCallLog_entity_1.VoiceCallLog();
            callLog.provider = providerName;
            callLog.provider_call_id = normalized.providerCallId;
            callLog.customer_phone =
                ((_b = (_a = payload === null || payload === void 0 ? void 0 : payload.call) === null || _a === void 0 ? void 0 : _a.customer) === null || _b === void 0 ? void 0 : _b.number) ||
                    ((_e = (_d = (_c = payload === null || payload === void 0 ? void 0 : payload.message) === null || _c === void 0 ? void 0 : _c.call) === null || _d === void 0 ? void 0 : _d.customer) === null || _e === void 0 ? void 0 : _e.number) ||
                    ((_f = payload === null || payload === void 0 ? void 0 : payload.customer) === null || _f === void 0 ? void 0 : _f.number) ||
                    (payload === null || payload === void 0 ? void 0 : payload.to_number) ||
                    (payload === null || payload === void 0 ? void 0 : payload.phone_number) ||
                    "unknown";
            callLog.customer_name =
                ((_h = (_g = payload === null || payload === void 0 ? void 0 : payload.call) === null || _g === void 0 ? void 0 : _g.customer) === null || _h === void 0 ? void 0 : _h.name) ||
                    ((_l = (_k = (_j = payload === null || payload === void 0 ? void 0 : payload.message) === null || _j === void 0 ? void 0 : _j.call) === null || _k === void 0 ? void 0 : _k.customer) === null || _l === void 0 ? void 0 : _l.name) ||
                    ((_m = payload === null || payload === void 0 ? void 0 : payload.customer) === null || _m === void 0 ? void 0 : _m.name) ||
                    "Customer";
            callLog.created_by_id = "voice_webhook";
            callLog.created_on = new Date();
        }
        if (callLog) {
            callLog.call_status = normalized.status || callLog.call_status;
            if (normalized.durationSeconds)
                callLog.duration_seconds = normalized.durationSeconds;
            if (normalized.transcript)
                callLog.transcript = normalized.transcript;
            if (normalized.recordingUrl)
                callLog.recording_url = normalized.recordingUrl;
            if (normalized.extractedSlots) {
                callLog.extracted_slots = Object.assign(Object.assign({}, (callLog.extracted_slots || {})), normalized.extractedSlots);
            }
            callLog.raw_webhook_payload = payload;
            const analyzed = this.analyzeCallTranscript(callLog.transcript, normalized.summary || callLog.summary, normalized.outcome);
            callLog.call_outcome = analyzed.outcome;
            callLog.summary = analyzed.summary;
            callLog.updated_on = new Date();
            await callLog.save();
            await this.syncCallOutcomeToLeadAndTriggerAutomation(callLog, analyzed.eventName);
            this.forwardWebhookToExternal(callLog).catch((err) => this.logger.warn(`External webhook dispatch error: ${err.message}`));
        }
        return normalized;
    }
    async syncCallOutcomeToLeadAndTriggerAutomation(callLog, eventName, allowTrigger = true) {
        var _a, _b, _c, _d, _e;
        if (callLog.call_status !== "completed")
            return;
        const cleanPhone = (callLog.customer_phone || "").replace(/\D/g, "").slice(-10);
        let matchedLead = null;
        try {
            if (callLog.lead_id) {
                matchedLead = await lead_1.lead.findOne({ where: { id: callLog.lead_id } });
            }
            if (!matchedLead && cleanPhone.length >= 8) {
                matchedLead = await lead_1.lead.findOne({
                    where: { phone: (0, typeorm_1.Like)(`%${cleanPhone}`) },
                    order: { created_on: "DESC" },
                });
            }
        }
        catch (_f) { }
        const isMeetingOutcome = eventName === "appointment_booked" ||
            eventName === "interview_booked" ||
            /appointment|demo|interview|scheduled|booked/i.test(callLog.call_outcome || "");
        const slots = callLog.extracted_slots || {};
        const slug = `${((matchedLead === null || matchedLead === void 0 ? void 0 : matchedLead.id) || callLog.id || "shx").slice(0, 3)}-${Math.random().toString(36).slice(2, 6)}-${Math.random().toString(36).slice(2, 5)}`;
        const meetUrl = isMeetingOutcome
            ? slots.meet_url || slots.google_meet_url || (matchedLead === null || matchedLead === void 0 ? void 0 : matchedLead.interview_link) || `https://meet.google.com/${slug}`
            : undefined;
        const isPlacementOrCandidateCall = eventName === "interview_booked" ||
            /\b(placement|interview|job|position|candidate|hiring|resume|ctc|career|vacancy|fresher|internship|recruitment|talent acquisition)\b/i.test(`${callLog.call_outcome || ""} ${callLog.summary || ""} ${callLog.transcript || ""} ${callLog.agent_name || ""}`);
        if (!matchedLead && isPlacementOrCandidateCall && cleanPhone.length >= 8) {
            try {
                const newCand = new lead_1.lead();
                newCand.tenant_id = callLog.tenant_id || "default";
                newCand.name = callLog.customer_name && callLog.customer_name !== "Customer" ? callLog.customer_name : `Candidate ${cleanPhone.slice(-4)}`;
                newCand.phone = callLog.customer_phone;
                newCand.source = "VOICE_AI";
                newCand.lead_status = "CONTACTED";
                newCand.is_candidate = true;
                newCand.candidate_stage = "screening";
                newCand.job_title = slots.job_title || slots.role || "Placement / Open Role";
                newCand.created_by_id = "00000000-0000-0000-0000-000000000001";
                newCand.created_on = new Date();
                matchedLead = await newCand.save();
                this.logger.log(`🎓 Created new Candidate record from Placement/Recruitment Voice Call: ${matchedLead.name} (${matchedLead.phone})`);
            }
            catch (_g) { }
        }
        if (matchedLead) {
            try {
                if (!callLog.lead_id) {
                    callLog.lead_id = matchedLead.id;
                    await callLog.save().catch(() => null);
                }
                if (isPlacementOrCandidateCall) {
                    matchedLead.is_candidate = true;
                    if (!matchedLead.candidate_stage || matchedLead.candidate_stage === "new") {
                        matchedLead.candidate_stage = isMeetingOutcome ? "scheduled" : "screening";
                    }
                    if (!matchedLead.job_title) {
                        matchedLead.job_title = slots.job_title || slots.role || "Placement Candidate";
                    }
                }
                const prevCall = ((_a = matchedLead.custom_fields) === null || _a === void 0 ? void 0 : _a.last_voice_call) || {};
                const callHistory = Array.isArray((_b = matchedLead.custom_fields) === null || _b === void 0 ? void 0 : _b.call_history)
                    ? matchedLead.custom_fields.call_history
                    : [];
                const currentCallRecord = {
                    call_id: callLog.provider_call_id,
                    provider: callLog.provider,
                    agent_name: callLog.agent_name || prevCall.agent_name || "Talent Acquisition (Maya)",
                    status: callLog.call_status,
                    outcome: callLog.call_outcome || "Call Completed",
                    summary: callLog.summary || "",
                    recording_url: callLog.recording_url || prevCall.recording_url || null,
                    transcript: callLog.transcript || prevCall.transcript || null,
                    duration_seconds: callLog.duration_seconds || 0,
                    scheduled_type: isMeetingOutcome
                        ? /interview/i.test(callLog.call_outcome || "")
                            ? "interview"
                            : "demo"
                        : "inquiry",
                    meet_url: meetUrl || prevCall.meet_url || null,
                    timestamp: (callLog.created_on || new Date()).toISOString(),
                };
                const existingHistIdx = callHistory.findIndex((h) => h.call_id === callLog.provider_call_id);
                if (existingHistIdx >= 0) {
                    callHistory[existingHistIdx] = currentCallRecord;
                }
                else {
                    callHistory.unshift(currentCallRecord);
                }
                matchedLead.custom_fields = Object.assign(Object.assign({}, (matchedLead.custom_fields || {})), { last_voice_call: currentCallRecord, call_history: callHistory.slice(0, 10), candidate_summary: callLog.summary
                        ? `Candidate discussed: ${callLog.summary}`
                        : ((_c = matchedLead.custom_fields) === null || _c === void 0 ? void 0 : _c.candidate_summary) || undefined });
                if (meetUrl && !matchedLead.interview_link) {
                    matchedLead.interview_link = meetUrl;
                }
                if (callLog.call_outcome && callLog.call_outcome !== "Not Interested" && matchedLead.lead_status === "NEW") {
                    matchedLead.lead_status = "CONTACTED";
                }
                matchedLead.last_contacted_at = new Date();
                matchedLead.updated_on = new Date();
                await matchedLead.save();
                const existingAct = await lead_activity_1.lead_activity.findOne({
                    where: { lead_id: matchedLead.id, activity_type: "CALL_COMPLETED" },
                    order: { created_on: "DESC" },
                });
                if (!existingAct || ((_d = existingAct.metadata) === null || _d === void 0 ? void 0 : _d.call_id) !== callLog.provider_call_id) {
                    const act = new lead_activity_1.lead_activity();
                    act.lead_id = matchedLead.id;
                    act.tenant_id = callLog.tenant_id || "default";
                    act.activity_type = "CALL_COMPLETED";
                    act.title = `🎯 Call Outcome: ${callLog.call_outcome} (${callLog.agent_name || "Voice AI"})`;
                    act.description = `${callLog.summary || "Call completed."}${callLog.recording_url ? `\n🎧 Recording: ${callLog.recording_url}` : ""}`;
                    act.metadata = {
                        call_id: callLog.provider_call_id,
                        outcome: callLog.call_outcome,
                        summary: callLog.summary,
                        recording_url: callLog.recording_url,
                        duration_seconds: callLog.duration_seconds,
                        meet_url: meetUrl,
                    };
                    act.performer_name = callLog.agent_name || "Voice AI";
                    act.created_by_id = "voice_service";
                    act.created_on = new Date();
                    await act.save().catch(() => null);
                }
            }
            catch (leadErr) {
                this.logger.warn(`Failed to update lead with completed call outcome: ${leadErr.message}`);
            }
        }
        const isActionableOutcome = callLog.call_outcome &&
            callLog.call_outcome !== "Call Completed" &&
            callLog.call_outcome !== "Not Interested" &&
            (callLog.duration_seconds || 0) > 3 &&
            Boolean(callLog.transcript && callLog.transcript.trim().length > 10);
        if (isActionableOutcome || isMeetingOutcome) {
            const waTemplateName = isMeetingOutcome
                ? /interview|placement/i.test(callLog.call_outcome || "")
                    ? "interview_scheduled_confirmation"
                    : "meeting_scheduled_confirmation"
                : "quotation_dispatch";
            const leadNameForWa = (matchedLead === null || matchedLead === void 0 ? void 0 : matchedLead.name) || callLog.customer_name || "Customer";
            const waPreviewBody = isMeetingOutcome
                ? `Hello ${leadNameForWa}! 👋 Your *${callLog.call_outcome}* with *${callLog.agent_name || "Sharyx AI"}* is confirmed.\n🔗 Google Meet Link: ${meetUrl}\n📝 Summary: ${callLog.summary || "Scheduled session confirmed."}`
                : `Hello ${leadNameForWa}! 👋 Thank you for speaking with *${callLog.agent_name || "Sharyx AI"}*. Here are the *${callLog.call_outcome}* details requested on WhatsApp:\n• Starter AI Plan: ₹15,000/month\n• Growth Omnichannel Plan: ₹18,000/month\n📝 Summary: ${callLog.summary || ""}`;
            callLog.extracted_slots = Object.assign(Object.assign(Object.assign(Object.assign({}, slots), { lead_synced: true, detected_event: eventName }), (meetUrl ? { meet_url: meetUrl } : {})), { whatsapp_dispatch: {
                    template_name: waTemplateName,
                    recipient_phone: callLog.customer_phone,
                    outcome: callLog.call_outcome,
                    meet_url: meetUrl || null,
                    message_body: waPreviewBody,
                    payload: {
                        messaging_product: "whatsapp",
                        to: (callLog.customer_phone || "").replace(/\D/g, ""),
                        type: "template",
                        template: {
                            name: waTemplateName,
                            language: { code: "en_US" },
                        },
                    },
                    dispatched_at: ((_e = slots.whatsapp_dispatch) === null || _e === void 0 ? void 0 : _e.dispatched_at) || new Date().toISOString(),
                } });
            await callLog.save().catch(() => null);
        }
        else if (!slots.lead_synced) {
            callLog.extracted_slots = Object.assign(Object.assign({}, slots), { lead_synced: true });
            await callLog.save().catch(() => null);
        }
        if (allowTrigger && isActionableOutcome && !slots.outcome_dispatched) {
            callLog.extracted_slots = Object.assign(Object.assign({}, (callLog.extracted_slots || {})), { outcome_dispatched: true });
            await callLog.save().catch(() => null);
            this.logger.log(`🎯 [VOICE OUTCOME ATTAINED] "${callLog.call_outcome}" (Event: ${eventName}) for ${callLog.customer_phone}`);
            this.events.emit(AgentTools_service_1.AGENT_OUTCOME_EVENT, {
                tenantId: callLog.tenant_id || "default",
                channel: "voice",
                outcome: callLog.call_outcome || "Call Completed",
                event: eventName,
                phone: callLog.customer_phone,
                email: (matchedLead === null || matchedLead === void 0 ? void 0 : matchedLead.email) || slots.customer_email,
                leadName: (matchedLead === null || matchedLead === void 0 ? void 0 : matchedLead.name) || callLog.customer_name,
                summary: callLog.summary,
                agentName: callLog.agent_name || "Voice Agent",
                meetUrl: meetUrl,
                dealValue: Number(matchedLead === null || matchedLead === void 0 ? void 0 : matchedLead.deal_value) || slots.deal_value || 15000,
                currency: (matchedLead === null || matchedLead === void 0 ? void 0 : matchedLead.currency) || slots.currency || "INR",
            });
            this.events.emit("voice.call.outcome", {
                tenantId: callLog.tenant_id || "default",
                outcome: callLog.call_outcome,
                durationSeconds: callLog.duration_seconds || 0,
                phone: callLog.customer_phone,
                leadId: (matchedLead === null || matchedLead === void 0 ? void 0 : matchedLead.id) || callLog.lead_id,
                leadName: (matchedLead === null || matchedLead === void 0 ? void 0 : matchedLead.name) || callLog.customer_name,
                callSummary: callLog.summary,
                goalAchieved: callLog.call_outcome !== "Not Interested",
            });
        }
    }
    async forwardWebhookToExternal(callLog) {
        var _a;
        const config = await VoiceProviderConfig_entity_1.VoiceProviderConfig.findOne({
            where: { tenant_id: callLog.tenant_id, provider: callLog.provider },
        });
        const forwardUrl = (_a = config === null || config === void 0 ? void 0 : config.metadata) === null || _a === void 0 ? void 0 : _a.webhook_forward_url;
        if (!forwardUrl)
            return;
        try {
            this.logger.log(`🚀 [FORWARDING VOICE LOG] Sending call ${callLog.provider_call_id} to external URL: ${forwardUrl}`);
            await axios_1.default.post(forwardUrl, {
                event: "voice_call.completed",
                timestamp: new Date().toISOString(),
                provider: callLog.provider,
                call_id: callLog.provider_call_id,
                customer_phone: callLog.customer_phone,
                customer_name: callLog.customer_name,
                duration_seconds: callLog.duration_seconds,
                status: callLog.call_status,
                transcript: callLog.transcript,
                summary: callLog.summary,
                recording_url: callLog.recording_url,
                outcome: callLog.call_outcome,
                extracted_slots: callLog.extracted_slots,
            }, { timeout: 8000 });
        }
        catch (err) {
            this.logger.warn(`Failed to forward call log to ${forwardUrl}: ${err.message}`);
        }
    }
    async getCallLogs(tenantId = "default", limit = 50, agentId, skipSync = false) {
        if (!skipSync) {
            this.syncCallLogsFromVapi(tenantId).catch((e) => this.logger.warn(`Auto-sync call logs from Vapi failed: ${e.message}`));
        }
        const isAll = tenantId === "all" || !tenantId;
        const isDefaultOrSharyx = tenantId === "default" || tenantId === "646b4abe-e6de-401b-ba33-46884bf3f6e6";
        const qb = VoiceCallLog_entity_1.VoiceCallLog.createQueryBuilder("log")
            .select([
            "log.id",
            "log.status",
            "log.created_on",
            "log.updated_on",
            "log.tenant_id",
            "log.agent_id",
            "log.agent_name",
            "log.provider",
            "log.provider_call_id",
            "log.customer_phone",
            "log.customer_name",
            "log.lead_id",
            "log.direction",
            "log.call_status",
            "log.duration_seconds",
            "log.transcript",
            "log.recording_url",
            "log.summary",
            "log.call_outcome",
            "log.extracted_slots",
        ]);
        if (!isAll) {
            if (isDefaultOrSharyx) {
                qb.where("log.tenant_id IN (:...tenantIds)", {
                    tenantIds: ["646b4abe-e6de-401b-ba33-46884bf3f6e6", "default"],
                });
            }
            else {
                qb.where("log.tenant_id = :tenantId", { tenantId });
            }
        }
        if (agentId) {
            const agent = await VoiceAgent_entity_1.VoiceAgent.findOne({ where: { id: agentId } });
            qb.andWhere("(log.agent_id = :agentId OR log.raw_webhook_payload->>'assistantId' = :remoteId OR log.agent_name = :agentName)", { agentId, remoteId: (agent === null || agent === void 0 ? void 0 : agent.remote_agent_id) || "__none__", agentName: (agent === null || agent === void 0 ? void 0 : agent.name) || "__none__" });
        }
        const rows = await qb.orderBy("log.created_on", "DESC", "NULLS LAST").take(limit).getMany();
        rows.forEach((r) => {
            if (r.extracted_slots && r.extracted_slots.system_prompt) {
                const _a = r.extracted_slots, { system_prompt } = _a, rest = __rest(_a, ["system_prompt"]);
                r.extracted_slots = rest;
            }
        });
        return rows;
    }
    async getCallLogsLegacy(tenantId = "default", limit = 50) {
        try {
            await this.syncCallLogsFromVapi(tenantId);
        }
        catch (e) {
            this.logger.warn(`Auto-sync call logs from Vapi failed: ${e.message}`);
        }
        try {
            await this.syncCallLogsFromSaas(tenantId);
        }
        catch (e) {
            this.logger.warn(`Auto-sync call logs from SaaS failed: ${e.message}`);
        }
        return await VoiceCallLog_entity_1.VoiceCallLog.find({
            where: { tenant_id: tenantId },
            order: { created_on: "DESC" },
            take: limit,
        });
    }
    async syncCallLogsFromVapi(tenantId = "default", force = false) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o;
        if (!force && Date.now() - this.lastVapiSyncTime < 4000) {
            return 0;
        }
        this.lastVapiSyncTime = Date.now();
        const config = await VoiceProviderConfig_entity_1.VoiceProviderConfig.findOne({
            where: { tenant_id: tenantId, provider: "vapi", is_active: true },
        });
        const apiKey = ((config === null || config === void 0 ? void 0 : config.api_key) || process.env.VAPI_API_KEY || "").trim();
        if (!apiKey)
            return 0;
        try {
            const res = await axios_1.default.get("https://api.vapi.ai/call?limit=15", {
                headers: { Authorization: `Bearer ${apiKey}` },
                timeout: 10000,
            });
            if (!Array.isArray(res.data) || res.data.length === 0)
                return 0;
            const vapiAgents = await VoiceAgent_entity_1.VoiceAgent.find({
                where: { tenant_id: tenantId, provider: "vapi" },
            });
            const agentMap = new Map();
            vapiAgents.forEach((a) => {
                if (a.remote_agent_id)
                    agentMap.set(a.remote_agent_id, a);
            });
            const callIds = res.data.map((rc) => rc === null || rc === void 0 ? void 0 : rc.id).filter(Boolean);
            const existingLogs = callIds.length
                ? await VoiceCallLog_entity_1.VoiceCallLog.createQueryBuilder("l")
                    .select([
                    "l.id",
                    "l.status",
                    "l.created_on",
                    "l.tenant_id",
                    "l.agent_id",
                    "l.agent_name",
                    "l.provider",
                    "l.provider_call_id",
                    "l.customer_phone",
                    "l.customer_name",
                    "l.lead_id",
                    "l.direction",
                    "l.call_status",
                    "l.duration_seconds",
                    "l.transcript",
                    "l.recording_url",
                    "l.summary",
                    "l.call_outcome",
                    "l.extracted_slots",
                ])
                    .where("l.provider_call_id IN (:...callIds)", { callIds })
                    .getMany()
                : [];
            const existingMap = new Map();
            existingLogs.forEach((l) => {
                if (l.provider_call_id)
                    existingMap.set(l.provider_call_id, l);
            });
            let synced = 0;
            for (const rc of res.data) {
                const callId = rc.id;
                if (!callId)
                    continue;
                const status = rc.status === "ended" ? "completed" : rc.status || "completed";
                const callEndTime = rc.endedAt ? new Date(rc.endedAt).getTime() : rc.createdAt ? new Date(rc.createdAt).getTime() : 0;
                const isRecentCall = callEndTime > 0 && Date.now() - callEndTime < 20 * 60 * 1000;
                let log = existingMap.get(callId);
                if (log &&
                    log.call_status === "completed" &&
                    log.summary &&
                    (log.recording_url || !(rc.recordingUrl || ((_a = rc.artifact) === null || _a === void 0 ? void 0 : _a.recordingUrl) || ((_b = rc.artifact) === null || _b === void 0 ? void 0 : _b.stereoRecordingUrl))) &&
                    ((_c = log.extracted_slots) === null || _c === void 0 ? void 0 : _c.lead_synced) &&
                    (!isRecentCall || ((_d = log.extracted_slots) === null || _d === void 0 ? void 0 : _d.outcome_dispatched))) {
                    continue;
                }
                const matchedAgent = agentMap.get(rc.assistantId);
                const agentName = matchedAgent ? matchedAgent.name : ((_e = rc.assistant) === null || _e === void 0 ? void 0 : _e.name) || "Vapi Assistant";
                const agentId = matchedAgent ? matchedAgent.id : null;
                let duration = 0;
                if (rc.startedAt && rc.endedAt) {
                    duration = Math.round((new Date(rc.endedAt).getTime() - new Date(rc.startedAt).getTime()) / 1000);
                }
                else if (rc.duration) {
                    duration = Math.round(rc.duration);
                }
                const customerPhone = ((_f = rc.customer) === null || _f === void 0 ? void 0 : _f.number) || "Unknown";
                const customerName = ((_g = rc.customer) === null || _g === void 0 ? void 0 : _g.name) || "Customer";
                if (!log) {
                    log = new VoiceCallLog_entity_1.VoiceCallLog();
                    log.tenant_id = tenantId;
                    log.provider = "vapi";
                    log.provider_call_id = callId;
                    log.created_by_id = "vapi_sync";
                    log.created_on = rc.createdAt ? new Date(rc.createdAt) : new Date();
                    log.direction = (rc.type === "inboundPhoneCall" ? "inbound" : "outbound");
                }
                else if (!log.created_on && rc.createdAt) {
                    log.created_on = new Date(rc.createdAt);
                }
                log.agent_id = agentId || log.agent_id;
                log.agent_name = agentName || log.agent_name;
                log.customer_phone = customerPhone !== "Unknown" ? customerPhone : log.customer_phone;
                log.customer_name = customerName !== "Customer" ? customerName : log.customer_name;
                log.call_status = status;
                log.duration_seconds = duration || log.duration_seconds || 0;
                log.transcript = rc.transcript || ((_h = rc.artifact) === null || _h === void 0 ? void 0 : _h.transcript) || log.transcript || "";
                log.recording_url =
                    rc.recordingUrl ||
                        ((_j = rc.artifact) === null || _j === void 0 ? void 0 : _j.recordingUrl) ||
                        ((_k = rc.artifact) === null || _k === void 0 ? void 0 : _k.stereoRecordingUrl) ||
                        log.recording_url ||
                        "";
                const analyzed = this.analyzeCallTranscript(log.transcript, ((_l = rc.analysis) === null || _l === void 0 ? void 0 : _l.summary) || rc.summary, (_o = (_m = rc.analysis) === null || _m === void 0 ? void 0 : _m.structuredData) === null || _o === void 0 ? void 0 : _o.outcome);
                log.call_outcome = analyzed.outcome;
                log.summary = analyzed.summary;
                log.raw_webhook_payload = {
                    id: rc.id,
                    assistantId: rc.assistantId,
                    status: rc.status,
                    startedAt: rc.startedAt,
                    endedAt: rc.endedAt,
                    endedReason: rc.endedReason,
                    customer: rc.customer,
                    recordingUrl: log.recording_url,
                };
                log.updated_on = new Date();
                try {
                    await log.save();
                    await this.syncCallOutcomeToLeadAndTriggerAutomation(log, analyzed.eventName, isRecentCall);
                    synced++;
                }
                catch (err) {
                    this.logger.warn(`Failed to save Vapi call ${callId}: ${err.message}`);
                }
            }
            if (synced > 0) {
                this.logger.log(`✅ [VAPI CALL SYNC] Synced ${synced} updated/new call logs from Vapi platform`);
            }
            return synced;
        }
        catch (err) {
            this.logger.warn(`Vapi call sync error: ${err.message}`);
            return 0;
        }
    }
    async syncCallLogsFromSaas(tenantId = "default") {
        var _a, _b, _c, _d, _e, _f, _g;
        const config = await VoiceProviderConfig_entity_1.VoiceProviderConfig.findOne({
            where: { tenant_id: tenantId, provider: "saas_fallback" },
        });
        if (!config || !config.api_key) {
            this.logger.debug("[SAAS SYNC] No SaaS config/key found, skipping call log sync");
            return 0;
        }
        const baseUrl = (config.base_url || process.env.VOICE_BACKEND_URL || "https://fallback-voice.sharyx.ai").replace(/\/$/, "");
        const apiKey = config.api_key.trim();
        const endpoints = [
            `${baseUrl}/api/call/list`,
            `${baseUrl}/api/calls`,
            `${baseUrl}/api/agent/calls`,
            `${baseUrl}/api/call-logs`,
        ];
        let remoteCalls = [];
        for (const endpoint of endpoints) {
            try {
                const res = await axios_1.default.get(endpoint, {
                    headers: {
                        Authorization: `Bearer ${apiKey}`,
                        "x-api-key": apiKey,
                        "X-API-Key": apiKey,
                        Cookie: `token=${apiKey}`,
                    },
                    params: { limit: 100, page: 1 },
                    timeout: 10000,
                });
                const list = ((_a = res.data) === null || _a === void 0 ? void 0 : _a.AddtionalData) || ((_b = res.data) === null || _b === void 0 ? void 0 : _b.data) || ((_c = res.data) === null || _c === void 0 ? void 0 : _c.calls) || (Array.isArray(res.data) ? res.data : []);
                if (Array.isArray(list) && list.length >= 0) {
                    remoteCalls = list;
                    this.logger.log(`📥 [SAAS CALL SYNC] Fetched ${list.length} calls from ${endpoint}`);
                    break;
                }
            }
            catch (err) {
                this.logger.debug(`[SAAS CALL SYNC] ${endpoint} failed: ${((_d = err.response) === null || _d === void 0 ? void 0 : _d.status) || err.message}`);
            }
        }
        if (remoteCalls.length === 0) {
            this.logger.debug("[SAAS CALL SYNC] No remote calls found or all endpoints failed");
            return 0;
        }
        let synced = 0;
        for (const rc of remoteCalls) {
            const providerCallId = String(rc.id || rc.call_id || rc.callId || "");
            if (!providerCallId)
                continue;
            let log = await VoiceCallLog_entity_1.VoiceCallLog.findOne({ where: { provider_call_id: providerCallId } });
            if (!log) {
                log = new VoiceCallLog_entity_1.VoiceCallLog();
                log.tenant_id = tenantId;
                log.provider = "saas_fallback";
                log.provider_call_id = providerCallId;
                log.created_by_id = "saas_sync";
                log.created_on = rc.created_at ? new Date(rc.created_at) : new Date();
                log.direction = (rc.direction === "inbound" ? "inbound" : "outbound");
            }
            const statusMap = {
                completed: "completed",
                ended: "completed",
                failed: "failed",
                "no-answer": "no-answer",
                busy: "busy",
                initiated: "initiated",
                ringing: "ringing",
                in_progress: "in-progress",
                in_call: "in-progress",
            };
            const rawStatus = rc.status || rc.call_status || "completed";
            log.call_status = (statusMap[rawStatus.toLowerCase()] || rawStatus);
            log.customer_phone = rc.to_number || rc.phone_number || rc.customer_phone || log.customer_phone || "unknown";
            log.customer_name = rc.customer_name || rc.name || log.customer_name || "SaaS Customer";
            log.agent_name = rc.agent_name || ((_e = rc.agent) === null || _e === void 0 ? void 0 : _e.name) || log.agent_name || "AI Agent";
            if (!log.agent_id && (rc.agent_id || ((_f = rc.agent) === null || _f === void 0 ? void 0 : _f.id))) {
                const matchedAgent = await VoiceAgent_entity_1.VoiceAgent.findOne({
                    where: { tenant_id: tenantId, remote_agent_id: String(rc.agent_id || ((_g = rc.agent) === null || _g === void 0 ? void 0 : _g.id)) },
                });
                if (matchedAgent)
                    log.agent_id = matchedAgent.id;
            }
            if (rc.duration_seconds || rc.duration)
                log.duration_seconds = rc.duration_seconds || rc.duration;
            if (rc.transcript || rc.conversation_text)
                log.transcript = rc.transcript || rc.conversation_text;
            if (rc.recording_url || rc.audio_url)
                log.recording_url = rc.recording_url || rc.audio_url;
            if (rc.summary || rc.call_summary)
                log.summary = rc.summary || rc.call_summary;
            if (rc.outcome)
                log.call_outcome = rc.outcome;
            log.raw_webhook_payload = rc;
            log.updated_on = new Date();
            try {
                await log.save();
                synced++;
            }
            catch (saveErr) {
                this.logger.warn(`[SAAS CALL SYNC] Failed to save call ${providerCallId}: ${saveErr.message}`);
            }
        }
        this.logger.log(`✅ [SAAS CALL SYNC] Synced ${synced} call logs from SaaS platform`);
        return synced;
    }
    async streamCallAudio(callId, providerCallId, tenantId = "default", res) {
        var _a, _b, _c, _d, _e;
        try {
            let callLog = null;
            if (callId) {
                callLog = await VoiceCallLog_entity_1.VoiceCallLog.findOne({ where: { id: callId } });
            }
            if (!callLog && providerCallId) {
                callLog = await VoiceCallLog_entity_1.VoiceCallLog.findOne({ where: { provider_call_id: providerCallId } });
            }
            const pCallId = providerCallId || (callLog === null || callLog === void 0 ? void 0 : callLog.provider_call_id);
            const vapiConfig = await VoiceProviderConfig_entity_1.VoiceProviderConfig.findOne({ where: { provider: "vapi", status: true } });
            const vapiKey = (vapiConfig === null || vapiConfig === void 0 ? void 0 : vapiConfig.api_key) || process.env.VAPI_API_KEY;
            let streamUrl = callLog === null || callLog === void 0 ? void 0 : callLog.recording_url;
            if (pCallId && vapiKey) {
                try {
                    const vapiRes = await axios_1.default.get(`https://api.vapi.ai/call/${pCallId}`, {
                        headers: { Authorization: `Bearer ${vapiKey}` },
                        timeout: 8000,
                    });
                    const freshPresigned = ((_b = (_a = vapiRes.data) === null || _a === void 0 ? void 0 : _a.artifact) === null || _b === void 0 ? void 0 : _b.presignedMonoUrl) ||
                        ((_d = (_c = vapiRes.data) === null || _c === void 0 ? void 0 : _c.artifact) === null || _d === void 0 ? void 0 : _d.presignedStereoUrl) ||
                        ((_e = vapiRes.data) === null || _e === void 0 ? void 0 : _e.recordingUrl);
                    if (freshPresigned) {
                        streamUrl = freshPresigned;
                    }
                }
                catch (vapiErr) {
                    this.logger.debug(`Could not refresh Vapi audio url: ${vapiErr.message}`);
                }
            }
            if (!streamUrl) {
                return res === null || res === void 0 ? void 0 : res.status(404).send("Audio recording URL not found");
            }
            const audioStream = await axios_1.default.get(streamUrl, {
                responseType: "stream",
                timeout: 20000,
            });
            const contentType = audioStream.headers["content-type"] || "audio/wav";
            const contentLength = audioStream.headers["content-length"];
            res.setHeader("Content-Type", contentType);
            if (contentLength)
                res.setHeader("Content-Length", contentLength);
            res.setHeader("Accept-Ranges", "bytes");
            res.setHeader("Cache-Control", "public, max-age=86400");
            return audioStream.data.pipe(res);
        }
        catch (err) {
            this.logger.error(`Failed to stream call audio: ${err.message}`);
            return res === null || res === void 0 ? void 0 : res.status(502).send("Could not stream audio recording");
        }
    }
    async getCallStats(tenantId = "default") {
        const isAll = tenantId === "all" || !tenantId;
        const isDefaultOrSharyx = tenantId === "default" || tenantId === "646b4abe-e6de-401b-ba33-46884bf3f6e6";
        let logs;
        if (isAll) {
            logs = await VoiceCallLog_entity_1.VoiceCallLog.find();
        }
        else if (isDefaultOrSharyx) {
            logs = await VoiceCallLog_entity_1.VoiceCallLog.find({
                where: { tenant_id: (0, typeorm_1.In)(["646b4abe-e6de-401b-ba33-46884bf3f6e6", "default"]) },
            });
        }
        else {
            logs = await VoiceCallLog_entity_1.VoiceCallLog.find({ where: { tenant_id: tenantId } });
        }
        const totalCalls = logs.length;
        const completed = logs.filter((l) => l.call_status === "completed").length;
        const avgDuration = totalCalls > 0 ? Math.round(logs.reduce((acc, l) => acc + (l.duration_seconds || 0), 0) / totalCalls) : 0;
        return {
            totalCalls,
            completedCalls: completed,
            avgDurationSeconds: avgDuration,
            completionRate: totalCalls > 0 ? Math.round((completed / totalCalls) * 100) : 0,
        };
    }
};
exports.VoiceCallService = VoiceCallService;
__decorate([
    (0, event_emitter_1.OnEvent)("voice.call.requested"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], VoiceCallService.prototype, "handleVoiceCallRequest", null);
exports.VoiceCallService = VoiceCallService = VoiceCallService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [VoiceFactory_service_1.VoiceFactoryService,
        event_emitter_1.EventEmitter2,
        AgentLlm_service_1.AgentLlmService])
], VoiceCallService);
//# sourceMappingURL=VoiceCall.service.js.map