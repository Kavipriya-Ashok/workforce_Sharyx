"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var AiAgentService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiAgentService = void 0;
const common_1 = require("@nestjs/common");
const AiAgent_entity_1 = require("../../Database/Table/Agent/AiAgent.entity");
const ConversationAgentState_entity_1 = require("../../Database/Table/Agent/ConversationAgentState.entity");
const AgentHandoffLog_entity_1 = require("../../Database/Table/Agent/AgentHandoffLog.entity");
const DefaultAgents_1 = require("../Agents/DefaultAgents");
let AiAgentService = AiAgentService_1 = class AiAgentService {
    constructor() {
        this.logger = new common_1.Logger(AiAgentService_1.name);
        this.seededTenants = new Set();
    }
    async ensureSeeded(tenantId = "default") {
        if (this.seededTenants.has(tenantId))
            return;
        try {
            const existing = await AiAgent_entity_1.AiAgent.find({ where: { tenant_id: tenantId } });
            const keys = new Set(existing.map((a) => a.agent_key));
            for (const def of DefaultAgents_1.DEFAULT_AGENTS) {
                if (keys.has(def.agent_key))
                    continue;
                const a = new AiAgent_entity_1.AiAgent();
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
        }
        catch (err) {
            this.logger.warn(`Agent seeding failed: ${err.message}`);
        }
    }
    async list(tenantId = "default") {
        await this.ensureSeeded(tenantId);
        return AiAgent_entity_1.AiAgent.find({ where: { tenant_id: tenantId, status: true }, order: { sort_order: "ASC" } });
    }
    async getActiveMap(tenantId, channel) {
        const agents = await this.list(tenantId);
        const map = new Map();
        agents.filter((a) => a.is_active && (a.channels || []).includes(channel)).forEach((a) => map.set(a.agent_key, a));
        return map;
    }
    async update(id, data, userId) {
        const a = await AiAgent_entity_1.AiAgent.findOne({ where: { id } });
        if (!a)
            throw new Error("Agent not found");
        const editable = [
            "display_name", "emoji", "description", "persona_prompt", "knowledge", "allowed_tools",
            "handoff_targets", "channels", "announce_handoff", "handoff_message", "fallback_message",
            "llm_provider", "llm_model", "temperature", "is_active", "sort_order",
        ];
        editable.forEach((k) => {
            if (data[k] !== undefined)
                a[k] = data[k];
        });
        if (a.agent_key === "receptionist")
            a.is_active = true;
        a.updated_by_id = userId || "system";
        a.updated_on = new Date();
        return a.save();
    }
    async resetToDefault(id) {
        const a = await AiAgent_entity_1.AiAgent.findOne({ where: { id } });
        if (!a)
            throw new Error("Agent not found");
        const def = DefaultAgents_1.DEFAULT_AGENTS.find((d) => d.agent_key === a.agent_key);
        if (def)
            Object.assign(a, def);
        a.updated_on = new Date();
        return a.save();
    }
    async listStates(tenantId = "default", channel) {
        const where = { tenant_id: tenantId };
        if (channel)
            where.channel = channel;
        return ConversationAgentState_entity_1.ConversationAgentState.find({ where, order: { last_activity_at: "DESC" }, take: 100 });
    }
    async getHandoffs(stateId) {
        return AgentHandoffLog_entity_1.AgentHandoffLog.find({
            where: { state_id: stateId },
            order: { created_on: "ASC" },
            select: ["id", "from_agent", "to_agent", "reason", "trigger_message", "channel", "created_on"],
        });
    }
    async setHumanTakeover(stateId, takeover) {
        const s = await ConversationAgentState_entity_1.ConversationAgentState.findOne({ where: { id: stateId } });
        if (!s)
            throw new Error("Conversation state not found");
        s.human_takeover = takeover;
        if (!takeover)
            s.active_agent = "receptionist";
        s.updated_on = new Date();
        return s.save();
    }
    async forceAgent(stateId, agentKey) {
        const s = await ConversationAgentState_entity_1.ConversationAgentState.findOne({ where: { id: stateId } });
        if (!s)
            throw new Error("Conversation state not found");
        s.previous_agent = s.active_agent;
        s.active_agent = agentKey;
        s.human_takeover = false;
        s.updated_on = new Date();
        await s.save();
        const log = new AgentHandoffLog_entity_1.AgentHandoffLog();
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
};
exports.AiAgentService = AiAgentService;
exports.AiAgentService = AiAgentService = AiAgentService_1 = __decorate([
    (0, common_1.Injectable)()
], AiAgentService);
//# sourceMappingURL=AiAgent.service.js.map