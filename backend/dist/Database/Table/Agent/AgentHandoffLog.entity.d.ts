import { BaseTable } from "../BaseTable";
export declare class AgentHandoffLog extends BaseTable {
    tenant_id: string;
    state_id: string;
    channel: string;
    from_agent: string;
    to_agent: string;
    reason: string;
    trigger_message: string;
}
