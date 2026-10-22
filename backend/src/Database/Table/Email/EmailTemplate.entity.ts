import { Column, Entity } from "typeorm";
import { BaseTable } from "../BaseTable";

@Entity("email_template")
export class EmailTemplate extends BaseTable {
  @Column({ default: "default" })
  tenant_id: string;

  @Column({ length: 120 })
  name: string;

  @Column({ length: 80, default: "General" })
  category: string; // Sales | Recruitment | Onboarding | Follow-up | Support | General

  @Column({ length: 255 })
  subject: string;

  @Column({ type: "text" })
  body_html: string;

  @Column({ type: "text", nullable: true })
  body_text: string;

  @Column({ type: "text", nullable: true })
  preview_text: string; // email pre-header

  @Column({ type: "jsonb", nullable: true })
  variables: string[]; // e.g. ["lead_name", "company", "meeting_url"]

  @Column({ type: "boolean", default: true })
  is_active: boolean;

  @Column({ type: "boolean", default: false })
  attach_pdf: boolean;

  @Column({ length: 100, nullable: true })
  pdf_template_type: string; // 'executive_proposal' | 'corporate_gold' | 'call_summary' | 'invoice'

  @Column({ length: 255, nullable: true })
  pdf_title: string;
}
