import { AgentLlmService, LlmConfig, LlmMessage } from "./AgentLlm.service";
import { AgentToolsService } from "./AgentTools.service";
import { AiAgentService } from "./AiAgent.service";
export type AgentChannel = "whatsapp" | "email";
export interface InboundAgentMessage {
    channel: AgentChannel;
    tenantId?: string;
    conversationRef: string;
    message: string;
    subject?: string;
    phone?: string;
    email?: string;
    name?: string;
    leadId?: string;
    history?: LlmMessage[];
    llm?: LlmConfig;
}
export interface OrchestratorResult {
    reply: string | null;
    agentKey: string;
    agentName: string;
    handoffs: Array<{
        from: string;
        to: string;
        reason: string;
    }>;
    humanTakeover: boolean;
    stateId?: string;
    usedLlm: boolean;
}
export declare class AgentOrchestratorService {
    private readonly llm;
    private readonly tools;
    private readonly agentService;
    private readonly logger;
    constructor(llm: AgentLlmService, tools: AgentToolsService, agentService: AiAgentService);
    handle(input: InboundAgentMessage): Promise<OrchestratorResult | null>;
    private buildPrompt;
    private build360;
    private loadState;
    private loadHistory;
    private normalizeHistory;
    private recordHandoff;
    private keywordRoute;
    private cleanMemory;
    private dynamicTurn;
    private findLead;
    private getWaMeeting;
    private bizCache;
    private getBusiness;
}
