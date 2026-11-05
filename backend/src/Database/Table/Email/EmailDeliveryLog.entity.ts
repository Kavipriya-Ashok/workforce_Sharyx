import { BaseEntity, Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

/**
 * Per-tenant record of automated emails that were NOT delivered: skipped (no contact email / no mailbox)
 * or failed after retries. Lets a tenant see why a confirmation did not go out.
 */
@Entity("email_delivery_log")
@Index(["tenant_id", "created_on"])
export class EmailDeliveryLog extends BaseEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", length: 64 })
  tenant_id: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  to_email: string | null;

  @Column({ type: "varchar", length: 300, nullable: true })
  subject: string | null;

  @Column({ type: "varchar", length: 20 }) // 'skipped' | 'failed'
  status: string;

  @Column({ type: "varchar", length: 500, nullable: true })
  reason: string | null;

  @Column({ type: "int", default: 0 })
  attempts: number;

  @Column({ type: "uuid", nullable: true })
  lead_id: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  created_on: Date;
}
