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
const MAX_HANDOFFS_PER_TURN = 2;
const SESSION_RESET_HOURS = 24;
let AgentOrchestratorService = AgentOrchestratorService_1 = class AgentOrchestratorService {
    constructor(llm, tools, agentService) {
        this.llm = llm;
        this.tools = tools;
        this.agentService = agentService;
        this.logger = new common_1.Logger(AgentOrchestratorService_1.name);
        this.bizCache = null;
    }
    async handle(input) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
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
            if (llmAvailable) {
                try {
                    const systemPrompt = await this.buildPrompt(current, agents, state, input, hop > 0);
                    out = await this.llm.completeJson(systemPrompt, normalizedHistory, userMessage, Object.assign(Object.assign({}, input.llm), { provider: current.llm_provider || ((_b = input.llm) === null || _b === void 0 ? void 0 : _b.provider), model: current.llm_model || ((_c = input.llm) === null || _c === void 0 ? void 0 : _c.model), temperature: (_d = current.temperature) !== null && _d !== void 0 ? _d : (_e = input.llm) === null || _e === void 0 ? void 0 : _e.temperature }));
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
                if (out.memory.name || out.memory.email || out.memory.company) {
                    const res = await this.tools.execute({ name: "capture_contact", inputs: out.memory }, state, current.agent_key, current.display_name);
                    if (res.appendText && !appendTexts.includes(res.appendText)) {
                        appendTexts.push(res.appendText);
                    }
                }
            }
            if ((_f = out.tool) === null || _f === void 0 ? void 0 : _f.name) {
                if ((current.allowed_tools || []).includes(out.tool.name)) {
                    const res = await this.tools.execute(out.tool, state, current.agent_key, current.display_name);
                    this.logger.log(`🛠️ [${current.agent_key}] tool ${out.tool.name} -> ${res.note}`);
                    if (res.appendText)
                        appendTexts.push(res.appendText);
                    if (out.tool.name === "transfer_to_human") {
                        await this.recordHandoff(state, current.agent_key, "human", ((_g = out.tool.inputs) === null || _g === void 0 ? void 0 : _g.reason) || "requested", input.message);
                        handoffs.push({ from: current.agent_key, to: "human", reason: ((_h = out.tool.inputs) === null || _h === void 0 ? void 0 : _h.reason) || "requested" });
                    }
                }
                else {
                    this.logger.warn(`Agent ${current.agent_key} tried disallowed tool ${out.tool.name}`);
                }
            }
            const target = ((_j = out.handoff) === null || _j === void 0 ? void 0 : _j.to) ? String(out.handoff.to).toLowerCase().trim() : "";
            const lastPair = handoffs[handoffs.length - 1];
            const isPingPong = lastPair && lastPair.from === target && lastPair.to === current.agent_key;
            const canHandoff = target &&
                target !== current.agent_key &&
                agents.has(target) &&
                (((_k = current.handoff_targets) === null || _k === void 0 ? void 0 : _k.length) ? current.handoff_targets.includes(target) : true) &&
                hop < MAX_HANDOFFS_PER_TURN &&
                !isPingPong &&
                !state.human_takeover;
            if (canHandoff) {
                const reason = ((_l = out.handoff) === null || _l === void 0 ? void 0 : _l.reason) || "intent change";
                state.handoff_brief = ((_m = out.handoff) === null || _m === void 0 ? void 0 : _m.brief) || `${current.display_name}: customer asked "${input.message.slice(0, 200)}" (${reason})`;
                await this.recordHandoff(state, current.agent_key, target, reason, input.message);
                handoffs.push({ from: current.agent_key, to: target, reason });
                const next = agents.get(target);
                const custDisp = state.customer_name ? `Customer: ${state.customer_name}` : `Phone: ${state.customer_phone || input.phone || "unknown"}`;
                this.logger.log(`🤝 [AGENT HANDOFF CALL] ${current.display_name} ➡️ ${next.display_name} (${custDisp}) | Reason: ${reason} | Brief: ${state.handoff_brief}`);
                const nameGreeting = state.customer_name ? ` ${state.customer_name}` : "";
                const transition = (out.reply || "").trim() || (next.handoff_message ? next.handoff_message : `Please wait a moment${nameGreeting}, let me connect you with our ${next.display_name}...`);
                announcement = transition;
                continue;
            }
            reply = (out.reply || "").trim() || current.fallback_message || "";
            break;
        }
        const extras = appendTexts.filter((t) => !t.split("\n").some((line) => {
            var _a;
            const url = (_a = line.match(/https?:\/\/\S+/)) === null || _a === void 0 ? void 0 : _a[0];
            return url ? reply.includes(url) : false;
        }));
        let finalReply = [announcement, reply, ...extras].filter(Boolean).join(input.channel === "email" ? "\n\n" : "\n\n");
        if (state.human_takeover && !finalReply) {
            finalReply = "👨‍💼 I'm connecting you with a member of our team. They'll be with you shortly.";
        }
        state.turn_count = (state.turn_count || 0) + 1;
        state.last_activity_at = new Date();
        state.updated_on = new Date();
        await state.save();
        return {
            reply: finalReply || null,
            agentKey: current.agent_key,
            agentName: current.display_name,
            handoffs,
            humanTakeover: state.human_takeover,
            stateId: state.id,
            usedLlm,
        };
    }
    async buildPrompt(agent, agents, state, input, justHandedOff) {
        var _a;
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
- Explicitly acknowledge what they enquired about from the handoff brief (for example: "I heard you enquired about [topic from brief] - shall we discuss [pricing/packages/next steps]?").
- Keep it natural, warm, and directly address their request without making them repeat anything.\n`;
            }
        }
        const known = Object.assign({ name: state.customer_name || (leadRec === null || leadRec === void 0 ? void 0 : leadRec.name), phone: state.customer_phone || (leadRec === null || leadRec === void 0 ? void 0 : leadRec.phone), email: state.customer_email || (leadRec === null || leadRec === void 0 ? void 0 : leadRec.email), company: leadRec === null || leadRec === void 0 ? void 0 : leadRec.company_name, pipeline_stage: leadRec === null || leadRec === void 0 ? void 0 : leadRec.lead_status }, (state.collected_slots || {}));
        Object.keys(known).forEach((k) => (known[k] === undefined || known[k] === null || known[k] === "") && delete known[k]);
        p += `\n═══ KNOWN CUSTOMER DETAILS (never ask again) ═══\n${JSON.stringify(known, null, 2)}\n`;
        const appt = ((_a = state.collected_slots) === null || _a === void 0 ? void 0 : _a.appointment) || (await this.getWaMeeting(state));
        if (appt === null || appt === void 0 ? void 0 : appt.meet_url) {
            p += `\n═══ EXISTING APPOINTMENT ═══\n${appt.type || "Meeting"} on ${appt.slot} | Google Meet: ${appt.meet_url}\nIf asked for the link/time, share it directly.\n`;
        }
        if (isSupport)
            p += await this.build360(state, leadRec);
        p += `\n═══ CHANNEL: ${input.channel.toUpperCase()} ═══\n`;
        p +=
            input.channel === "whatsapp"
                ? `- Keep it SHORT: 1-3 sentences, chatty and warm. Use *bold* sparingly and at most 1-2 emojis.\n- Ask only ONE question at a time.\n`
                : `- Write a professional email body in plain text (no markdown, no HTML): greeting with the customer's name, 2-3 short paragraphs, clear next step, sign off as "${agent.display_name}, ${biz.name}".\n- Do NOT include a subject line.\n`;
        p += `- Reply in the customer's language (English / Tamil / Tanglish).\n`;
        p += `\n═══ TOOLS YOU MAY CALL (at most one per turn) ═══\n${allowedTools}\n`;
        p += `- When the customer asks to receive or share the meeting link via email (e.g. "send meeting link in email", "email me the link"), call "email_meeting_link". If their email is unknown, ask for their email address.\n`;
        p += `
═══ OUTPUT: STRICT JSON ONLY ═══
{
  "reply": "message to the customer (when handing off, write a short transition like 'Please hold on a moment, let me connect you with our <Specialist>...')",
  "handoff": null OR { "to": "<agent_key>", "reason": "short reason", "brief": "2-4 lines for the next teammate: who the customer is, what they want, details collected, what is pending" },
  "tool": null OR { "name": "<tool_name>", "inputs": { ... } },
  "memory": { "key facts learned THIS turn, e.g. name, company, email, interest, seats, budget, meeting_type, preferred_time" }
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
        var _a, _b, _c, _d, _e, _f, _g, _h, _j;
        const m = (message || "").toLowerCase().trim();
        const memory = {};
        const emailMatch = message.match(/[\w.-]+@[\w.-]+\.\w+/);
        if (emailMatch)
            memory.email = emailMatch[0];
        const explicitNameMatch = message.match(/(?:my name is|i am|i'm|this is|call me)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
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
            if (/(demo|book|appointment|schedule|meeting|slot|reschedule|call me|meet)/i.test(m)) {
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
            if (/(not working|issue|problem|error|bug|complain|complaint|refund|broken|support|human|real person|talk to|manager)/i.test(m)) {
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
            if (/(job|career|resume|cv|hiring|apply|applicant|candidate|vacancy|opening|employment)/i.test(m)) {
                return {
                    reply: `Let me connect you with our Recruitment Specialist${namePart} 🎓!`,
                    handoff: {
                        to: "recruitment",
                        reason: "job inquiry",
                        brief: `${cust ? `Customer ${cust}` : "Candidate"} inquired about careers: "${message.slice(0, 150)}"`,
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
                    reply: `We provide an Autonomous AI Workforce platform featuring:\n🎙️ AI Voice Agent: 24/7 autonomous phone calling & lead qualification\n💬 WhatsApp AI Copilot: Meta Cloud API smart messaging & support\n✉️ Email AI Copilot: Inbox auto-replies & campaign workflows\n📊 Real-Time CRM: Automated lead tracking\n\nWould you like to explore our pricing plans, or schedule a live Google Meet demo?`,
                    memory,
                };
            }
            return {
                reply: "Hi 👋 Welcome to Sharyx! May I know your name and company name, and your email address so we can register your inquiry and share our product guide with you?",
                memory,
            };
        }
        if (agent.agent_key === "sales") {
            const custName = memory.name || state.customer_name || "";
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
                        brief: `Customer agreed to demo for ${((_h = state.collected_slots) === null || _h === void 0 ? void 0 : _h.seats) || "their team"}`,
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
            const appt = (_j = state.collected_slots) === null || _j === void 0 ? void 0 : _j.appointment;
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
            const expMatch = message.match(/(\d+)\s*(yrs?|years?)/i);
            if (expMatch) {
                memory.experience = expMatch[0];
                return {
                    reply: `Thank you! Noted ${expMatch[0]} of experience. What is your current employment status, notice period, and expected CTC?`,
                    memory,
                };
            }
            if (/(ctc|lpa|notice|immediate|serving)/i.test(m)) {
                return {
                    reply: "Got it! Let me connect you with our Appointment Desk to schedule your interview round on Google Meet 📅!",
                    handoff: { to: "appointment", reason: "interview booking", brief: "Candidate screened for interview" },
                    tool: { name: "capture_contact", inputs: memory },
                    memory,
                };
            }
            return {
                reply: "Welcome to Sharyx Careers! We are hiring for AI Solutions Engineer, Business Development Executive, and Frontend Developer. Which role are you applying for?",
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
                const l = await lead_1.lead.findOne({ where: { phone: state.customer_phone, status: true } });
                if (l) {
                    state.lead_id = l.id;
                    return l;
                }
            }
            if (state.customer_email) {
                const l = await lead_1.lead.findOne({ where: { email: state.customer_email, status: true } });
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
        AiAgent_service_1.AiAgentService])
], AgentOrchestratorService);
//# sourceMappingURL=AgentOrchestrator.service.js.map