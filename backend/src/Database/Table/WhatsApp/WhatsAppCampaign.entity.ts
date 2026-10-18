import { Column, Entity } from "typeorm";
import { BaseTable } from "../BaseTable";

@Entity("wa_campaign")
export class WhatsAppCampaign extends BaseTable {
  @Column({ default: "default" })
  tenant_id: string;

  @Column({ length: 150 })
  name: string;

  @Column({ type: "text", nullable: true })
  description: string;

  @Column({ length: 100, default: "after_call_ends" })
  trigger_event: string; // 'after_call_ends' | 'demo_booked' | 'round_1_cleared' | 'deal_won' | 'inactive_followup' | 'manual_broadcast'

  @Column({ length: 100 })
  template_name: string;

  @Column({ type: "int", default: 0 })
  delay_minutes: number;

  @Column({ type: "boolean", default: true })
  is_active: boolean;

  @Column({ type: "int", default: 0 })
  total_recipients: number;

  @Column({ type: "int", default: 0 })
  sent_count: number;

  @Column({ type: "int", default: 0 })
  delivered_count: number;

  @Column({ type: "int", default: 0 })
  read_count: number;

  @Column({ length: 20, default: "active" }) // 'active', 'paused', 'completed', 'draft'
  campaign_status: string;

  @Column({ type: "timestamp with time zone", nullable: true })
  scheduled_at: Date;
}
