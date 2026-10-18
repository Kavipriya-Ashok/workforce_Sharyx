import { Entity, Column, Index } from "typeorm";
import { BaseTable } from "../BaseTable";

export enum LeadStatus {
  NEW = "NEW",
  CONTACTED = "CONTACTED",
  QUALIFIED = "QUALIFIED",
  PROPOSAL = "PROPOSAL",
  WON = "WON",
  LOST = "LOST",
  UNQUALIFIED = "UNQUALIFIED",
}

export enum LeadSource {
  MANUAL = "MANUAL",
  CSV_IMPORT = "CSV_IMPORT",
  WEBHOOK = "WEBHOOK",
  FORM = "FORM",
  ZAPIER = "ZAPIER",
  FACEBOOK = "FACEBOOK",
  AI_AGENT = "AI_AGENT",
  INBOUND_CALL = "INBOUND_CALL",
  WHATSAPP = "WHATSAPP",
  EMAIL = "EMAIL",
  OTHER = "OTHER",
}

@Entity({ name: "lead" })
export class lead extends BaseTable {
  @Column({ type: "varchar", length: 150, nullable: true })
  first_name: string;

  @Column({ type: "varchar", length: 150, nullable: true })
  last_name: string;

  @Column({ type: "varchar", length: 300, nullable: true })
  name: string;

  @Index()
  @Column({ type: "varchar", length: 255, nullable: true })
  email: string;

  @Index()
  @Column({ type: "varchar", length: 50, nullable: true })
  phone: string;

  @Column({ type: "varchar", length: 200, nullable: true })
  company_name: string;

  @Column({ type: "varchar", length: 150, nullable: true })
  job_title: string;

  @Index()
  @Column({ type: "varchar", length: 50, default: LeadStatus.NEW })
  lead_status: string;

  @Index()
  @Column({ type: "varchar", length: 50, default: LeadSource.MANUAL })
  source: string;

  @Column({ type: "int", default: 50 })
  score: number; // 0 to 100 Lead Health / AI Score

  @Column({ type: "numeric", precision: 12, scale: 2, default: 0 })
  deal_value: number;

  @Column({ type: "varchar", length: 10, default: "INR" })
  currency: string;

  @Column({ type: "text", nullable: true })
  notes: string;

  @Column({ type: "json", nullable: true })
  tags: string[];

  @Column({ type: "jsonb", nullable: true })
  custom_fields: Record<string, any>;

  @Index()
  @Column({ type: "uuid", nullable: true })
  assigned_to_id: string;

  @Index()
  @Column({ type: "varchar", length: 100, default: "default" })
  tenant_id: string;

  @Column({ type: "timestamptz", nullable: true })
  last_contacted_at: Date;

  @Index()
  @Column({ type: "boolean", default: false })
  is_candidate: boolean;
}
