import { AiAgent } from "@Database/Table/Agent/AiAgent.entity";
import { ConversationAgentState } from "@Database/Table/Agent/ConversationAgentState.entity";
import { AgentHandoffLog } from "@Database/Table/Agent/AgentHandoffLog.entity";
export declare class AiAgentService {
    private readonly logger;
    private seededTenants;
    ensureSeeded(tenantId?: string): Promise<void>;
    list(tenantId?: string): Promise<AiAgent[]>;
    getActiveMap(tenantId: string, channel: string): Promise<Map<string, AiAgent>>;
    update(id: string, data: Partial<AiAgent>, userId?: string): Promise<AiAgent>;
    resetToDefault(id: string): Promise<AiAgent>;
    listStates(tenantId?: string, channel?: string): Promise<ConversationAgentState[]>;
    getHandoffs(stateId: string): Promise<AgentHandoffLog[]>;
    setHumanTakeover(stateId: string, takeover: boolean): Promise<ConversationAgentState>;
    forceAgent(stateId: string, agentKey: string): Promise<ConversationAgentState>;
}
