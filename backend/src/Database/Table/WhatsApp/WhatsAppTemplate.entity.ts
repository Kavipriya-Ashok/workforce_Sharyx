import { Column, Entity } from "typeorm";
import { BaseTable } from "../BaseTable";

@Entity("wa_template")
export class WhatsAppTemplate extends BaseTable {
  @Column({ default: "default" })
  tenant_id: string;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 50, default: "UTILITY" })
  category: string; // UTILITY | MARKETING | AUTHENTICATION

  @Column({ length: 20, default: "en_US" })
  language: string;

  @Column({ length: 255, nullable: true })
  header_text: string;

  @Column({ type: "text" })
  body_text: string;

  @Column({ length: 255, nullable: true })
  footer_text: string;

  @Column({ type: "jsonb", nullable: true })
  buttons: any[];

  @Column({ length: 50, default: "APPROVED" })
  approval_status: string; // APPROVED | PENDING | REJECTED

  @Column({ type: "boolean", default: true })
  is_active: boolean;

  @Column({ length: 200, default: "ALL" })
  outcome_filter: string; // 'ALL' | 'Interested' | 'Demo Booked' | 'Not Interested' etc.

  @Column({ type: "boolean", default: false })
  attach_pdf: boolean;

  @Column({ length: 100, nullable: true })
  pdf_template_type: string; // 'executive_proposal' | 'corporate_gold' | 'call_summary'

  @Column({ length: 255, nullable: true })
  pdf_title: string;
}
