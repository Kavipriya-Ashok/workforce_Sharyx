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
var AgentOrchestratorService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentOrchestratorService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
const ConversationAgentState_entity_1 = require("../../Database/Table/Agent/ConversationAgentState.entity");
const AgentHandoffLog_entity_1 = require("../../Database/Table/Agent/AgentHandoffLog.entity");
const lead_1 = require("../../Database/Table/Lead/lead");
const company_1 = require("../../Database/Table/Admin/company");
const WhatsAppMessage_entity_1 = require("../../Database/Table/WhatsApp/WhatsAppMessage.entity");
const WhatsAppConversation_entity_1 = require("../../Database/Table/WhatsApp/WhatsAppConversation.entity");
const EmailLog_entity_1 = require("../../Database/Table/Email/EmailLog.entity");
const AgentLlm_service_1 = require("./AgentLlm.service");
const AgentTools_service_1 = require("./AgentTools.service");
const AiAgent_service_1 = require("./AiAgent.service");
const DefaultAgents_1 = require("../Agents/DefaultAgents");
const JobOpenings_service_1 = require("../../Service/Lead/JobOpenings.service");
const MAX_HANDOFFS_PER_TURN = 2;
const SESSION_RESET_HOURS = 24;
let AgentOrchestratorService = AgentOrchestratorService_1 = class AgentOrchestratorService {
    constructor(llm, tools, agentService, openingsService) {
        this.llm = llm;
        this.tools = tools;
        this.agentService = agentService;
        this.openingsService = openingsService;
        this.logger = new common_1.Logger(AgentOrchestratorService_1.name);
        this.bizCache = null;
    }
    async handle(input) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q;
        const tenantId = input.tenantId || "default";
        const agents = await this.agentService.getActiveMap(tenantId, input.channel);
        const receptionist = agents.get("receptionist");
        if (!receptionist)
            return null;
        const state = await this.loadState(input, tenantId);
        if (state.human_takeover) {
            state.last_activity_at = new Date();
            await state.save();
            return { reply: null, agentKey: "human", agentName: "Human", handoffs: [], humanTakeover: true, stateId: state.id, usedLlm: false };
        }
        const gapHours = state.last_activity_at ? (Date.now() - new Date(state.last_activity_at).getTime()) / 36e5 : 0;
        if (gapHours > SESSION_RESET_HOURS && state.active_agent !== "receptionist") {
            state.previous_agent = state.active_agent;
            state.active_agent = "receptionist";
            state.collected_slots = Object.assign(Object.assign({}, (state.collected_slots || {})), { returning_customer: true });
        }
        if (!agents.has(state.active_agent))
            state.active_agent = "receptionist";
        const history = (_a = input.history) !== null && _a !== void 0 ? _a : (await this.loadHistory(input));
        const normalizedHistory = this.normalizeHistory(history, input.message);
        const userMessage = input.subject && input.channel === "email"
            ? `Subject: ${input.subject}\n\n${input.message}`
            : input.message;
        const handoffs = [];
        const appendTexts = [];
        let announcement = "";
        let reply = "";
        let usedLlm = false;
        let current = agents.get(state.active_agent) || receptionist;
        const llmAvailable = this.llm.isAvailable(input.llm);
        for (let hop = 0; hop <= MAX_HANDOFFS_PER_TURN; hop++) {
            current = agents.get(state.active_agent) || receptionist;
            let out = null;
            const lowerMsg = userMessage.toLowerCase();
            const hasPhone = /(?:\+?\d{1,4}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/.test(userMessage) || /(?:\+?\d[\d\s-]{8,14}\d)/.test(userMessage);
            const isCandidateQuery = /(?:job|career|resume|cv|hiring|apply|applicant|candidate|vacancy|opening|employment|interview|recruitment)/i.test(lowerMsg);
            const isExplicitSalesCall = /(?:sales.*(?:call|speak|talk|phone|connect|ring|contact)|(?:call|speak|talk|phone|connect|ring|contact).*(?:sales)|sales.*(?:rep|person|team|executive|agent)|talk to sales|speak with sales|speak to sales|connect.*sales|sales.*callback|request.*sales|call pannunga.*sales|sales kitta pesanum|sales.*pesa|sales.*direct call|direct call.*sales)/i.test(lowerMsg) ||
                (/(?:call me|call back|request.*call|can you call|need a call|phone call|call pannunga|direct call)/i.test(lowerMsg) && !isCandidateQuery);
            const histText = (normalizedHistory || []).slice(-3).map((h) => h.content).join(" ").toLowerCase();
            const isSalesCallbackFollowup = hasPhone && !isCandidateQuery && (((_b = state.collected_slots) === null || _b === void 0 ? void 0 : _b.sales_call_requested) || /sales|call you|phone number|call back|callback/i.test(histText));
            if (isExplicitSalesCall || isSalesCallbackFollowup) {
                out = await this.dynamicTurn(current, userMessage, state, agents, hop);
            }
            else if (llmAvailable) {
                try {
                    const systemPrompt = await this.buildPrompt(current, agents, state, input, hop > 0);
                    out = await this.llm.completeJson(systemPrompt, normalizedHistory, userMessage, Object.assign(Object.assign({}, input.llm), { provider: current.llm_provider || ((_c = input.llm) === null || _c === void 0 ? void 0 : _c.provider), model: current.llm_model || ((_d = input.llm) === null || _d === void 0 ? void 0 : _d.model), temperature: (_e = current.temperature) !== null && _e !== void 0 ? _e : (_f = input.llm) === null || _f === void 0 ? void 0 : _f.temperature }));
                    if (out) {
                        usedLlm = true;
                    }
                }
                catch (llmErr) {
                    this.logger.warn(`LLM completion failed (${llmErr.message}), falling back to dynamic workflow`);
                }
            }
            if (!out) {
                out = await this.dynamicTurn(current, userMessage, state, agents, hop);
            }
            if (out.memory && typeof out.memory === "object") {
                state.collected_slots = Object.assign(Object.assign({}, (state.collected_slots || {})), this.cleanMemory(out.memory));
                if (out.memory.name && !state.customer_name)
                    state.customer_name = String(out.memory.name);
                if (out.memory.email && !state.customer_email)
                    state.customer_email = String(out.memory.email);
                const hasSyncableMemory = Boolean(out.memory.name ||
                    out.memory.email ||
                    out.memory.company ||
                    out.memory.current_company ||
                    out.memory.role ||
                    out.memory.job_title ||
                    out.memory.applied_role ||
                    out.memory.experience ||
                    out.memory.total_experience ||
                    out.memory.relevant_experience ||
                    out.memory.employment_status ||
                    out.memory.relieving_date ||
                    out.memory.current_ctc ||
                    out.memory.expected_ctc ||
                    out.memory.relocation ||
                    out.memory.preferred_location ||
                    out.memory.location ||
                    out.memory.notice_period ||
                    out.memory.resume_url ||
                    current.agent_key === "recruitment");
                if (hasSyncableMemory && ((_g = out.tool) === null || _g === void 0 ? void 0 : _g.name) !== "capture_contact") {
                    await state.save();
                    const res = await this.tools.execute({ name: "capture_contact", inputs: Object.assign(Object.assign({}, out.memory), { is_candidate: current.agent_key === "recruitment" || undefined }) }, state, current.agent_key, current.display_name);
                    if (res.appendText && !appendTexts.includes(res.appendText)) {
                        appendTexts.push(res.appendText);
                    }
                }
            }
            await state.save();
            if ((_h = out.tool) === null || _h === void 0 ? void 0 : _h.name) {
                if ((current.allowed_tools || []).includes(out.tool.name)) {
                    const res = await this.tools.execute(out.tool, state, current.agent_key, current.display_name);
                    this.logger.log(`🛠️ [${current.agent_key}] tool ${out.tool.name} -> ${res.note}`);
                    if (out.tool.name === "book_appointment" && !res.ok && res.appendText) {
                        out.reply = res.appendText;
                    }
                    else if (res.appendText) {
                        appendTexts.push(res.appendText);
                    }
                    if (out.tool.name === "transfer_to_human") {
                        await this.recordHandoff(state, current.agent_key, "human", ((_j = out.tool.inputs) === null || _j === void 0 ? void 0 : _j.reason) || "requested", input.message);
                        handoffs.push({ from: current.agent_key, to: "human", reason: ((_k = out.tool.inputs) === null || _k === void 0 ? void 0 : _k.reason) || "requested" });
                    }
                }
                else {
                    this.logger.warn(`Agent ${current.agent_key} tried disallowed tool ${out.tool.name}`);
                }
            }
            const target = ((_l = out.handoff) === null || _l === void 0 ? void 0 : _l.to) ? String(out.handoff.to).toLowerCase().trim() : "";
            const lastPair = handoffs[handoffs.length - 1];
            const isPingPong = lastPair && lastPair.from === target && lastPair.to === current.agent_key;
            const canHandoff = target &&
                target !== current.agent_key &&
                agents.has(target) &&
                (((_m = current.handoff_targets) === null || _m === void 0 ? void 0 : _m.length) ? current.handoff_targets.includes(target) : true) &&
                hop < MAX_HANDOFFS_PER_TURN &&
                !isPingPong &&
                !state.human_takeover;
            if (canHandoff) {
                const reason = ((_o = out.handoff) === null || _o === void 0 ? void 0 : _o.reason) || "intent change";
                state.handoff_brief = ((_p = out.handoff) === null || _p === void 0 ? void 0 : _p.brief) || `${current.display_name}: customer asked "${input.message.slice(0, 200)}" (${reason})`;
                await this.recordHandoff(state, current.agent_key, target, reason, input.message);
                handoffs.push({ from: current.agent_key, to: target, reason });
                const next = agents.get(target);
                const custDisp = state.customer_name ? `Customer: ${state.customer_name}` : `Phone: ${state.customer_phone || input.phone || "unknown"}`;
                this.logger.log(`🤝 [AGENT HANDOFF CALL] ${current.display_name} ➡️ ${next.display_name} (${custDisp}) | Reason: ${reason} | Brief: ${state.handoff_brief}`);
                announcement = "";
                if (((_q = out.tool) === null || _q === void 0 ? void 0 : _q.name) === "dispatch_voice_call") {
                    reply = (out.reply || "").trim();
                    break;
                }
                continue;
            }
            reply = (out.reply || "").trim() || current.fallback_message || "";
            break;
        }
        const uniqueExtras = Array.from(new Set(appendTexts.filter(Boolean)));
        const extras = uniqueExtras.filter((t) => {
            var _a;
            const url = (_a = t.match(/https?:\/\/\S+/)) === null || _a === void 0 ? void 0 : _a[0];
            return url ? !reply.includes(url) : !reply.includes(t.trim());
        });
        let finalReply = [reply, ...extras].filter(Boolean).join("\n\n");
        if (state.human_takeover && !finalReply) {
            finalReply = "👨‍💼 I'm connecting you with a member of our team. They'll be with you shortly.";
        }
        state.turn_count = (state.turn_count || 0) + 1;
        state.last_activity_at = new Date();
        state.updated_on = new Date();
        await state.save();
        return {
            reply: finalReply || null,
            announcement: null,
            agentKey: current.agent_key,
            agentName: current.display_name,
            handoffs,
            humanTakeover: state.human_takeover,
            stateId: state.id,
            usedLlm,
        };
    }
    async buildPrompt(agent, agents, state, input, justHandedOff) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s;
        const biz = await this.getBusiness();
        const now = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "full", timeStyle: "short" });
        const leadRec = await this.findLead(state);
        const isSupport = agent.agent_key === "support";
        const team = [...agents.values()]
            .filter((a) => a.agent_key !== agent.agent_key)
            .map((a) => `- "${a.agent_key}" (${a.emoji || ""} ${a.display_name}): ${a.description || ""}`)
            .join("\n");
        const allowedTools = (agent.allowed_tools || []).map((t) => `- ${DefaultAgents_1.AGENT_TOOL_DOCS[t] || t}`).join("\n") || "- (none)";
        const handoffTargets = (agent.handoff_targets || []).filter((t) => agents.has(t));
        let p = `You are part of a multi-agent AI customer team for "${biz.name}". The customer sees ONE company voice - never mention "agents", "handoff", "AI system" or internal processes.
Current date/time (IST): ${now}

═══ YOUR ROLE: ${agent.emoji || ""} ${agent.display_name} ═══
${agent.persona_prompt}
`;
        if (agent.knowledge)
            p += `\n═══ YOUR KNOWLEDGE (use ONLY these facts, never invent) ═══\n${agent.knowledge}\n`;
        p += `\n═══ COMPANY ═══\nName: ${biz.name}${biz.email ? `\nEmail: ${biz.email}` : ""}${biz.address ? `\nAddress: ${biz.address}` : ""}\n`;
        p += `\n═══ YOUR TEAMMATES (hand off when the request belongs to them) ═══\n${team || "- none"}\nAllowed handoff targets: ${handoffTargets.join(", ") || "none"}\n`;
        const customerName = state.customer_name || (leadRec === null || leadRec === void 0 ? void 0 : leadRec.name) || "";
        if (state.handoff_brief && (justHandedOff || state.previous_agent)) {
            const prevName = String(state.previous_agent || "previous").toUpperCase();
            p += `\n═══ 🤝 HANDOFF BRIEF FROM ${prevName} ═══\n${state.handoff_brief}\n`;
            if (justHandedOff) {
                p += `HANDOFF TAKEOVER INSTRUCTIONS (CRITICAL):
- You are now taking over this customer from ${prevName}.
- Greet the customer warmly by name${customerName ? ` ("Hi ${customerName}!" or "Hello ${customerName}!")` : ""}.
- Directly fulfill what they enquired about immediately in this message.
- If the customer is asking about job openings, careers, or vacancies: You MUST immediately list ALL active open roles from the LIVE HR OPENINGS section below in this exact reply! DO NOT say "let me check", "let me fetch", or "bear with me". List the roles right away!
- Keep it natural, warm, and directly address their request without making them repeat anything.\n`;
            }
        }
        const leadProfile = ((_a = leadRec === null || leadRec === void 0 ? void 0 : leadRec.custom_fields) === null || _a === void 0 ? void 0 : _a.recruitment_profile) || {};
        const lastCallSummary = ((_c = (_b = leadRec === null || leadRec === void 0 ? void 0 : leadRec.custom_fields) === null || _b === void 0 ? void 0 : _b.last_voice_call) === null || _c === void 0 ? void 0 : _c.summary) || "";
        const known = Object.assign({ name: state.customer_name || (leadRec === null || leadRec === void 0 ? void 0 : leadRec.name), phone: state.customer_phone || (leadRec === null || leadRec === void 0 ? void 0 : leadRec.phone), email: state.customer_email || (leadRec === null || leadRec === void 0 ? void 0 : leadRec.email), company: leadRec === null || leadRec === void 0 ? void 0 : leadRec.company_name, role: ((_d = state.collected_slots) === null || _d === void 0 ? void 0 : _d.role) || ((_e = state.collected_slots) === null || _e === void 0 ? void 0 : _e.applied_role) || (leadRec === null || leadRec === void 0 ? void 0 : leadRec.job_title), total_experience: ((_f = state.collected_slots) === null || _f === void 0 ? void 0 : _f.total_experience) || ((_g = state.collected_slots) === null || _g === void 0 ? void 0 : _g.experience) || (leadRec === null || leadRec === void 0 ? void 0 : leadRec.total_experience), relevant_experience: ((_h = state.collected_slots) === null || _h === void 0 ? void 0 : _h.relevant_experience) || (leadRec === null || leadRec === void 0 ? void 0 : leadRec.relevant_experience), employment_status: ((_j = state.collected_slots) === null || _j === void 0 ? void 0 : _j.employment_status) || (leadRec === null || leadRec === void 0 ? void 0 : leadRec.employment_status), relieving_date: ((_k = state.collected_slots) === null || _k === void 0 ? void 0 : _k.relieving_date) || (leadRec === null || leadRec === void 0 ? void 0 : leadRec.relieving_date), current_ctc: ((_l = state.collected_slots) === null || _l === void 0 ? void 0 : _l.current_ctc) || (leadRec === null || leadRec === void 0 ? void 0 : leadRec.current_ctc), expected_ctc: ((_m = state.collected_slots) === null || _m === void 0 ? void 0 : _m.expected_ctc) || (leadRec === null || leadRec === void 0 ? void 0 : leadRec.expected_ctc), relocation: ((_o = state.collected_slots) === null || _o === void 0 ? void 0 : _o.relocation) || (leadRec === null || leadRec === void 0 ? void 0 : leadRec.relocation), preferred_location: ((_p = state.collected_slots) === null || _p === void 0 ? void 0 : _p.preferred_location) || (leadProfile === null || leadProfile === void 0 ? void 0 : leadProfile.preferred_location), resume_url: ((_q = state.collected_slots) === null || _q === void 0 ? void 0 : _q.resume_url) || (leadRec === null || leadRec === void 0 ? void 0 : leadRec.resume_url), pipeline_stage: leadRec === null || leadRec === void 0 ? void 0 : leadRec.lead_status }, (state.collected_slots || {}));
        Object.keys(known).forEach((k) => (known[k] === undefined || known[k] === null || known[k] === "") && delete known[k]);
        p += `\n═══ KNOWN CUSTOMER DETAILS (never ask again) ═══\n${JSON.stringify(known, null, 2)}\n`;
        const appt = ((_r = state.collected_slots) === null || _r === void 0 ? void 0 : _r.appointment) || (await this.getWaMeeting(state));
        const candidateHasRole = Boolean(known.role || known.applied_role || ((_s = state.collected_slots) === null || _s === void 0 ? void 0 : _s.role));
        const candidateHasExp = Boolean(known.total_experience || known.relevant_experience);
        const candidateHasCtcOrRelieving = Boolean(known.current_ctc || known.expected_ctc || known.relieving_date);
        const isScreeningComplete = candidateHasRole && candidateHasExp && candidateHasCtcOrRelieving;
        if (agent.agent_key === "recruitment") {
            if (isScreeningComplete && !(appt === null || appt === void 0 ? void 0 : appt.meet_url)) {
                const emailPrompt = !known.email
                    ? `\n- The candidate's EMAIL is missing. You MUST ask for their email address along with the interview slots so we can send their calendar invite and Google Meet link!`
                    : `\n- Candidate email: ${known.email}`;
                p += `\n══════════════════════════════════════════════════════════════════════════
🎯 CRITICAL: CANDIDATE SCREENING IS COMPLETE — SCHEDULE INTERVIEW NOW!
══════════════════════════════════════════════════════════════════════════
All required candidate details (Role: ${known.role || "Backend Developer"}, Experience: ${known.total_experience || 5} years, Relieving Date: ${known.relieving_date || "Confirmed"}, CTC: ${known.current_ctc || "-"} -> ${known.expected_ctc || "-"}) are ALREADY FULLY COLLECTED.
${emailPrompt}

STRICT INSTRUCTIONS FOR THIS TURN:
1. UNDER NO CIRCUMSTANCES should you ask for their role, experience, resume, or CTC again!
2. UNDER NO CIRCUMSTANCES should you list the open roles again!
3. Congratulate / thank the candidate warmly by name (${customerName || "kavi"}).
4. Inform them that their profile is SHORTLISTED for the technical round for "${known.role || "Backend Developer"}".
5. Offer them 2-3 concrete interview slots from AVAILABLE INTERVIEW SLOTS below (e.g. tomorrow at 11:00 AM IST, 2:00 PM IST, or 4:00 PM IST).${!known.email ? " Also ask for their email address so the calendar invitation can be delivered to their inbox." : ""}
6. If the candidate just provided or confirmed a slot date/time (e.g. "11am", "tomorrow at 2pm", or an email), immediately call the tool "book_appointment" with {"slot": "<chosen_date_time>", "type": "interview", "role": "${known.role || "Backend Developer"}", "email": "${known.email || ""}"}!
══════════════════════════════════════════════════════════════════════════\n`;
            }
            else if (!candidateHasRole) {
                p += `\n═══ RECRUITMENT AGENT DIRECTIVES (PRIYA) ═══
- The candidate has NOT chosen a role yet.
- IMMEDIATELY list the 4 active roles from LIVE HR OPENINGS below with title, min experience, skills, locations, and work mode!
- NEVER invent unlisted roles (like SDE or Data Scientist).
- After listing the roles, ask: "Which of these roles interests you, or would you like to share your resume?"\n`;
            }
            else {
                p += `\n═══ RECRUITMENT AGENT DIRECTIVES (PRIYA) ═══
- The candidate has already chosen the role: "${known.role}". DO NOT list open roles again!
- Politely collect any remaining screening details (e.g. experience, notice period, or current/expected CTC) one question at a time.
- As soon as details are provided, move straight to scheduling the interview!\n`;
            }
        }
        if (agent.agent_key === "recruitment" || agent.agent_key === "receptionist" || agent.agent_key === "appointment") {
            try {
                const { promptBlock } = await this.openingsService.formatOpenRolesForPrompt(state.tenant_id || "default");
                const availSlots = await this.openingsService.getAvailableSlots(state.tenant_id || "default", 4);
                p += `\n═══ LIVE HR OPENINGS (FROM DATABASE — NEVER OFFER UNLISTED ROLES) ═══\n${promptBlock}\n`;
                p += `\n═══ AVAILABLE INTERVIEW SLOTS (MON–SAT, 10:00 AM – 6:00 PM IST ONLY) ═══\nOffer ONLY these valid future slots (no Sundays, no 12 AM, no past times):\n${availSlots.map((s) => `- ${s}`).join("\n")}\n`;
                if (lastCallSummary) {
                    p += `\n═══ PREVIOUS VOICE CALL SUMMARY WITH CANDIDATE ═══\n${lastCallSummary}\n`;
                }
            }
            catch (openErr) {
                this.logger.warn(`Failed to load dynamic open roles for prompt: ${openErr.message}`);
            }
        }
        if (appt === null || appt === void 0 ? void 0 : appt.meet_url) {
            p += `\n═══ EXISTING APPOINTMENT ═══\n${appt.type || "Meeting"} on ${appt.slot} | Google Meet: ${appt.meet_url}\nIf asked for the link/time, share it directly.\n`;
        }
        if (isSupport)
            p += await this.build360(state, leadRec);
        p += `\n═══ CHANNEL: ${input.channel.toUpperCase()} ═══\n`;
        p +=
            input.channel === "whatsapp"
                ? `- Keep it SHORT: 1-3 sentences, chatty and warm. Use *bold* sparingly and at most 1-2 emojis.\n- Ask only ONE question at a time.\n- CONTACT INTAKE ON WHATSAPP: We already have the customer's phone number (${known.phone || input.phone || "on file"}). If their email address ("email" in KNOWN CUSTOMER DETAILS) is missing, politely ask for their email address so we can send proposals and Google Meet calendar invites.\n`
                : `- Write a professional email body in plain text (no markdown, no HTML): greeting with the customer's name, 2-3 short paragraphs, clear next step, sign off as "${agent.display_name}, ${biz.name}".\n- Do NOT include a subject line.\n- CRITICAL CONTACT INTAKE ON EMAIL: We already have the customer's email address (${known.email || input.email || "on file"}) — NEVER ask for their email address! Instead, if their mobile/phone number ("phone" in KNOWN CUSTOMER DETAILS) is missing, ALWAYS ask for their mobile phone number (with country code, e.g. +91) so our team / AI Voice Agent can coordinate directly with them!\n`;
        p += `- Reply in the customer's language (English / Tamil / Tanglish).\n`;
        p += `\n═══ TOOLS YOU MAY CALL (at most one per turn) ═══\n${allowedTools}\n`;
        p += `- When the customer asks to receive or share the meeting link via email (e.g. "send meeting link in email", "email me the link"), call "email_meeting_link". If their email is unknown, ask for their email address.\n`;
        p += `- When the customer explicitly asks to speak with a sales agent, talk to sales, connect with sales, or requests a sales call / callback: call "dispatch_voice_call" and handoff to "sales". If their phone number is unknown, ask for their phone number.\n`;
        p += `- When the customer asks about job openings, recruitment, career opportunities, candidate status, or interviews: answer using recruitment knowledge or handoff to "recruitment". Under NO circumstances trigger a sales call for candidate questions.\n`;
        p += `
═══ OUTPUT: STRICT JSON ONLY ═══
{
  "reply": "message to the customer (when handing off, write a short transition like 'Please hold on a moment, let me connect you with our <Specialist>...')",
  "handoff": null OR { "to": "<agent_key>", "reason": "short reason", "brief": "2-4 lines for the next teammate: who the customer is, what they want, details collected, what is pending" },
  "tool": null OR { "name": "<tool_name>", "inputs": { ... } },
  "memory": { "key facts learned THIS turn, e.g. name, company, current_company, email, phone, interest, seats, budget, role, total_experience, relevant_experience, employment_status (working|notice|relieved), relieving_date, current_ctc, expected_ctc, ctc_basis (annual|monthly), relocation (yes|no|conditional), preferred_location, preferred_slot, resume_url, meeting_type, preferred_time" }
}
RULES:
- Handle the request yourself if it is within your role. Hand off ONLY when it clearly belongs to a teammate.
- When you call a tool, still write a natural "reply" confirming the action (e.g. booking confirmation).
- Never claim an action (booking, ticket, alert) happened unless you call its tool in this same response.
- Never fabricate prices, features, links or dates.`;
        return p;
    }
    async build360(state, leadRec) {
        var _a;
        let s = `\n═══ CUSTOMER 360° OVERVIEW (Support has full visibility) ═══\n`;
        if (leadRec) {
            s += `CRM: ${leadRec.name || "-"} | ${leadRec.company_name || "-"} | stage ${leadRec.lead_status} | score ${leadRec.score} | source ${leadRec.source}\n`;
            if (leadRec.notes)
                s += `Notes: ${String(leadRec.notes).slice(0, 400)}\n`;
        }
        try {
            const phone = state.customer_phone || (leadRec === null || leadRec === void 0 ? void 0 : leadRec.phone);
            if (phone) {
                const conv = await WhatsAppConversation_entity_1.WhatsAppConversation.findOne({ where: { customer_phone: phone } });
                if (conv) {
                    const msgs = await WhatsAppMessage_entity_1.WhatsAppMessage.find({ where: { conversation_id: conv.id }, order: { created_on: "DESC" }, take: 15 });
                    if (msgs.length) {
                        s += `\nWhatsApp (latest ${msgs.length}):\n` + msgs.reverse().map((m) => `  [${m.direction}] ${String(m.message_text || "").slice(0, 160)}`).join("\n") + "\n";
                    }
                }
            }
            const email = state.customer_email || (leadRec === null || leadRec === void 0 ? void 0 : leadRec.email);
            if (email || (leadRec === null || leadRec === void 0 ? void 0 : leadRec.id)) {
                const where = [];
                if (email)
                    where.push({ from_email: email }, { to_email: email });
                if (leadRec === null || leadRec === void 0 ? void 0 : leadRec.id)
                    where.push({ lead_id: leadRec.id });
                const mails = await EmailLog_entity_1.EmailLog.find({ where, order: { created_on: "DESC" }, take: 8 });
                if (mails.length) {
                    s += `\nEmails (latest ${mails.length}):\n` + mails.reverse().map((m) => `  [${m.direction}] ${m.subject || ""} - ${String(m.body_text || "").replace(/\s+/g, " ").slice(0, 160)}`).join("\n") + "\n";
                }
            }
            const handoffs = await AgentHandoffLog_entity_1.AgentHandoffLog.find({ where: { state_id: state.id }, order: { created_on: "DESC" }, take: 8 });
            if (handoffs.length) {
                s += `\nAgent journey: ` + handoffs.reverse().map((h) => `${h.from_agent}→${h.to_agent} (${h.reason})`).join(" | ") + "\n";
            }
            const tickets = (_a = state.collected_slots) === null || _a === void 0 ? void 0 : _a.tickets;
            if (tickets === null || tickets === void 0 ? void 0 : tickets.length)
                s += `\nOpen tickets: ${JSON.stringify(tickets)}\n`;
        }
        catch (err) {
            this.logger.warn(`360 build failed: ${err.message}`);
        }
        return s;
    }
    async loadState(input, tenantId) {
        let state = await ConversationAgentState_entity_1.ConversationAgentState.findOne({
            where: { tenant_id: tenantId, channel: input.channel, conversation_ref: input.conversationRef },
        });
        if (!state) {
            state = new ConversationAgentState_entity_1.ConversationAgentState();
            state.tenant_id = tenantId;
            state.channel = input.channel;
            state.conversation_ref = input.conversationRef;
            state.active_agent = "receptionist";
            state.collected_slots = {};
            state.handoff_count = 0;
            state.turn_count = 0;
            state.human_takeover = false;
            state.created_by_id = "agent_orchestrator";
            state.created_on = new Date();
            state.last_activity_at = new Date();
        }
        if (input.phone)
            state.customer_phone = input.phone;
        if (input.email)
            state.customer_email = input.email;
        if (input.name && (!state.customer_name || /^\+?\d+$/.test(state.customer_name)))
            state.customer_name = input.name;
        if (input.leadId)
            state.lead_id = input.leadId;
        if (!state.id)
            await state.save();
        return state;
    }
    async loadHistory(input) {
        try {
            if (input.channel === "whatsapp") {
                const msgs = await WhatsAppMessage_entity_1.WhatsAppMessage.find({
                    where: { conversation_id: input.conversationRef },
                    order: { created_on: "DESC" },
                    take: 12,
                });
                return msgs.reverse().filter((m) => m.message_text).map((m) => ({
                    role: m.direction === "inbound" ? "user" : "assistant",
                    content: m.message_text,
                }));
            }
            const email = input.email || input.conversationRef;
            const since = new Date(Date.now() - 30 * 864e5);
            const logs = await EmailLog_entity_1.EmailLog.find({
                where: [
                    { from_email: email, created_on: (0, typeorm_1.MoreThan)(since) },
                    { to_email: email, created_on: (0, typeorm_1.MoreThan)(since) },
                ],
                order: { created_on: "DESC" },
                take: 8,
            });
            return logs.reverse().map((l) => ({
                role: l.direction === "outbound" ? "assistant" : "user",
                content: String(l.body_text || l.subject || "").slice(0, 1200),
            }));
        }
        catch (_a) {
            return [];
        }
    }
    normalizeHistory(history, current) {
        const h = [...(history || [])].filter((m) => { var _a; return (_a = m.content) === null || _a === void 0 ? void 0 : _a.trim(); });
        if (h.length && h[h.length - 1].role === "user" && h[h.length - 1].content.trim() === current.trim())
            h.pop();
        const merged = [];
        for (const m of h) {
            const last = merged[merged.length - 1];
            if (last && last.role === m.role)
                last.content += `\n${m.content}`;
            else
                merged.push(Object.assign({}, m));
        }
        while (merged.length && merged[0].role !== "user")
            merged.shift();
        if (merged.length && merged[merged.length - 1].role === "user") {
            merged.push({ role: "assistant", content: "(noted)" });
        }
        return merged.slice(-12);
    }
    async recordHandoff(state, from, to, reason, msg) {
        if (to !== "human") {
            state.previous_agent = from;
            state.active_agent = to;
        }
        state.handoff_count = (state.handoff_count || 0) + 1;
        try {
            const log = new AgentHandoffLog_entity_1.AgentHandoffLog();
            log.tenant_id = state.tenant_id;
            log.state_id = state.id;
            log.channel = state.channel;
            log.from_agent = from;
            log.to_agent = to;
            log.reason = reason;
            log.trigger_message = msg === null || msg === void 0 ? void 0 : msg.slice(0, 500);
            log.created_by_id = "agent_orchestrator";
            log.created_on = new Date();
            await log.save();
        }
        catch (err) {
            this.logger.warn(`Handoff log failed: ${err.message}`);
        }
    }
    keywordRoute(text) {
        const t = (text || "").toLowerCase();
        if (/(not working|issue|problem|error|bug|complain|complaint|refund|broken|support|human|real person|talk to (a|someone)|manager)/.test(t))
            return "support";
        if (/(job|career|resume|cv|hiring|apply|applicant|candidate|vacancy|opening|employment|ctc|notice period|reliev)/.test(t))
            return "recruitment";
        if (/(demo|book|schedule|appointment|meeting|interview|slot|reschedule|call me|meet)/.test(t))
            return "appointment";
        if (/(price|pricing|cost|plan|quote|quotation|how much|buy|purchase|discount|package|rate|evlo|evvalavu|vilai)/.test(t))
            return "sales";
        return null;
    }
    cleanMemory(mem) {
        const out = {};
        Object.entries(mem).forEach(([k, v]) => {
            if (v !== null && v !== undefined && v !== "" && !["appointment", "tickets"].includes(k))
                out[k] = v;
        });
        return out;
    }
    async dynamicTurn(agent, message, state, agents, hop) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2;
        const m = (message || "").toLowerCase().trim();
        const memory = {};
        const leadRec = await this.findLead(state);
        const phoneMatch = message.match(/(?:\+?\d{1,4}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/) || message.match(/(?:\+?\d[\d\s-]{8,14}\d)/);
        if (phoneMatch) {
            memory.phone = phoneMatch[0].replace(/[\s-]/g, "");
            if (!state.customer_phone)
                state.customer_phone = memory.phone;
        }
        const emailMatch = message.match(/[\w.-]+@[\w.-]+\.\w+/);
        if (emailMatch)
            memory.email = emailMatch[0];
        const explicitNameMatch = message.match(/(?:my name is|i am|i'm|this is)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
        if (explicitNameMatch) {
            memory.name = explicitNameMatch[1];
        }
        else if (!state.customer_name && !((_a = state.collected_slots) === null || _a === void 0 ? void 0 : _a.name)) {
            const words = message.trim().split(/\s+/);
            if (words.length <= 3 &&
                /^[A-Za-z\s.'-]+$/.test(message.trim()) &&
                !/^(hi|hello|hey|vanakkam|pricing|price|demo|book|support|help|sales|yes|no|ok|sure|thanks|users|seats)$/i.test(message.trim())) {
                memory.name = message.trim();
            }
        }
        const companyMatch = message.match(/(?:company(?: name)?(?: is)?|from|org(?:anization)?(?: is)?|working at)\s+([A-Za-z0-9&.\s]+)/i);
        if (companyMatch) {
            memory.company = companyMatch[1].trim();
        }
        if (emailMatch) {
            const email = emailMatch[0];
            const convMeet = await this.getWaMeeting(state);
            const existingMeetUrl = ((_c = (_b = state.collected_slots) === null || _b === void 0 ? void 0 : _b.appointment) === null || _c === void 0 ? void 0 : _c.meet_url) || (convMeet === null || convMeet === void 0 ? void 0 : convMeet.meet_url);
            const existingSlot = ((_e = (_d = state.collected_slots) === null || _d === void 0 ? void 0 : _d.appointment) === null || _e === void 0 ? void 0 : _e.slot) || (convMeet === null || convMeet === void 0 ? void 0 : convMeet.slot) || "Scheduled Session";
            if (existingMeetUrl) {
                return {
                    reply: `I've sent the Google Meet invitation directly to your email (*${email}*)! ✉️\n\n🗓️ Slot: ${existingSlot}\n🎥 Join: ${existingMeetUrl}\n\nIs there anything specific you would like our specialist to cover during the session?`,
                    tool: { name: "email_meeting_link", inputs: { email, slot: existingSlot } },
                    memory,
                };
            }
        }
        if (/(?:email|mail).*(?:link|meet|appointment)|(?:send|share|give).*(?:link|meet).*(?:email|mail)/i.test(m)) {
            const targetEmail = memory.email || state.customer_email;
            if (targetEmail) {
                const convMeet = await this.getWaMeeting(state);
                const slot = ((_g = (_f = state.collected_slots) === null || _f === void 0 ? void 0 : _f.appointment) === null || _g === void 0 ? void 0 : _g.slot) || (convMeet === null || convMeet === void 0 ? void 0 : convMeet.slot) || "Tomorrow 10:00 AM";
                return {
                    reply: `I've sent the Google Meet invitation directly to your email (*${targetEmail}*)! ✉️`,
                    tool: { name: "email_meeting_link", inputs: { email: targetEmail, slot } },
                    memory,
                };
            }
            else {
                return {
                    reply: "I would be delighted to email the Google Meet invitation to you! Could you please share your email address? ✉️",
                    memory,
                };
            }
        }
        if (agent.agent_key === "receptionist") {
            const cust = memory.name || state.customer_name || "";
            const namePart = cust ? ` ${cust}` : "";
            const customerPhone = memory.phone || state.customer_phone || ((_h = state.collected_slots) === null || _h === void 0 ? void 0 : _h.phone) || "";
            const isSalesCallRequest = /(?:sales.*(?:call|speak|talk|phone|connect|ring|contact)|(?:call|speak|talk|phone|connect|ring|contact).*(?:sales)|sales.*(?:rep|person|team|executive|agent)|talk to sales|speak with sales|speak to sales|connect.*sales|sales.*callback|request.*sales|call pannunga.*sales|sales kitta pesanum|sales.*pesa)/i.test(m) ||
                (/(?:call me|call back|request.*call|can you call|need a call|phone call|call pannunga|direct call)/i.test(m) && !/(?:interview|job|application|hr|career)/i.test(m));
            if (isSalesCallRequest) {
                if (customerPhone) {
                    return {
                        reply: `I'm connecting you with our Sales Specialist right away${namePart}! 💼\n\n📞 I've just initiated an outbound telephone call to your number (*${customerPhone}*). Please pick up your phone in a moment — our AI Sales Specialist is ready to discuss plans, pricing, and answer all your questions!`,
                        tool: {
                            name: "dispatch_voice_call",
                            inputs: {
                                phone: customerPhone,
                                name: cust || undefined,
                                reason: "Customer requested a direct telephone call with Sales on WhatsApp",
                                agentKey: "sales",
                            },
                        },
                        handoff: {
                            to: "sales",
                            reason: "requested sales call",
                            brief: `${cust ? `Customer ${cust}` : "Customer"} requested an outbound sales call to ${customerPhone}: "${message.slice(0, 150)}"`,
                        },
                        memory,
                    };
                }
                else {
                    return {
                        reply: `I would be delighted to connect you with our Sales Specialist${namePart}! 💼\n\nCould you please share your phone number (with country code, e.g. +91) so our Sales Agent can call you immediately? 📱`,
                        handoff: {
                            to: "sales",
                            reason: "requested sales call (pending phone number)",
                            brief: `${cust ? `Customer ${cust}` : "Customer"} requested a sales call but phone number is needed`,
                        },
                        memory: Object.assign(Object.assign({}, memory), { sales_call_requested: true }),
                    };
                }
            }
            const isCandidateQuestion = /(job|career|resume|cv|hiring|apply|applicant|candidate|vacancy|opening|employment|interview|recruitment|fresher|salary|ctc|velai|opening irukka)/i.test(m);
            if (isCandidateQuestion) {
                const openRoles = await this.openingsService.getOpenRoles(state.tenant_id || "default");
                const rolesBullet = openRoles.length
                    ? openRoles.map((r) => `• *${r.title}* (${(r.locations || []).join(", ")} — ${r.work_mode || "Hybrid"})`).join("\n")
                    : "No active openings right now (we can keep your resume on file)";
                if (/(opening|position|role|vacancy|what job|any job|hiring)/i.test(m)) {
                    return {
                        reply: `We currently have open opportunities at Sharyx for:\n${rolesBullet}\n\nLet me connect you with our Recruitment Specialist${namePart} 🎓 who can assist with your application and schedule your interview!`,
                        handoff: {
                            to: "recruitment",
                            reason: "job openings inquiry",
                            brief: `${cust ? `Candidate ${cust}` : "Candidate"} inquired about open roles: "${message.slice(0, 150)}"`,
                        },
                        memory,
                    };
                }
                if (/(status|result|selection|interview.*when|update|round)/i.test(m)) {
                    return {
                        reply: `Let me connect you with our Recruitment Specialist${namePart} 🎓 to check your interview and application status right away!`,
                        handoff: {
                            to: "recruitment",
                            reason: "candidate status inquiry",
                            brief: `${cust ? `Candidate ${cust}` : "Candidate"} asked about interview/application status: "${message.slice(0, 150)}"`,
                        },
                        memory,
                    };
                }
                return {
                    reply: `Thank you for your interest in joining Sharyx! Let me connect you with our Recruitment Specialist${namePart} 🎓 to review your profile and experience.`,
                    handoff: {
                        to: "recruitment",
                        reason: "career application",
                        brief: `${cust ? `Candidate ${cust}` : "Candidate"} wants to apply: "${message.slice(0, 150)}"`,
                    },
                    memory,
                };
            }
            if (/(price|pricing|cost|plan|quote|quotation|how much|buy|purchase|discount|package|rate|evlo)/i.test(m)) {
                return {
                    reply: `Please wait a moment${namePart}, let me connect you with our Sales Specialist 💼...`,
                    handoff: {
                        to: "sales",
                        reason: "pricing inquiry",
                        brief: `${cust ? `Customer ${cust}` : "Customer"} enquired about pricing/packages: "${message.slice(0, 150)}"`,
                    },
                    memory,
                };
            }
            if (/(demo|book|appointment|schedule|meeting|slot|reschedule|meet)/i.test(m)) {
                return {
                    reply: `I'll connect you to our Appointment Desk${namePart} 📅!`,
                    handoff: {
                        to: "appointment",
                        reason: "booking request",
                        brief: `${cust ? `Customer ${cust}` : "Customer"} requested demo scheduling: "${message.slice(0, 150)}"`,
                    },
                    memory,
                };
            }
            if (/(not working|issue|problem|error|bug|complain|complaint|refund|broken|support|human|real person|manager)/i.test(m)) {
                return {
                    reply: `Let me connect you to our Support Lead${namePart} 🛟!`,
                    handoff: {
                        to: "support",
                        reason: "support request",
                        brief: `${cust ? `Customer ${cust}` : "Customer"} reported support issue: "${message.slice(0, 150)}"`,
                    },
                    memory,
                };
            }
            if (memory.name && !state.customer_name) {
                return {
                    reply: `Nice to meet you, ${memory.name}! Welcome to Sharyx 👋\n\nMay I know your company name and what is your best email address so we can register your inquiry and share our product guide with you?`,
                    tool: { name: "capture_contact", inputs: memory },
                    memory,
                };
            }
            if (memory.email && !state.customer_email) {
                return {
                    reply: `Thank you! I've registered your email (*${memory.email}*).\n\nWhat product or service are you exploring today? We offer AI Voice Calling, WhatsApp Copilots, and Email Automation!`,
                    tool: { name: "capture_contact", inputs: memory },
                    memory,
                };
            }
            if (/(product|feature|service|what do you|tell me about|info|email automation|voice agent|whatsapp)/i.test(m)) {
                return {
                    reply: `We provide an Autonomous AI Workforce platform featuring:\n🎙️ AI Voice Agent: 24/7 autonomous phone calling & lead qualification\n💬 WhatsApp AI Copilot: Meta Cloud API smart messaging & support\n✉️ Email AI Copilot: Inbox auto-replies & campaign workflows\n📊 Real-Time CRM: Automated lead tracking\n\nWould you like to explore our pricing plans, speak with our Sales Specialist, or schedule a live Google Meet demo?`,
                    memory,
                };
            }
            return {
                reply: "Hi 👋 Welcome to Sharyx! I can assist you with product details, connect you with our Sales team, answer recruitment questions, or schedule a live Google Meet demo. May I know your name and how I can help you today?",
                memory,
            };
        }
        if (agent.agent_key === "sales") {
            const custName = memory.name || state.customer_name || "";
            const customerPhone = memory.phone || state.customer_phone || ((_j = state.collected_slots) === null || _j === void 0 ? void 0 : _j.phone) || "";
            const hasPhoneInMessage = memory.phone || /(?:\+?\d[\d\s-]{8,14}\d)/.test(message);
            const isCallPending = ((_k = state.collected_slots) === null || _k === void 0 ? void 0 : _k.sales_call_requested) || /(?:call me|call back|phone call|call.*phone|speak.*phone|talk.*phone|call pannunga)/i.test(m);
            if ((isCallPending && hasPhoneInMessage) || (/(?:call me|call back|phone call|call.*phone|speak.*phone|talk.*phone|call pannunga)/i.test(m))) {
                const phoneToCall = memory.phone || customerPhone || (((_m = (_l = message.match(/(?:\+?\d[\d\s-]{8,14}\d)/)) === null || _l === void 0 ? void 0 : _l[0]) === null || _m === void 0 ? void 0 : _m.replace(/[\s-]/g, "")) || "");
                if (phoneToCall) {
                    const updatedMemory = Object.assign(Object.assign({}, memory), { phone: phoneToCall, sales_call_requested: false });
                    return {
                        reply: `I'd be glad to speak with you directly! 📞\n\nI've initiated an outbound phone call to *${phoneToCall}*. Please pick up your phone in a moment — our AI Sales Specialist is dialing.`,
                        tool: {
                            name: "dispatch_voice_call",
                            inputs: {
                                phone: phoneToCall,
                                name: custName || undefined,
                                reason: "Customer requested live phone call in Sales chat",
                                agentKey: "sales",
                            },
                        },
                        memory: updatedMemory,
                    };
                }
                else {
                    return {
                        reply: "I would be happy to call you! Could you please share your phone number (with country code, e.g. +91) so I can ring you immediately? 📱",
                        memory: Object.assign(Object.assign({}, memory), { sales_call_requested: true }),
                    };
                }
            }
            const seatsMatch = message.match(/(\d+)\s*(users?|seats?|agents?|people|members?)/i) || message.match(/^\s*(\d+)\s*$/);
            if (seatsMatch) {
                const count = parseInt(seatsMatch[1]);
                memory.seats = count;
                if (count > 20) {
                    return {
                        reply: `For ${count} users, our Enterprise Plan is the best fit! It includes unlimited AI conversations, custom WhatsApp & Email workflows, dedicated support, and SLA. Would you like to schedule a quick 15-minute Google Meet demo to see it in action?`,
                        tool: { name: "qualify_lead", inputs: { seats: count, interest_level: "hot" } },
                        memory,
                    };
                }
                else {
                    return {
                        reply: `Got it, ${count} users! For up to 20 users, our Growth Plan at ₹14,999/month is ideal. It includes 5 AI agents, Voice, WhatsApp, Email, and CRM. Would you like to schedule a quick 15-minute Google Meet demo to see it in action?`,
                        tool: { name: "qualify_lead", inputs: { seats: count, interest_level: "warm" } },
                        memory,
                    };
                }
            }
            if (/(yes|sure|book|schedule|demo|meet|call|okay|ok|interested)/i.test(m)) {
                return {
                    reply: "I'll connect you with our Appointment Desk right away to pick the best Google Meet slot for your demo 📅!",
                    handoff: {
                        to: "appointment",
                        reason: "demo booking",
                        brief: `Customer agreed to demo for ${((_o = state.collected_slots) === null || _o === void 0 ? void 0 : _o.seats) || "their team"}`,
                    },
                    memory,
                };
            }
            if (/(discount|offer|deal|annual|yearly)/i.test(m)) {
                return {
                    reply: "We offer 2 months free with our annual billing! Plus a free 7-day pilot. Would you like a customized proposal or a live demo for your team?",
                    memory,
                };
            }
            const greeting = custName ? `Hi ${custName}!` : "Thanks for your interest!";
            return {
                reply: `${greeting} Our plans start at ₹4,999/month for Starter and ₹14,999/month for Growth. Could you share how many users/agents you need so I can recommend the best plan?`,
                memory,
            };
        }
        if (agent.agent_key === "appointment") {
            const slotMatch = message.match(/(tomorrow|today|morning|afternoon|evening|\d{1,2}(?::\d{2})?\s*(?:am|pm)|monday|tuesday|wednesday|thursday|friday|saturday|\d{1,2}(?:st|nd|rd|th)?\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec))/i);
            if (slotMatch) {
                const slot = message.trim();
                return {
                    reply: `Great! I've reserved a 30-minute Google Meet session for you.`,
                    tool: { name: "book_appointment", inputs: { slot, type: "demo" } },
                    memory,
                };
            }
            if (/(demo|schedule|book|meet|appointment|interview)/i.test(m)) {
                return {
                    reply: "I'd be delighted to schedule your Google Meet demo! Would tomorrow at 10:00 AM or 3:00 PM work for you, or do you have a preferred date & time?",
                    memory,
                };
            }
            const appt = (_p = state.collected_slots) === null || _p === void 0 ? void 0 : _p.appointment;
            if (appt === null || appt === void 0 ? void 0 : appt.meet_url) {
                return {
                    reply: `Your demo is confirmed for ${appt.slot || "Tomorrow 10:00 AM"}!\n🎥 Google Meet: ${appt.meet_url}\n${state.customer_email ? `✉️ An invitation has also been sent to ${state.customer_email}` : "✉️ What is your email address so I can send the invitation directly to your inbox?"}`,
                    memory,
                };
            }
            return {
                reply: "Please share your preferred date and time (10 AM - 6 PM, Mon-Sat) so I can create your Google Meet invitation link! 📅",
                memory,
            };
        }
        if (agent.agent_key === "recruitment") {
            const candName = memory.name || state.customer_name || ((leadRec === null || leadRec === void 0 ? void 0 : leadRec.name) && !leadRec.name.startsWith("+") ? leadRec.name : "there");
            const candEmail = memory.email || state.customer_email || ((leadRec === null || leadRec === void 0 ? void 0 : leadRec.email) && !leadRec.email.includes("example.com") ? leadRec.email : null);
            const openRoles = await this.openingsService.getOpenRoles(state.tenant_id || "default");
            const availSlots = await this.openingsService.getAvailableSlots(state.tenant_id || "default", 4);
            let matchedOpening = openRoles.find((r) => m.includes(r.title.toLowerCase()));
            if (!matchedOpening) {
                matchedOpening = openRoles.find((r) => {
                    const titleWords = r.title.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
                    return titleWords.some((tw) => m.includes(tw));
                });
            }
            if (matchedOpening) {
                state.collected_slots = Object.assign(Object.assign({}, (state.collected_slots || {})), { role: matchedOpening.title, applied_role: matchedOpening.title });
                memory.role = matchedOpening.title;
            }
            const currentRole = ((_q = state.collected_slots) === null || _q === void 0 ? void 0 : _q.role) ||
                ((_r = state.collected_slots) === null || _r === void 0 ? void 0 : _r.applied_role) ||
                ((_s = state.collected_slots) === null || _s === void 0 ? void 0 : _s.job_title) ||
                (leadRec === null || leadRec === void 0 ? void 0 : leadRec.job_title) ||
                (matchedOpening === null || matchedOpening === void 0 ? void 0 : matchedOpening.title) ||
                null;
            const activeRoleObj = openRoles.find((r) => currentRole && r.title.toLowerCase() === String(currentRole).toLowerCase()) ||
                matchedOpening ||
                null;
            const isPdfUploaded = /\[Candidate (?:uploaded|shared) (?:resume )?PDF:.*?\]/i.test(message) || /(?:drive\.google\.com|dropbox\.com|onedrive|\.pdf)/i.test(message);
            const isNonPdfUploaded = /\[Candidate (?:uploaded|sent) non-PDF (?:attachment|document):.*?\]|\[Candidate uploaded an image instead of a PDF resume\]/i.test(message) || /(https?:\/\/[^\s]+(\.docx?|\.png|\.jpg|\.jpeg)|[^\s]+(\.docx?|\.png|\.jpg|\.jpeg))/i.test(message);
            if (isNonPdfUploaded) {
                return {
                    reply: `Thank you, ${candName}! However, our hiring system specifically requires your resume in *PDF format (.pdf)* 📄.\n\nCould you please upload your resume as a PDF file or share a Google Drive / Dropbox PDF link?`,
                    memory,
                };
            }
            if (/(?:can i share|how to send|submit|upload|where to send|share).*?(?:resume|cv)/i.test(m) || (/^(?:resume|cv|my resume)$/i.test(m.trim()) && !isPdfUploaded && !isNonPdfUploaded)) {
                return {
                    reply: `Please share your *Resume / CV in PDF format (.pdf)* 📄! You can attach the PDF document directly here in WhatsApp or paste a Google Drive / accessible PDF link.`,
                    memory,
                };
            }
            if (isPdfUploaded) {
                const urlMatch = message.match(/https?:\/\/[^\s]+/i);
                const fileNameMatch = message.match(/"([^"]+\.pdf)"/i);
                const resumeUrl = urlMatch ? urlMatch[0] : fileNameMatch ? fileNameMatch[1] : "candidate_resume.pdf";
                state.collected_slots = Object.assign(Object.assign({}, (state.collected_slots || {})), { resume_url: resumeUrl });
                memory.resume_url = resumeUrl;
                const slotsBullet = availSlots.map((s, i) => `${i + 1}. *${s}*`).join("\n");
                return {
                    reply: `Thank you, ${candName}! I've verified and received your resume (PDF) 📄.\n\nLet's get your 30-minute Google Meet interview scheduled! 📅\n\nWould any of these slots work for you?\n${slotsBullet}`,
                    tool: { name: "capture_contact", inputs: Object.assign({ resume_url: resumeUrl }, memory) },
                    memory,
                };
            }
            const slotMatch = message.match(/(tomorrow|today|morning|afternoon|evening|night|midnight|\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}\b|\b\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}\b|sunday|monday|tuesday|wednesday|thursday|friday|saturday|\b\d{1,2}(?::\d{2})?\s*(?:am|pm)\b)/i);
            const isRelievingDateAnswer = !(/\b(am|pm|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|slot|interview)\b/i.test(m)) &&
                !((_t = state.collected_slots) === null || _t === void 0 ? void 0 : _t.relieving_date) &&
                Boolean((_u = state.collected_slots) === null || _u === void 0 ? void 0 : _u.employment_status);
            if (slotMatch && !isRelievingDateAnswer) {
                const requestedSlot = message.trim();
                const roleForBooking = currentRole || ((_v = openRoles[0]) === null || _v === void 0 ? void 0 : _v.title) || "Open Role";
                if (!candEmail) {
                    state.collected_slots = Object.assign(Object.assign({}, (state.collected_slots || {})), { pending_interview_slot: requestedSlot });
                    return {
                        reply: `Got it! Before I lock in your interview slot, could you please share your email address so I can send the Google Meet calendar invite directly to your inbox? ✉️`,
                        memory,
                    };
                }
                return {
                    reply: `Awesome, ${candName}! Your interview for the *${roleForBooking}* role is confirmed 🚀.`,
                    tool: {
                        name: "book_appointment",
                        inputs: {
                            slot: requestedSlot,
                            type: "interview",
                            email: candEmail,
                            role: roleForBooking,
                        },
                    },
                    memory,
                };
            }
            if (memory.email && ((_w = state.collected_slots) === null || _w === void 0 ? void 0 : _w.pending_interview_slot)) {
                const slot = state.collected_slots.pending_interview_slot;
                const roleForBooking = currentRole || ((_x = openRoles[0]) === null || _x === void 0 ? void 0 : _x.title) || "Open Role";
                return {
                    reply: `Thank you! I've registered your email (*${memory.email}*).\n\nYour interview for the *${roleForBooking}* role is confirmed 🚀.`,
                    tool: {
                        name: "book_appointment",
                        inputs: {
                            slot,
                            type: "interview",
                            email: memory.email,
                            role: roleForBooking,
                        },
                    },
                    memory,
                };
            }
            const expMatch = message.match(/(\d+)\s*(yrs?|years?)/i) || (m.length <= 10 && /^\d+$/.test(m) ? [m + " years", m] : null);
            if (expMatch) {
                memory.total_experience = expMatch[0];
                state.collected_slots = Object.assign(Object.assign({}, (state.collected_slots || {})), { experience: expMatch[0], total_experience: expMatch[0] });
                return {
                    reply: `That's great, ${candName}! Are you currently working, serving notice, or already relieved?`,
                    tool: { name: "capture_contact", inputs: memory },
                    memory,
                };
            }
            if (/(notice|relieved|serving|working|immediate|lpa|ctc|lakh|crore|\d+\s*days)/i.test(m)) {
                if (/(serving|notice|working|relieved|\d+\s*days)/i.test(m)) {
                    memory.employment_status = message.trim();
                    state.collected_slots = Object.assign(Object.assign({}, (state.collected_slots || {})), { employment_status: message.trim() });
                }
                if (/(lpa|ctc|lakh|crore)/i.test(m)) {
                    memory.expected_ctc = message.trim();
                    state.collected_slots = Object.assign(Object.assign({}, (state.collected_slots || {})), { expected_ctc: message.trim() });
                }
                if (!((_y = state.collected_slots) === null || _y === void 0 ? void 0 : _y.resume_url) && !(leadRec === null || leadRec === void 0 ? void 0 : leadRec.resume_url)) {
                    return {
                        reply: `Got it! Thanks for sharing those details, ${candName} 📋.\n\nCould you please share your *Resume / CV in PDF format*? You can upload the PDF file directly here or share an accessible PDF link 📄.`,
                        tool: { name: "capture_contact", inputs: memory },
                        memory,
                    };
                }
                if (activeRoleObj && !((_z = state.collected_slots) === null || _z === void 0 ? void 0 : _z.preferred_location)) {
                    const locs = activeRoleObj.locations || [];
                    const locQuestion = locs.length > 1
                        ? `This role is in *${locs.join(" and ")}* (${activeRoleObj.work_mode || "Hybrid"}). Which location do you prefer, and are you open to relocating?`
                        : locs.length === 1
                            ? `This role is in *${locs[0]}* (${activeRoleObj.work_mode || "Hybrid"}). Are you okay to relocate to *${locs[0]}*?`
                            : `Are you open to relocating for this role?`;
                    return {
                        reply: `Thanks, ${candName}! ${locQuestion}`,
                        tool: { name: "capture_contact", inputs: memory },
                        memory,
                    };
                }
            }
            if (currentRole && !((_0 = state.collected_slots) === null || _0 === void 0 ? void 0 : _0.experience) && !((_1 = state.collected_slots) === null || _1 === void 0 ? void 0 : _1.total_experience)) {
                const minExp = (activeRoleObj === null || activeRoleObj === void 0 ? void 0 : activeRoleObj.min_experience) ? `${activeRoleObj.min_experience}+ years` : "relevant";
                const skills = ((_2 = activeRoleObj === null || activeRoleObj === void 0 ? void 0 : activeRoleObj.skills) === null || _2 === void 0 ? void 0 : _2.length) ? ` with ${activeRoleObj.skills.join(", ")}` : "";
                return {
                    reply: `Great, ${candName}! The *${currentRole}* role requires ${minExp} of experience${skills}. Could you please share your resume (PDF format) and let me know your total and relevant years of experience?`,
                    tool: { name: "capture_contact", inputs: Object.assign({ role: currentRole }, memory) },
                    memory,
                };
            }
            const rolesList = openRoles.length
                ? openRoles
                    .map((r) => `• *${r.title}* (${(r.skills || []).slice(0, 3).join(", ") || "Open"} — ${(r.locations || []).join(", ")})`)
                    .join("\n")
                : "• No active openings at the moment (we can keep your resume on file for upcoming roles)";
            return {
                reply: `Hi ${candName}! I am Priya, your Recruitment Specialist at Sharyx 🎓.\n\nWe currently have openings for:\n${rolesList}\n\nWhich of these roles are you interested in?`,
                memory,
            };
        }
        if (agent.agent_key === "support") {
            if (/(human|agent|talk to|manager|person|call me)/i.test(m)) {
                return {
                    reply: "I'm connecting you with a member of our support team. They will assist you directly.",
                    tool: { name: "transfer_to_human", inputs: { reason: message } },
                    memory,
                };
            }
            return {
                reply: "I have escalated this issue to our technical support team (High Priority). A specialist is reviewing this and will contact you directly.",
                tool: { name: "create_ticket", inputs: { issue: message, priority: "high" } },
                memory,
            };
        }
        return {
            reply: agent.fallback_message || "Thank you for reaching out! How can I assist you further?",
            memory: Object.keys(memory).length ? memory : undefined,
        };
    }
    async findLead(state) {
        try {
            if (state.lead_id)
                return await lead_1.lead.findOne({ where: { id: state.lead_id } });
            if (state.customer_phone) {
                const cleanPhone = state.customer_phone.replace(/[^\d]/g, "");
                const withPlus = "+" + cleanPhone;
                let l = await lead_1.lead.findOne({ where: { phone: state.customer_phone } });
                if (!l)
                    l = await lead_1.lead.findOne({ where: { phone: withPlus } });
                if (!l)
                    l = await lead_1.lead.findOne({ where: { phone: cleanPhone } });
                if (l) {
                    state.lead_id = l.id;
                    return l;
                }
            }
            if (state.customer_email) {
                const l = await lead_1.lead.findOne({ where: { email: state.customer_email } });
                if (l) {
                    state.lead_id = l.id;
                    return l;
                }
            }
        }
        catch (_a) { }
        return null;
    }
    async getWaMeeting(state) {
        var _a;
        if (state.channel !== "whatsapp")
            return null;
        try {
            const conv = await WhatsAppConversation_entity_1.WhatsAppConversation.findOne({ where: { id: state.conversation_ref } });
            return ((_a = conv === null || conv === void 0 ? void 0 : conv.meeting_info) === null || _a === void 0 ? void 0 : _a.meet_url) ? { slot: conv.meeting_info.slot, meet_url: conv.meeting_info.meet_url } : null;
        }
        catch (_b) {
            return null;
        }
    }
    async getBusiness() {
        if (this.bizCache)
            return this.bizCache;
        try {
            const c = await company_1.company.findOne({ where: {} });
            this.bizCache = { name: (c === null || c === void 0 ? void 0 : c.name) || "Sharyx", email: c === null || c === void 0 ? void 0 : c.email, address: c === null || c === void 0 ? void 0 : c.address };
        }
        catch (_a) {
            this.bizCache = { name: "Sharyx" };
        }
        return this.bizCache;
    }
};
exports.AgentOrchestratorService = AgentOrchestratorService;
exports.AgentOrchestratorService = AgentOrchestratorService = AgentOrchestratorService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [AgentLlm_service_1.AgentLlmService,
        AgentTools_service_1.AgentToolsService,
        AiAgent_service_1.AiAgentService,
        JobOpenings_service_1.JobOpeningsService])
], AgentOrchestratorService);
//# sourceMappingURL=AgentOrchestrator.service.js.map