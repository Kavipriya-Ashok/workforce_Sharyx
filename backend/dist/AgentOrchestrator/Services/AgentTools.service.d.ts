import { EventEmitter2 } from "@nestjs/event-emitter";
import { ConversationAgentState } from "@Database/Table/Agent/ConversationAgentState.entity";
export interface AgentToolCall {
    name: string;
    inputs?: Record<string, any>;
}
export interface ToolResult {
    ok: boolean;
    appendText?: string;
    note: string;
}
export declare const AGENT_OUTCOME_EVENT = "agent.outcome";
export interface AgentOutcomeEvent {
    tenantId: string;
    channel: string;
    outcome: string;
    event: string;
    phone?: string;
    email?: string;
    leadName?: string;
    meetUrl?: string;
    summary?: string;
    agentName?: string;
}
export declare class AgentToolsService {
    private readonly events;
    private readonly logger;
    constructor(events: EventEmitter2);
    execute(tool: AgentToolCall, state: ConversationAgentState, agentKey: string, agentName: string): Promise<ToolResult>;
    private getLead;
    private logActivity;
    private captureContact;
    private qualifyLead;
    private notifySales;
    private bookAppointment;
    private emailMeetingLink;
    private cancelAppointment;
    private createTicket;
    private transferToHuman;
    private dispatchVoiceCall;
}
