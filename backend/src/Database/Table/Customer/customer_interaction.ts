import { Entity, Column, Index } from "typeorm";
import { BaseTable } from "../BaseTable";

@Entity({ name: "customer_interaction" })
export class CustomerInteraction extends BaseTable {
  @Index()
  @Column({ type: "varchar", length: 100, default: "default" })
  tenant_id: string;

  @Index()
  @Column({ type: "uuid" })
  customer_id: string;

  @Column({ type: "varchar", length: 50, default: "NOTE" })
  interaction_type: string; // CONVERSION | VOICE_CALL | WHATSAPP | EMAIL | NOTE | DEAL

  @Column({ type: "varchar", length: 200 })
  title: string;

  @Column({ type: "text", nullable: true })
  description: string;

  @Column({ type: "varchar", length: 150, nullable: true, default: "System" })
  performer_name: string;

  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, any>;
}
