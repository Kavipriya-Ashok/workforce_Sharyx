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

  @Column({ length: 200, default: "ALL" })
  outcome_filter: string; // 'ALL' | 'Interested' | 'Demo Booked' | 'Not Interested' etc.

  @Column({ length: 50, default: "lead_or_customer" })
  recipient_type: string; // 'lead_or_customer' | 'team_users' | 'custom'

  @Column({ type: "boolean", default: false })
  attach_pdf: boolean;

  @Column({ length: 100, nullable: true })
  pdf_template_type: string; // 'executive_proposal' | 'corporate_gold' | 'call_summary'

  @Column({ length: 255, nullable: true })
  pdf_title: string;
}
