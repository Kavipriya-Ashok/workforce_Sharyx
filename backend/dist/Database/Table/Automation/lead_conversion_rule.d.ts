import { BaseTable } from "../BaseTable";
export declare enum WorkflowTriggerEvent {
    CALL_OUTCOME = "on_call_outcome",
    STAGE_CHANGE = "on_stage_change"
}
export declare class LeadConversionRule extends BaseTable {
    tenant_id: string;
    name: string;
    description: string;
    rule_type: string;
    trigger_event: string;
    outcome_trigger: string;
    match_type: string;
    min_call_duration_seconds: number;
    require_goal_achieved: boolean;
    priority: number;
    is_active: boolean;
    action_move_lead_stage: string;
    action_create_crm_deal: boolean;
    action_crm_deal_stage: string;
    action_deal_value: number;
    action_convert_to_customer: boolean;
    target_customer_status: string;
    target_customer_tier: string;
    action_send_email: boolean;
    action_email_trigger_type: string;
    action_send_whatsapp: boolean;
    action_whatsapp_trigger: string;
    auto_tags: string[];
}
