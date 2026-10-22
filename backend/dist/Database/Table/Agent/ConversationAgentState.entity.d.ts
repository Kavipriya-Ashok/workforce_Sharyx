import { BaseTable } from "../BaseTable";
export declare class ConversationAgentState extends BaseTable {
    tenant_id: string;
    channel: string;
    conversation_ref: string;
    customer_phone: string;
    customer_email: string;
    customer_name: string;
    lead_id: string;
    active_agent: string;
    previous_agent: string;
    handoff_count: number;
    handoff_brief: string;
    collected_slots: Record<string, any>;
    human_takeover: boolean;
    turn_count: number;
    last_activity_at: Date;
}
