import { Entity, Column, Index } from "typeorm";
import { BaseTable } from "../BaseTable";

@Entity({ name: "lead_activity" })
export class lead_activity extends BaseTable {
  @Index()
  @Column({ type: "uuid" })
  lead_id: string;

  @Column({ type: "varchar", length: 50, default: "NOTE" })
  activity_type: string; // NOTE | STATUS_CHANGE | CALL | EMAIL | WHATSAPP | MEETING | AI_QUALIFICATION

  @Column({ type: "varchar", length: 255 })
  title: string;

  @Column({ type: "text", nullable: true })
  description: string;

  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, any>;

  @Column({ type: "varchar", length: 150, nullable: true })
  performer_name: string;

  @Index()
  @Column({ type: "varchar", length: 100, default: "default" })
  tenant_id: string;
}
