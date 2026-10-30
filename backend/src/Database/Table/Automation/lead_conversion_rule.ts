import { Entity, Column, Index } from "typeorm";
import { BaseTable } from "../BaseTable";

export enum WorkflowTriggerEvent {
  CALL_OUTCOME = "on_call_outcome",
  STAGE_CHANGE = "on_stage_change",
}

@Entity({ name: "lead_conversion_rule" })
export class LeadConversionRule extends BaseTable {
  @Index()
  @Column({ type: "varchar", length: 100, default: "default" })
  tenant_id: string;

  @Column({ type: "varchar", length: 200 })
  name: string;

  @Column({ type: "text", nullable: true })
  description: string;

  @Column({ type: "varchar", length: 50, default: "workflow" })
  rule_type: string;

  @Column({ type: "varchar", length: 50, default: WorkflowTriggerEvent.CALL_OUTCOME })
  trigger_event: string;

  @Column({ type: "varchar", length: 200, default: "Appointment Scheduled" })
  outcome_trigger: string;

  @Column({ type: "varchar", length: 30, default: "contains" })
  match_type: string; // contains | exact | regex

  @Column({ type: "int", default: 10 })
  min_call_duration_seconds: number;

  @Column({ type: "boolean", default: false })
  require_goal_achieved: boolean;

  @Column({ type: "int", default: 15 })
  priority: number;

  @Column({ type: "boolean", default: true })
  is_active: boolean;

  @Column({ type: "varchar", length: 50, default: "WON" })
  action_move_lead_stage: string;

  @Column({ type: "boolean", default: true })
  action_create_crm_deal: boolean;

  @Column({ type: "varchar", length: 50, default: "Won" })
  action_crm_deal_stage: string;

  @Column({ type: "numeric", precision: 12, scale: 2, default: 5000.0 })
  action_deal_value: number;

  @Column({ type: "boolean", default: true })
  action_convert_to_customer: boolean;

  @Column({ type: "varchar", length: 50, default: "ACTIVE" })
  target_customer_status: string;

  @Column({ type: "varchar", length: 50, default: "PROFESSIONAL" })
  target_customer_tier: string;

  @Column({ type: "boolean", default: true })
  action_send_email: boolean;

  @Column({ type: "varchar", length: 50, default: "lead_converted" })
  action_email_trigger_type: string;

  @Column({ type: "boolean", default: true })
  action_send_whatsapp: boolean;

  @Column({ type: "varchar", length: 50, default: "deal_won" })
  action_whatsapp_trigger: string;

  @Column({ type: "jsonb", nullable: true })
  auto_tags: string[];
}
