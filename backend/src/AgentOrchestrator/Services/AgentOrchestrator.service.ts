import { Injectable, Logger } from "@nestjs/common";
import { MoreThan } from "typeorm";
import { AiAgent } from "@Database/Table/Agent/AiAgent.entity";
import { ConversationAgentState } from "@Database/Table/Agent/ConversationAgentState.entity";
import { AgentHandoffLog } from "@Database/Table/Agent/AgentHandoffLog.entity";
import { lead } from "@Database/Table/Lead/lead";
import { company } from "@Database/Table/Admin/company";
import { WhatsAppMessage } from "@Database/Table/WhatsApp/WhatsAppMessage.entity";
import { WhatsAppConversation } from "@Database/Table/WhatsApp/WhatsAppConversation.entity";
import { EmailLog } from "@Database/Table/Email/EmailLog.entity";
import { AgentLlmService, LlmConfig, LlmMessage } from "./AgentLlm.service";
import { AgentToolsService, AgentToolCall } from "./AgentTools.service";
import { AiAgentService } from "./AiAgent.service";
import { AGENT_TOOL_DOCS } from "../Agents/DefaultAgents";

export type AgentChannel = "whatsapp" | "email";

export interface InboundAgentMessage {
  channel: AgentChannel;
  tenantId?: string;
  /** wa_conversation.id for WhatsApp, sender email for Email */
  conversationRef: string;
  message: string;
  subject?: string;
  phone?: string;
  email?: string;
  name?: string;
  leadId?: string;
  /** Optional - if omitted the orchestrator loads history from DB */
  history?: LlmMessage[];
  llm?: LlmConfig;
}

export interface OrchestratorResult {
  reply: string | null;
  agentKey: string;
  agentName: string;
  handoffs: Array<{ from: string; to: string; reason: string }>;
  humanTakeover: boolean;
  stateId?: string;
  usedLlm: boolean;
}

interface AgentLlmOutput {
  reply?: string;
  handoff?: { to?: string; reason?: string; brief?: string } | null;
  tool?: AgentToolCall | null;
  memory?: Record<string, any> | null;
}

const MAX_HANDOFFS_PER_TURN = 2;
const SESSION_RESET_HOURS = 24;

@Injectable()
export class AgentOrchestratorService {
  private readonly logger = new Logger(AgentOrchestratorService.name);

  constructor(
    private readonly llm: AgentLlmService,
    private readonly tools: AgentToolsService,
    private readonly agentService: AiAgentService
  ) {}

  // ════════════════════════════════════════════════════════════════════════
  //  MAIN ENTRY
  // ════════════════════════════════════════════════════════════════════════
  async handle(input: InboundAgentMessage): Promise<OrchestratorResult | null> {
    const tenantId = input.tenantId || "default";
    const agents = await this.agentService.getActiveMap(tenantId, input.channel);
    const receptionist = agents.get("receptionist");
    if (!receptionist) return null; // multi-agent disabled -> caller falls back

    const state = await this.loadState(input, tenantId);

    if (state.human_takeover) {
      state.last_activity_at = new Date();
      await state.save();
      return { reply: null, agentKey: "human", agentName: "Human", handoffs: [], humanTakeover: true, stateId: state.id, usedLlm: false };
    }

    // Returning customer after a long gap -> back to reception (memory kept)
    const gapHours = state.last_activity_at ? (Date.now() - new Date(state.last_activity_at).getTime()) / 36e5 : 0;
    if (gapHours > SESSION_RESET_HOURS && state.active_agent !== "receptionist") {
      state.previous_agent = state.active_agent;
      state.active_agent = "receptionist";
      state.collected_slots = { ...(state.collected_slots || {}), returning_customer: true };
    }
    if (!agents.has(state.active_agent)) state.active_agent = "receptionist";

    const history = input.history ?? (await this.loadHistory(input));
    const normalizedHistory = this.normalizeHistory(history, input.message);
    const userMessage = input.subject && input.channel === "email"
      ? `Subject: ${input.subject}\n\n${input.message}`
      : input.message;

    const handoffs: OrchestratorResult["handoffs"] = [];
    const appendTexts: string[] = [];
    let announcement = "";
    let reply = "";
    let usedLlm = false;
    let current: AiAgent = agents.get(state.active_agent) || receptionist;
    const llmAvailable = this.llm.isAvailable(input.llm);

    for (let hop = 0; hop <= MAX_HANDOFFS_PER_TURN; hop++) {
      current = agents.get(state.active_agent) || receptionist;

      let out: AgentLlmOutput | null = null;

      // ── LLM turn (if available and configured) ─────────────────────────
      if (llmAvailable) {
        try {
          const systemPrompt = await this.buildPrompt(current, agents, state, input, hop > 0);
          out = await this.llm.completeJson<AgentLlmOutput>(systemPrompt, normalizedHistory, userMessage, {
            ...input.llm,
            provider: (current as any).llm_provider || input.llm?.provider,
            model: current.llm_model || input.llm?.model,
            temperature: current.temperature ?? input.llm?.temperature,
          });
          if (out) {
            usedLlm = true;
          }
        } catch (llmErr: any) {
          this.logger.warn(`LLM completion failed (${llmErr.message}), falling back to dynamic workflow`);
        }
      }

      // ── Dynamic Persona & Client-Prompt Engine (when LLM is null or unavailable) ──
      if (!out) {
        out = await this.dynamicTurn(current, userMessage, state, agents, hop);
      }

      // memory
      if (out.memory && typeof out.memory === "object") {
        state.collected_slots = { ...(state.collected_slots || {}), ...this.cleanMemory(out.memory) };
        if (out.memory.name && !state.customer_name) state.customer_name = String(out.memory.name);
        if (out.memory.email && !state.customer_email) state.customer_email = String(out.memory.email);

        // Auto-sync into CRM Leads board whenever name, email, or company are learned
        if (out.memory.name || out.memory.email || out.memory.company) {
          const res = await this.tools.execute(
            { name: "capture_contact", inputs: out.memory },
            state,
            current.agent_key,
            current.display_name
          );
          if (res.appendText && !appendTexts.includes(res.appendText)) {
            appendTexts.push(res.appendText);
          }
        }
      }

      // tool
      if (out.tool?.name) {
        if ((current.allowed_tools || []).includes(out.tool.name)) {
          const res = await this.tools.execute(out.tool, state, current.agent_key, current.display_name);
          this.logger.log(`🛠️ [${current.agent_key}] tool ${out.tool.name} -> ${res.note}`);
          if (res.appendText) appendTexts.push(res.appendText);
          if (out.tool.name === "transfer_to_human") {
            await this.recordHandoff(state, current.agent_key, "human", out.tool.inputs?.reason || "requested", input.message);
            handoffs.push({ from: current.agent_key, to: "human", reason: out.tool.inputs?.reason || "requested" });
          }
        } else {
          this.logger.warn(`Agent ${current.agent_key} tried disallowed tool ${out.tool.name}`);
        }
      }

      // handoff
      const target = out.handoff?.to ? String(out.handoff.to).toLowerCase().trim() : "";
      const lastPair = handoffs[handoffs.length - 1];
      const isPingPong = lastPair && lastPair.from === target && lastPair.to === current.agent_key;
      const canHandoff =
        target &&
        target !== current.agent_key &&
        agents.has(target) &&
        (current.handoff_targets?.length ? current.handoff_targets.includes(target) : true) &&
        hop < MAX_HANDOFFS_PER_TURN &&
        !isPingPong &&
        !state.human_takeover;

      if (canHandoff) {
        const reason = out.handoff?.reason || "intent change";
        state.handoff_brief = out.handoff?.brief || `${current.display_name}: customer asked "${input.message.slice(0, 200)}" (${reason})`;
        await this.recordHandoff(state, current.agent_key, target, reason, input.message);
        handoffs.push({ from: current.agent_key, to: target, reason });
        const next = agents.get(target)!;

        // Log prominent handoff callout
        const custDisp = state.customer_name ? `Customer: ${state.customer_name}` : `Phone: ${state.customer_phone || input.phone || "unknown"}`;
        this.logger.log(`🤝 [AGENT HANDOFF CALL] ${current.display_name} ➡️ ${next.display_name} (${custDisp}) | Reason: ${reason} | Brief: ${state.handoff_brief}`);

        // Transition message to customer
        const nameGreeting = state.customer_name ? ` ${state.customer_name}` : "";
        const transition = (out.reply || "").trim() || (next.handoff_message ? next.handoff_message : `Please wait a moment${nameGreeting}, let me connect you with our ${next.display_name}...`);
        announcement = transition;

        continue; // new agent answers the same message
      }

      reply = (out.reply || "").trim() || current.fallback_message || "";
      break;
    }

    // ── Compose final reply ────────────────────────────────────────────
    const extras = appendTexts.filter((t) => !t.split("\n").some((line) => {
      const url = line.match(/https?:\/\/\S+/)?.[0];
      return url ? reply.includes(url) : false;
    }));
    let finalReply = [announcement, reply, ...extras].filter(Boolean).join(input.channel === "email" ? "\n\n" : "\n\n");
    if (state.human_takeover && !finalReply) {
      finalReply = "👨‍💼 I'm connecting you with a member of our team. They'll be with you shortly.";
    }

    // ── Persist state ──────────────────────────────────────────────────
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

  // ════════════════════════════════════════════════════════════════════════
  //  PROMPT BUILDER
  // ════════════════════════════════════════════════════════════════════════
  private async buildPrompt(
    agent: AiAgent,
    agents: Map<string, AiAgent>,
    state: ConversationAgentState,
    input: InboundAgentMessage,
    justHandedOff: boolean
  ): Promise<string> {
    const biz = await this.getBusiness();
    const now = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "full", timeStyle: "short" });
    const leadRec = await this.findLead(state);
    const isSupport = agent.agent_key === "support";

    const team = [...agents.values()]
      .filter((a) => a.agent_key !== agent.agent_key)
      .map((a) => `- "${a.agent_key}" (${a.emoji || ""} ${a.display_name}): ${a.description || ""}`)
      .join("\n");

    const allowedTools = (agent.allowed_tools || []).map((t) => `- ${AGENT_TOOL_DOCS[t] || t}`).join("\n") || "- (none)";
    const handoffTargets = (agent.handoff_targets || []).filter((t) => agents.has(t));

    let p = `You are part of a multi-agent AI customer team for "${biz.name}". The customer sees ONE company voice - never mention "agents", "handoff", "AI system" or internal processes.
Current date/time (IST): ${now}

═══ YOUR ROLE: ${agent.emoji || ""} ${agent.display_name} ═══
${agent.persona_prompt}
`;

    if (agent.knowledge) p += `\n═══ YOUR KNOWLEDGE (use ONLY these facts, never invent) ═══\n${agent.knowledge}\n`;
    p += `\n═══ COMPANY ═══\nName: ${biz.name}${biz.email ? `\nEmail: ${biz.email}` : ""}${biz.address ? `\nAddress: ${biz.address}` : ""}\n`;
    p += `\n═══ YOUR TEAMMATES (hand off when the request belongs to them) ═══\n${team || "- none"}\nAllowed handoff targets: ${handoffTargets.join(", ") || "none"}\n`;

    const customerName = state.customer_name || leadRec?.name || "";
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

    // Known details (all agents)
    const known: Record<string, any> = {
      name: state.customer_name || leadRec?.name,
      phone: state.customer_phone || leadRec?.phone,
      email: state.customer_email || leadRec?.email,
      company: leadRec?.company_name,
      pipeline_stage: leadRec?.lead_status,
      ...(state.collected_slots || {}),
    };
    Object.keys(known).forEach((k) => (known[k] === undefined || known[k] === null || known[k] === "") && delete known[k]);
    p += `\n═══ KNOWN CUSTOMER DETAILS (never ask again) ═══\n${JSON.stringify(known, null, 2)}\n`;

    // Existing appointment
    const appt = state.collected_slots?.appointment || (await this.getWaMeeting(state));
    if (appt?.meet_url) {
      p += `\n═══ EXISTING APPOINTMENT ═══\n${appt.type || "Meeting"} on ${appt.slot} | Google Meet: ${appt.meet_url}\nIf asked for the link/time, share it directly.\n`;
    }

    // Support = full 360°
    if (isSupport) p += await this.build360(state, leadRec);

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

  private async build360(state: ConversationAgentState, leadRec: lead | null): Promise<string> {
    let s = `\n═══ CUSTOMER 360° OVERVIEW (Support has full visibility) ═══\n`;
    if (leadRec) {
      s += `CRM: ${leadRec.name || "-"} | ${leadRec.company_name || "-"} | stage ${leadRec.lead_status} | score ${leadRec.score} | source ${leadRec.source}\n`;
      if (leadRec.notes) s += `Notes: ${String(leadRec.notes).slice(0, 400)}\n`;
    }
    try {
      const phone = state.customer_phone || leadRec?.phone;
      if (phone) {
        const conv = await WhatsAppConversation.findOne({ where: { customer_phone: phone } });
        if (conv) {
          const msgs = await WhatsAppMessage.find({ where: { conversation_id: conv.id }, order: { created_on: "DESC" }, take: 15 });
          if (msgs.length) {
            s += `\nWhatsApp (latest ${msgs.length}):\n` + msgs.reverse().map((m) => `  [${m.direction}] ${String(m.message_text || "").slice(0, 160)}`).join("\n") + "\n";
          }
        }
      }
      const email = state.customer_email || leadRec?.email;
      if (email || leadRec?.id) {
        const where: any[] = [];
        if (email) where.push({ from_email: email }, { to_email: email });
        if (leadRec?.id) where.push({ lead_id: leadRec.id });
        const mails = await EmailLog.find({ where, order: { created_on: "DESC" }, take: 8 });
        if (mails.length) {
          s += `\nEmails (latest ${mails.length}):\n` + mails.reverse().map((m) => `  [${m.direction}] ${m.subject || ""} - ${String(m.body_text || "").replace(/\s+/g, " ").slice(0, 160)}`).join("\n") + "\n";
        }
      }
      const handoffs = await AgentHandoffLog.find({ where: { state_id: state.id }, order: { created_on: "DESC" }, take: 8 });
      if (handoffs.length) {
        s += `\nAgent journey: ` + handoffs.reverse().map((h) => `${h.from_agent}→${h.to_agent} (${h.reason})`).join(" | ") + "\n";
      }
      const tickets = state.collected_slots?.tickets;
      if (tickets?.length) s += `\nOpen tickets: ${JSON.stringify(tickets)}\n`;
    } catch (err: any) {
      this.logger.warn(`360 build failed: ${err.message}`);
    }
    return s;
  }

  // ════════════════════════════════════════════════════════════════════════
  //  STATE / HISTORY HELPERS
  // ════════════════════════════════════════════════════════════════════════
  private async loadState(input: InboundAgentMessage, tenantId: string): Promise<ConversationAgentState> {
    let state = await ConversationAgentState.findOne({
      where: { tenant_id: tenantId, channel: input.channel, conversation_ref: input.conversationRef },
    });
    if (!state) {
      state = new ConversationAgentState();
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
    if (input.phone) state.customer_phone = input.phone;
    if (input.email) state.customer_email = input.email;
    if (input.name && (!state.customer_name || /^\+?\d+$/.test(state.customer_name))) state.customer_name = input.name;
    if (input.leadId) state.lead_id = input.leadId;
    if (!state.id) await state.save();
    return state;
  }

  private async loadHistory(input: InboundAgentMessage): Promise<LlmMessage[]> {
    try {
      if (input.channel === "whatsapp") {
        const msgs = await WhatsAppMessage.find({
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
      const logs = await EmailLog.find({
        where: [
          { from_email: email, created_on: MoreThan(since) },
          { to_email: email, created_on: MoreThan(since) },
        ],
        order: { created_on: "DESC" },
        take: 8,
      });
      return logs.reverse().map((l) => ({
        role: l.direction === "outbound" ? "assistant" : "user",
        content: String(l.body_text || l.subject || "").slice(0, 1200),
      }));
    } catch {
      return [];
    }
  }

  /** Remove current message duplicate, merge same-role runs, start with user. */
  private normalizeHistory(history: LlmMessage[], current: string): LlmMessage[] {
    const h = [...(history || [])].filter((m) => m.content?.trim());
    if (h.length && h[h.length - 1].role === "user" && h[h.length - 1].content.trim() === current.trim()) h.pop();
    const merged: LlmMessage[] = [];
    for (const m of h) {
      const last = merged[merged.length - 1];
      if (last && last.role === m.role) last.content += `\n${m.content}`;
      else merged.push({ ...m });
    }
    while (merged.length && merged[0].role !== "user") merged.shift();
    if (merged.length && merged[merged.length - 1].role === "user") {
      // must alternate before the new user turn
      merged.push({ role: "assistant", content: "(noted)" });
    }
    return merged.slice(-12);
  }

  private async recordHandoff(state: ConversationAgentState, from: string, to: string, reason: string, msg: string) {
    if (to !== "human") {
      state.previous_agent = from;
      state.active_agent = to;
    }
    state.handoff_count = (state.handoff_count || 0) + 1;
    try {
      const log = new AgentHandoffLog();
      log.tenant_id = state.tenant_id;
      log.state_id = state.id;
      log.channel = state.channel;
      log.from_agent = from;
      log.to_agent = to;
      log.reason = reason;
      log.trigger_message = msg?.slice(0, 500);
      log.created_by_id = "agent_orchestrator";
      log.created_on = new Date();
      await log.save();
    } catch (err: any) {
      this.logger.warn(`Handoff log failed: ${err.message}`);
    }
  }

  private keywordRoute(text: string): string | null {
    const t = (text || "").toLowerCase();
    if (/(not working|issue|problem|error|bug|complain|complaint|refund|broken|support|human|real person|talk to (a|someone)|manager)/.test(t)) return "support";
    if (/(job|career|resume|cv|hiring|apply|applicant|candidate|vacancy|opening|employment|ctc|notice period|reliev)/.test(t)) return "recruitment";
    if (/(demo|book|schedule|appointment|meeting|interview|slot|reschedule|call me|meet)/.test(t)) return "appointment";
    if (/(price|pricing|cost|plan|quote|quotation|how much|buy|purchase|discount|package|rate|evlo|evvalavu|vilai)/.test(t)) return "sales";
    return null;
  }

  private cleanMemory(mem: Record<string, any>): Record<string, any> {
    const out: Record<string, any> = {};
    Object.entries(mem).forEach(([k, v]) => {
      if (v !== null && v !== undefined && v !== "" && !["appointment", "tickets"].includes(k)) out[k] = v;
    });
    return out;
  }

  /**
   * Dynamic Persona & Client-Prompt Engine:
   * Dynamically asks intake questions from the agent creation persona prompt,
   * extracts information (Name, Company, Email, Requirement, Seats, Date/Time),
   * performs automatic handoffs, and automatically sends Google Meet links to email.
   */
  private async dynamicTurn(
    agent: AiAgent,
    message: string,
    state: ConversationAgentState,
    agents: Map<string, AiAgent>,
    hop: number
  ): Promise<AgentLlmOutput> {
    const m = (message || "").toLowerCase().trim();
    const memory: Record<string, any> = {};

    // 1. Entity Extraction
    const emailMatch = message.match(/[\w.-]+@[\w.-]+\.\w+/);
    if (emailMatch) memory.email = emailMatch[0];

    const explicitNameMatch = message.match(/(?:my name is|i am|i'm|this is|call me)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
    if (explicitNameMatch) {
      memory.name = explicitNameMatch[1];
    } else if (!state.customer_name && !state.collected_slots?.name) {
      // If customer provides just their name (e.g., "Kavi", "Kavipriya", "John Doe")
      const words = message.trim().split(/\s+/);
      if (
        words.length <= 3 &&
        /^[A-Za-z\s.'-]+$/.test(message.trim()) &&
        !/^(hi|hello|hey|vanakkam|pricing|price|demo|book|support|help|sales|yes|no|ok|sure|thanks|users|seats)$/i.test(message.trim())
      ) {
        memory.name = message.trim();
      }
    }

    const companyMatch = message.match(/(?:company(?: name)?(?: is)?|from|org(?:anization)?(?: is)?|working at)\s+([A-Za-z0-9&.\s]+)/i);
    if (companyMatch) {
      memory.company = companyMatch[1].trim();
    }

    // 2. Google Meet & Email Linking Logic
    // If the customer provided an email address:
    if (emailMatch) {
      const email = emailMatch[0];
      const convMeet = await this.getWaMeeting(state);
      const existingMeetUrl = state.collected_slots?.appointment?.meet_url || convMeet?.meet_url;
      const existingSlot = state.collected_slots?.appointment?.slot || convMeet?.slot || "Scheduled Session";

      // If an appointment was already booked or discussed:
      if (existingMeetUrl) {
        return {
          reply: `I've sent the Google Meet invitation directly to your email (*${email}*)! ✉️\n\n🗓️ Slot: ${existingSlot}\n🎥 Join: ${existingMeetUrl}\n\nIs there anything specific you would like our specialist to cover during the session?`,
          tool: { name: "email_meeting_link", inputs: { email, slot: existingSlot } },
          memory,
        };
      }
    }

    // If customer explicitly asks to email or send the meeting link:
    if (/(?:email|mail).*(?:link|meet|appointment)|(?:send|share|give).*(?:link|meet).*(?:email|mail)/i.test(m)) {
      const targetEmail = memory.email || state.customer_email;
      if (targetEmail) {
        const convMeet = await this.getWaMeeting(state);
        const slot = state.collected_slots?.appointment?.slot || convMeet?.slot || "Tomorrow 10:00 AM";
        return {
          reply: `I've sent the Google Meet invitation directly to your email (*${targetEmail}*)! ✉️`,
          tool: { name: "email_meeting_link", inputs: { email: targetEmail, slot } },
          memory,
        };
      } else {
        return {
          reply: "I would be delighted to email the Google Meet invitation to you! Could you please share your email address? ✉️",
          memory,
        };
      }
    }

    // 3. Receptionist Dynamic Flow
    if (agent.agent_key === "receptionist") {
      const cust = memory.name || state.customer_name || "";
      const namePart = cust ? ` ${cust}` : "";

      // Handoff to Sales
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

      // Handoff to Appointment
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

      // Handoff to Support
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

      // Handoff to Recruitment
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

      // If user provided Name
      if (memory.name && !state.customer_name) {
        return {
          reply: `Nice to meet you, ${memory.name}! Welcome to Sharyx 👋\n\nMay I know your company name and what is your best email address so we can register your inquiry and share our product guide with you?`,
          tool: { name: "capture_contact", inputs: memory },
          memory,
        };
      }

      // If user provided Email
      if (memory.email && !state.customer_email) {
        return {
          reply: `Thank you! I've registered your email (*${memory.email}*).\n\nWhat product or service are you exploring today? We offer AI Voice Calling, WhatsApp Copilots, and Email Automation!`,
          tool: { name: "capture_contact", inputs: memory },
          memory,
        };
      }

      // Product knowledge questions
      if (/(product|feature|service|what do you|tell me about|info|email automation|voice agent|whatsapp)/i.test(m)) {
        return {
          reply: `We provide an Autonomous AI Workforce platform featuring:\n🎙️ AI Voice Agent: 24/7 autonomous phone calling & lead qualification\n💬 WhatsApp AI Copilot: Meta Cloud API smart messaging & support\n✉️ Email AI Copilot: Inbox auto-replies & campaign workflows\n📊 Real-Time CRM: Automated lead tracking\n\nWould you like to explore our pricing plans, or schedule a live Google Meet demo?`,
          memory,
        };
      }

      // Initial greeting / prompt intake (Warm welcome + asking basic details)
      return {
        reply: "Hi 👋 Welcome to Sharyx! May I know your name and company name, and your email address so we can register your inquiry and share our product guide with you?",
        memory,
      };
    }

    // 4. Sales Specialist Dynamic Flow
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
        } else {
          return {
            reply: `Got it, ${count} users! For up to 20 users, our Growth Plan at ₹14,999/month is ideal. It includes 5 AI agents, Voice, WhatsApp, Email, and CRM. Would you like to schedule a quick 15-minute Google Meet demo to see it in action?`,
            tool: { name: "qualify_lead", inputs: { seats: count, interest_level: "warm" } },
            memory,
          };
        }
      }

      // User agrees to demo or asks for demo
      if (/(yes|sure|book|schedule|demo|meet|call|okay|ok|interested)/i.test(m)) {
        return {
          reply: "I'll connect you with our Appointment Desk right away to pick the best Google Meet slot for your demo 📅!",
          handoff: {
            to: "appointment",
            reason: "demo booking",
            brief: `Customer agreed to demo for ${state.collected_slots?.seats || "their team"}`,
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

    // 5. Appointment Desk Dynamic Flow
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

      const appt = state.collected_slots?.appointment;
      if (appt?.meet_url) {
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

    // 6. Recruitment Specialist Dynamic Flow
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

    // 7. Support Lead Dynamic Flow
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

  private async findLead(state: ConversationAgentState): Promise<lead | null> {
    try {
      if (state.lead_id) return await lead.findOne({ where: { id: state.lead_id } });
      if (state.customer_phone) {
        const l = await lead.findOne({ where: { phone: state.customer_phone, status: true } });
        if (l) {
          state.lead_id = l.id;
          return l;
        }
      }
      if (state.customer_email) {
        const l = await lead.findOne({ where: { email: state.customer_email, status: true } });
        if (l) {
          state.lead_id = l.id;
          return l;
        }
      }
    } catch {}
    return null;
  }

  private async getWaMeeting(state: ConversationAgentState): Promise<any> {
    if (state.channel !== "whatsapp") return null;
    try {
      const conv = await WhatsAppConversation.findOne({ where: { id: state.conversation_ref } });
      return conv?.meeting_info?.meet_url ? { slot: conv.meeting_info.slot, meet_url: conv.meeting_info.meet_url } : null;
    } catch {
      return null;
    }
  }

  private bizCache: { name: string; email?: string; address?: string } | null = null;
  private async getBusiness() {
    if (this.bizCache) return this.bizCache;
    try {
      const c: any = await company.findOne({ where: {} });
      this.bizCache = { name: c?.name || "Sharyx", email: c?.email, address: c?.address };
    } catch {
      this.bizCache = { name: "Sharyx" };
    }
    return this.bizCache;
  }
}
