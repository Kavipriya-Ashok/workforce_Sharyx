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
const ConversationAgentState_entity_1 = require("../../Database/Table/Agent/ConversationAgentState.entity");
const lead_1 = require("../../Database/Table/Lead/lead");
const lead_activity_1 = require("../../Database/Table/Lead/lead_activity");
const VoiceFactory_service_1 = require("./VoiceFactory.service");
const AgentTools_service_1 = require("../../AgentOrchestrator/Services/AgentTools.service");
let VoiceCallService = VoiceCallService_1 = class VoiceCallService {
    constructor(factory, events) {
        this.factory = factory;
        this.events = events;
        this.logger = new common_1.Logger(VoiceCallService_1.name);
        this.recentCallDispatches = new Map();
    }
    async handleVoiceCallRequest(event) {
        var _a, _b;
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
            agent = await VoiceAgent_entity_1.VoiceAgent.findOne({ where: { id: event.agentId, tenant_id: tenantId } });
            if (!agent) {
                agent = await VoiceAgent_entity_1.VoiceAgent.findOne({ where: { remote_agent_id: event.agentId, tenant_id: tenantId } });
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
        const appliedRole = stateSlots.applied_role ||
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
            ((_a = stateSlots.appointment) === null || _a === void 0 ? void 0 : _a.slot) ||
            (matchedLead === null || matchedLead === void 0 ? void 0 : matchedLead.preferred_interview_slot) ||
            "your upcoming session";
        const meetUrlText = event.meetUrl ||
            ((_b = stateSlots.appointment) === null || _b === void 0 ? void 0 : _b.meet_url) ||
            (matchedLead === null || matchedLead === void 0 ? void 0 : matchedLead.interview_link) ||
            "";
        const scheduledType = isInterview ? "interview" : "demo";
        const defaultReason = isInterview ? "Interview scheduled" : "You scheduled demo";
        const reasonText = event.reason || defaultReason;
        let chatSummary = "";
        try {
            if (cleanPhone) {
                const recentMsgs = await WhatsAppMessage_entity_1.WhatsAppMessage.find({
                    where: [
                        { sender_phone: (0, typeorm_1.Like)(`%${cleanPhone}%`) },
                        { recipient_phone: (0, typeorm_1.Like)(`%${cleanPhone}%`) },
                    ],
                    order: { created_on: "DESC" },
                    take: 10,
                });
                if (recentMsgs && recentMsgs.length > 0) {
                    chatSummary = recentMsgs
                        .reverse()
                        .map((m) => `${m.direction === "inbound" ? "Customer" : "Assistant"}: "${(m.message_text || "").replace(/\n+/g, " ").slice(0, 150)}"`)
                        .join("\n");
                }
            }
        }
        catch (chatErr) {
            this.logger.warn(`Could not load chat history for voice call: ${chatErr.message}`);
        }
        const dynamicFirstMessage = event.firstMessage ||
            (isInterview
                ? `Hi ${customerName}, you just scheduled your interview, right? This is Maya from Sharyx Talent Acquisition following up on our chat! I saw you booked your Google Meet interview for ${slotText}${appliedRole ? ` for the ${appliedRole} role` : ""}. I've got your details and resume right here. I just wanted to confirm your slot and make sure you received the Google Meet link. Are you looking forward to the discussion?`
                : `Hi ${customerName}, you just scheduled a demo, right? This is Alex from Sharyx AI following up on our chat! I saw you booked your live walkthrough for ${slotText}${companyName ? ` for ${companyName}` : ""}. I wanted to confirm your slot and make sure you received the Google Meet link. Do you have any quick questions before our session?`);
        const dynamicSystemPrompt = isInterview
            ? `You are Maya, Senior Talent Acquisition Specialist at Sharyx AI. You are speaking on a live outbound phone call with ${customerName}, following up immediately after their conversation on WhatsApp.

CANDIDATE PROFILE DISCUSSED IN CHAT:
- Candidate Name: ${customerName}
${appliedRole ? `- Target Position: ${appliedRole}` : ""}
${experience ? `- Total Experience: ${experience}` : ""}
${noticePeriod ? `- Notice Period / Availability: ${noticePeriod}` : ""}
${expectedCtc ? `- Expected CTC: ${expectedCtc}` : ""}
${resumeInfo ? `- Resume on File: ${resumeInfo}` : ""}
- Confirmed Google Meet Slot: ${slotText}
- Google Meet URL: ${meetUrlText}

${chatSummary ? `[RECENT WHATSAPP CHAT DISCUSSION WITH THIS CANDIDATE]:\n${chatSummary}\n` : ""}

YOUR CONVERSATION INSTRUCTIONS:
1. GREETING: Speak your first greeting naturally: "Hi ${customerName}, you just scheduled your interview, right? This is Maya from Sharyx Talent Acquisition following up on our chat!"
2. SEAMLESS CHAT CONTINUITY: You already have all the candidate's details from WhatsApp (${appliedRole ? `Role: ${appliedRole}, ` : ""}${experience ? `Experience: ${experience}, ` : ""}Slot: ${slotText}). DO NOT re-ask questions they already answered (like their experience, resume, or CTC). Treat this call as a warm, human confirmation from the hiring team.
3. CONFIRM DETAILS: Reconfirm their Google Meet slot (${slotText}) and confirm they received the Google Meet invitation link (${meetUrlText}).
4. CANDIDATE QUESTIONS: Answer any questions they have about the company (Sharyx builds AI Workforce solutions like voice bots and copilots), the interview structure (30-minute technical & cultural discussion), or preparations.
5. TONE & STYLE: Speak in a warm, friendly, confident human recruiter voice. Keep every response concise (1 to 2 short sentences per turn) so it feels like a real phone conversation. Never sound robotic, never repeat yourself, and never read out long paragraphs.`
            : `You are Alex, Senior Solutions Specialist at Sharyx AI. You are speaking on a live outbound phone call with ${customerName}, following up immediately after their conversation on WhatsApp.

PROSPECT PROFILE DISCUSSED IN CHAT:
- Name: ${customerName}
${companyName ? `- Company: ${companyName}` : ""}
- Confirmed Live Demo Slot: ${slotText}
- Google Meet URL: ${meetUrlText}

${chatSummary ? `[RECENT WHATSAPP CHAT DISCUSSION WITH THIS PROSPECT]:\n${chatSummary}\n` : ""}

YOUR CONVERSATION INSTRUCTIONS:
1. GREETING: Speak your first greeting naturally: "Hi ${customerName}, you just scheduled a demo, right? This is Alex from Sharyx AI following up on our chat!"
2. SEAMLESS CHAT CONTINUITY: You already know who they are and what they booked. Do not ask them generic qualifying questions they already answered in chat.
3. CONFIRM DETAILS: Reconfirm their live product demo walkthrough for ${slotText} and verify they received the Google Meet link (${meetUrlText}).
4. DISCOVERY: Ask if there are specific workflows (Voice AI telephony, WhatsApp copilots, or CRM automation) they want to focus on during the walkthrough.
5. TONE & STYLE: Friendly, consultative, natural human tone. Keep responses short and conversational suitable for a phone call.`;
        const callPayload = Object.assign({ scheduled_type: scheduledType, reason: reasonText, meeting_slot: slotText, meet_url: meetUrlText, customer_name: customerName, first_message: dynamicFirstMessage, system_prompt: dynamicSystemPrompt, event_type: isInterview ? "interview_scheduled" : "demo_scheduled" }, (event.customVariables || {}));
        this.logger.log(`📞 [ROUTED TO VOICE AGENT] Platform: ${agent.provider.toUpperCase()} | Agent: ${agent.name} (${agent.id}) | Reason: "${reasonText}"`);
        await this.dispatchCall({
            agent_id: agent.id,
            phone_number: event.phone,
            customer_name: event.customerName,
            lead_id: event.leadId,
            tenantId: tenantId,
            custom_variables: callPayload,
        }).catch((err) => this.logger.error(`Failed to handle voice.call.requested: ${err.message}`));
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
            agent = await VoiceAgent_entity_1.VoiceAgent.findOne({ where: { id: dto.agent_id, tenant_id: tenantId } });
            if (!agent) {
                agent = await VoiceAgent_entity_1.VoiceAgent.findOne({ where: { remote_agent_id: dto.agent_id, tenant_id: tenantId } });
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
        if (!leadRec && dto.phone_number) {
            const cleanPhone = dto.phone_number.replace(/\D/g, "").slice(-10);
            leadRec = await lead_1.lead.findOne({ where: { phone: cleanPhone, tenant_id: tenantId } });
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
        const dynamicVariables = Object.assign({ customer_name: dto.customer_name || (leadRec === null || leadRec === void 0 ? void 0 : leadRec.name) || "Customer", phone_number: dto.phone_number, lead_status: (leadRec === null || leadRec === void 0 ? void 0 : leadRec.lead_status) || "new", lead_source: (leadRec === null || leadRec === void 0 ? void 0 : leadRec.source) || "voice", current_date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }), current_time: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }), agent_name: agent.name }, (dto.custom_variables || {}));
        const promptTemplate = dynamicVariables.system_prompt || agent.system_prompt;
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
            const callReason = dynamicVariables.reason || (dynamicVariables.scheduled_type === "interview" ? "Interview scheduled" : "You scheduled demo");
            const activity = new lead_activity_1.lead_activity();
            activity.lead_id = leadRec.id;
            activity.tenant_id = tenantId;
            activity.activity_type = "CALL";
            activity.title = `📞 Outbound Call: ${callReason} (${agent.provider.toUpperCase()})`;
            activity.description = `Provider: ${agent.provider.toUpperCase()} | Agent: ${agent.name} | Call ID: ${res.callId} | Slot: ${dynamicVariables.meeting_slot || "Scheduled"}${dynamicVariables.meet_url ? ` | Meet: ${dynamicVariables.meet_url}` : ""}`;
            activity.metadata = {
                call_id: res.callId,
                provider: agent.provider,
                scheduled_type: dynamicVariables.scheduled_type,
                meeting_slot: dynamicVariables.meeting_slot,
                meet_url: dynamicVariables.meet_url,
                reason: callReason,
            };
            activity.performer_name = `Voice AI (${agent.provider.toUpperCase()})`;
            activity.created_by_id = "voice_service";
            activity.created_on = new Date();
            await activity.save().catch(() => null);
            try {
                leadRec.custom_fields = Object.assign(Object.assign({}, (leadRec.custom_fields || {})), { last_voice_call: {
                        call_id: res.callId,
                        provider: agent.provider,
                        status: res.status || "initiated",
                        scheduled_type: dynamicVariables.scheduled_type || "demo",
                        reason: callReason,
                        meeting_slot: dynamicVariables.meeting_slot || null,
                        meet_url: dynamicVariables.meet_url || null,
                        timestamp: new Date().toISOString(),
                    } });
                if (dynamicVariables.meet_url && !leadRec.interview_link) {
                    leadRec.interview_link = dynamicVariables.meet_url;
                }
                leadRec.updated_on = new Date();
                await leadRec.save().catch(() => null);
            }
            catch (saveLeadErr) {
                this.logger.warn(`Could not update lead custom_fields: ${saveLeadErr.message}`);
            }
        }
        this.logger.log(`📞 [CALL INITIATED] ${dto.phone_number} via ${agent.provider} (Log ID: ${callLog.id})`);
        return callLog;
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
            if (normalized.summary)
                callLog.summary = normalized.summary;
            if (normalized.outcome)
                callLog.call_outcome = normalized.outcome;
            if (normalized.extractedSlots) {
                callLog.extracted_slots = Object.assign(Object.assign({}, (callLog.extracted_slots || {})), normalized.extractedSlots);
            }
            callLog.raw_webhook_payload = payload;
            callLog.updated_on = new Date();
            await callLog.save();
            if (normalized.outcome || normalized.summary || normalized.transcript) {
                const text = `${normalized.outcome || ""} ${normalized.summary || ""} ${normalized.transcript || ""}`.toLowerCase();
                const slots = callLog.extracted_slots || {};
                let detectedOutcome = normalized.outcome;
                let eventName = "call_completed";
                if (text.includes("quotation") ||
                    text.includes("quote") ||
                    text.includes("proposal") ||
                    text.includes("pricing") ||
                    text.includes("price list") ||
                    text.includes("cost estimate")) {
                    detectedOutcome = "Quotation Requested";
                    eventName = "quotation_requested";
                }
                else if (text.includes("interview")) {
                    detectedOutcome = "Interview Scheduled";
                    eventName = "interview_booked";
                }
                else if (text.includes("demo") || text.includes("meet") || text.includes("appointment") || text.includes("schedule")) {
                    detectedOutcome = "Demo Booked";
                    eventName = "appointment_booked";
                }
                else if (text.includes("callback") || text.includes("call back") || text.includes("call me later")) {
                    detectedOutcome = "Callback Requested";
                    eventName = "callback_requested";
                }
                else if (text.includes("not interested") || text.includes("uninterested")) {
                    detectedOutcome = "Not Interested";
                    eventName = "not_interested";
                }
                else if (text.includes("interested")) {
                    detectedOutcome = "Interested";
                    eventName = "lead_qualified";
                }
                callLog.call_outcome = detectedOutcome || callLog.call_outcome || "Call Completed";
                await callLog.save();
                const meetUrl = slots.meet_url || slots.google_meet_url || slots.meeting_link || `https://meet.google.com/new`;
                this.logger.log(`🎯 [VOICE OUTCOME ATTAINED] "${detectedOutcome}" (Event: ${eventName}) for ${callLog.customer_phone}`);
                this.events.emit(AgentTools_service_1.AGENT_OUTCOME_EVENT, {
                    tenantId: callLog.tenant_id,
                    channel: "voice",
                    outcome: detectedOutcome,
                    event: eventName,
                    phone: callLog.customer_phone,
                    leadName: callLog.customer_name,
                    summary: normalized.summary,
                    agentName: callLog.agent_name || "Voice Agent",
                    meetUrl: meetUrl,
                    dealValue: slots.deal_value || slots.price || 15000,
                    currency: slots.currency || "INR",
                });
                this.events.emit("voice.call.outcome", {
                    tenantId: callLog.tenant_id,
                    outcome: detectedOutcome,
                    durationSeconds: callLog.duration_seconds || 0,
                    phone: callLog.customer_phone,
                    leadId: callLog.lead_id,
                    leadName: callLog.customer_name,
                    callSummary: normalized.summary,
                    goalAchieved: true,
                });
            }
            this.forwardWebhookToExternal(callLog).catch((err) => this.logger.warn(`External webhook dispatch error: ${err.message}`));
        }
        return normalized;
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
            try {
                await this.syncCallLogsFromVapi(tenantId);
            }
            catch (e) {
                this.logger.warn(`Auto-sync call logs from Vapi failed: ${e.message}`);
            }
        }
        const qb = VoiceCallLog_entity_1.VoiceCallLog.createQueryBuilder("log")
            .addSelect("log.created_on")
            .where("log.tenant_id = :tenantId", { tenantId });
        if (agentId) {
            const agent = await VoiceAgent_entity_1.VoiceAgent.findOne({ where: { id: agentId } });
            qb.andWhere("(log.agent_id = :agentId OR log.raw_webhook_payload->>'assistantId' = :remoteId OR log.agent_name = :agentName)", { agentId, remoteId: (agent === null || agent === void 0 ? void 0 : agent.remote_agent_id) || "__none__", agentName: (agent === null || agent === void 0 ? void 0 : agent.name) || "__none__" });
        }
        return await qb.orderBy("log.created_on", "DESC").take(limit).getMany();
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
    async syncCallLogsFromVapi(tenantId = "default") {
        var _a, _b, _c, _d, _e, _f, _g;
        const config = await VoiceProviderConfig_entity_1.VoiceProviderConfig.findOne({
            where: { tenant_id: tenantId, provider: "vapi", is_active: true },
        });
        const apiKey = ((config === null || config === void 0 ? void 0 : config.api_key) || process.env.VAPI_API_KEY || "").trim();
        if (!apiKey)
            return 0;
        try {
            const res = await axios_1.default.get("https://api.vapi.ai/call?limit=50", {
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
            let synced = 0;
            for (const rc of res.data) {
                const callId = rc.id;
                if (!callId)
                    continue;
                const matchedAgent = agentMap.get(rc.assistantId);
                const agentName = matchedAgent ? matchedAgent.name : ((_a = rc.assistant) === null || _a === void 0 ? void 0 : _a.name) || "Vapi Assistant";
                const agentId = matchedAgent ? matchedAgent.id : null;
                let duration = 0;
                if (rc.startedAt && rc.endedAt) {
                    duration = Math.round((new Date(rc.endedAt).getTime() - new Date(rc.startedAt).getTime()) / 1000);
                }
                else if (rc.duration) {
                    duration = Math.round(rc.duration);
                }
                const customerPhone = ((_b = rc.customer) === null || _b === void 0 ? void 0 : _b.number) || "Unknown";
                const customerName = ((_c = rc.customer) === null || _c === void 0 ? void 0 : _c.name) || "Customer";
                const status = rc.status === "ended" ? "completed" : rc.status || "completed";
                let log = await VoiceCallLog_entity_1.VoiceCallLog.findOne({ where: { provider_call_id: callId } });
                if (!log) {
                    log = new VoiceCallLog_entity_1.VoiceCallLog();
                    log.tenant_id = tenantId;
                    log.provider = "vapi";
                    log.provider_call_id = callId;
                    log.created_by_id = "vapi_sync";
                    log.created_on = rc.createdAt ? new Date(rc.createdAt) : new Date();
                    log.direction = (rc.type === "inboundPhoneCall" ? "inbound" : "outbound");
                }
                log.agent_id = agentId || log.agent_id;
                log.agent_name = agentName || log.agent_name;
                log.customer_phone = customerPhone !== "Unknown" ? customerPhone : log.customer_phone;
                log.customer_name = customerName !== "Customer" ? customerName : log.customer_name;
                log.call_status = status;
                log.duration_seconds = duration || log.duration_seconds || 0;
                log.transcript = rc.transcript || log.transcript || "";
                log.recording_url = rc.recordingUrl || log.recording_url || "";
                log.summary = ((_d = rc.analysis) === null || _d === void 0 ? void 0 : _d.summary) || rc.summary || rc.endedReason || log.summary || "Call completed";
                const combinedText = `${((_e = rc.analysis) === null || _e === void 0 ? void 0 : _e.summary) || ""} ${rc.transcript || ""} ${rc.summary || ""}`.toLowerCase();
                let detectedOutcome = (_g = (_f = rc.analysis) === null || _f === void 0 ? void 0 : _f.structuredData) === null || _g === void 0 ? void 0 : _g.outcome;
                if (!detectedOutcome) {
                    if (combinedText.includes("quotation") || combinedText.includes("quote") || combinedText.includes("pricing") || combinedText.includes("proposal")) {
                        detectedOutcome = "Quotation Requested";
                    }
                    else if (combinedText.includes("interview")) {
                        detectedOutcome = "Interview Scheduled";
                    }
                    else if (combinedText.includes("demo") || combinedText.includes("appointment") || combinedText.includes("meeting")) {
                        detectedOutcome = "Demo Booked";
                    }
                    else if (combinedText.includes("callback") || combinedText.includes("call me")) {
                        detectedOutcome = "Callback Requested";
                    }
                    else if (combinedText.includes("not interested")) {
                        detectedOutcome = "Not Interested";
                    }
                    else if (combinedText.includes("interested")) {
                        detectedOutcome = "Interested";
                    }
                }
                log.call_outcome = detectedOutcome || log.call_outcome || rc.endedReason || "Call Completed";
                log.raw_webhook_payload = rc;
                log.updated_on = new Date();
                try {
                    await log.save();
                    synced++;
                }
                catch (err) {
                    this.logger.warn(`Failed to save Vapi call ${callId}: ${err.message}`);
                }
            }
            this.logger.log(`✅ [VAPI CALL SYNC] Synced ${synced} call logs from Vapi platform`);
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
    async getCallStats(tenantId = "default") {
        const logs = await VoiceCallLog_entity_1.VoiceCallLog.find({ where: { tenant_id: tenantId } });
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
        event_emitter_1.EventEmitter2])
], VoiceCallService);
//# sourceMappingURL=VoiceCall.service.js.map