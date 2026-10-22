import { Injectable, Logger } from "@nestjs/common";
import { AiAgent } from "@Database/Table/Agent/AiAgent.entity";
import { ConversationAgentState } from "@Database/Table/Agent/ConversationAgentState.entity";
import { AgentHandoffLog } from "@Database/Table/Agent/AgentHandoffLog.entity";
import { DEFAULT_AGENTS } from "../Agents/DefaultAgents";

/** CRUD + seeding for agents, plus admin queries for states and handoffs. */
@Injectable()
export class AiAgentService {
  private readonly logger = new Logger(AiAgentService.name);
  private seededTenants = new Set<string>();

  async ensureSeeded(tenantId = "default"): Promise<void> {
    if (this.seededTenants.has(tenantId)) return;
    try {
      const existing = await AiAgent.find({ where: { tenant_id: tenantId } });
      const keys = new Set(existing.map((a) => a.agent_key));
      for (const def of DEFAULT_AGENTS) {
        if (keys.has(def.agent_key)) continue;
        const a = new AiAgent();
        Object.assign(a, def);
        a.tenant_id = tenantId;
        a.channels = ["whatsapp", "email"];
        a.announce_handoff = def.agent_key !== "receptionist";
        a.is_active = true;
        a.created_by_id = "system";
        a.created_on = new Date();
        await a.save();
        this.logger.log(`Seeded agent "${def.agent_key}" for tenant ${tenantId}`);
      }
      this.seededTenants.add(tenantId);
    } catch (err: any) {
      this.logger.warn(`Agent seeding failed: ${err.message}`);
    }
  }

  async list(tenantId = "default"): Promise<AiAgent[]> {
    await this.ensureSeeded(tenantId);
    return AiAgent.find({ where: { tenant_id: tenantId, status: true }, order: { sort_order: "ASC" } });
  }

  async getActiveMap(tenantId: string, channel: string): Promise<Map<string, AiAgent>> {
    const agents = await this.list(tenantId);
    const map = new Map<string, AiAgent>();
    agents.filter((a) => a.is_active && (a.channels || []).includes(channel)).forEach((a) => map.set(a.agent_key, a));
    return map;
  }

  async update(id: string, data: Partial<AiAgent>, userId?: string): Promise<AiAgent> {
    const a = await AiAgent.findOne({ where: { id } });
    if (!a) throw new Error("Agent not found");
    const editable: (keyof AiAgent)[] = [
      "display_name", "emoji", "description", "persona_prompt", "knowledge", "allowed_tools",
      "handoff_targets", "channels", "announce_handoff", "handoff_message", "fallback_message",
      "llm_provider", "llm_model", "temperature", "is_active", "sort_order",
    ];
    editable.forEach((k) => {
      if ((data as any)[k] !== undefined) (a as any)[k] = (data as any)[k];
    });
    // Receptionist must always stay active (entry point)
    if (a.agent_key === "receptionist") a.is_active = true;
    a.updated_by_id = userId || "system";
    a.updated_on = new Date();
    return a.save();
  }

  async resetToDefault(id: string): Promise<AiAgent> {
    const a = await AiAgent.findOne({ where: { id } });
    if (!a) throw new Error("Agent not found");
    const def = DEFAULT_AGENTS.find((d) => d.agent_key === a.agent_key);
    if (def) Object.assign(a, def);
    a.updated_on = new Date();
    return a.save();
  }

  async listStates(tenantId = "default", channel?: string) {
    const where: any = { tenant_id: tenantId };
    if (channel) where.channel = channel;
    return ConversationAgentState.find({ where, order: { last_activity_at: "DESC" }, take: 100 });
  }

  async getHandoffs(stateId: string) {
    return AgentHandoffLog.find({
      where: { state_id: stateId },
      order: { created_on: "ASC" },
      select: ["id", "from_agent", "to_agent", "reason", "trigger_message", "channel", "created_on"],
    });
  }

  async setHumanTakeover(stateId: string, takeover: boolean) {
    const s = await ConversationAgentState.findOne({ where: { id: stateId } });
    if (!s) throw new Error("Conversation state not found");
    s.human_takeover = takeover;
    if (!takeover) s.active_agent = "receptionist";
    s.updated_on = new Date();
    return s.save();
  }

  async forceAgent(stateId: string, agentKey: string) {
    const s = await ConversationAgentState.findOne({ where: { id: stateId } });
    if (!s) throw new Error("Conversation state not found");
    s.previous_agent = s.active_agent;
    s.active_agent = agentKey;
    s.human_takeover = false;
    s.updated_on = new Date();
    await s.save();
    const log = new AgentHandoffLog();
    log.tenant_id = s.tenant_id;
    log.state_id = s.id;
    log.channel = s.channel;
    log.from_agent = s.previous_agent;
    log.to_agent = agentKey;
    log.reason = "Manually reassigned by admin";
    log.created_by_id = "admin";
    log.created_on = new Date();
    await log.save();
    return s;
  }
}
