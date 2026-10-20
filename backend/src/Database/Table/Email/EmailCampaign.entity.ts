import { Column, Entity } from "typeorm";
import { BaseTable } from "../BaseTable";

@Entity("email_campaign")
export class EmailCampaign extends BaseTable {
  @Column({ default: "default" })
  tenant_id: string;

  @Column({ length: 150 })
  campaign_name: string;

  @Column({ type: "text" })
  subject: string;

  @Column({ type: "text" })
  html_template: string;

  @Column({ type: "int", default: 0 })
  recipients_count: number;

  @Column({ type: "int", default: 0 })
  sent_count: number;

  @Column({ type: "int", default: 0 })
  opened_count: number;

  @Column({ length: 20, default: "draft" }) // 'draft', 'scheduled', 'sending', 'sent'
  campaign_status: string;

  @Column({ length: 50, default: "after_reply" }) // 'after_reply', 'new_lead_captured', 'manual'
  trigger_event: string;

  @Column({ type: "boolean", default: true })
  is_active: boolean;

  @Column({ type: "int", default: 0 })
  delay_seconds: number;
}
