import { Entity, Column, Index, ManyToOne, JoinColumn } from "typeorm";
import { BaseTable } from "../BaseTable";
import { Customer } from "../Customer/customer";

export type OmnichannelEventType = "WHATSAPP" | "EMAIL" | "CALL" | "MEETING" | "INTERVIEW";
export type OmnichannelEventDirection = "inbound" | "outbound" | "internal";

@Entity({ name: "omnichannel_event" })
@Index(["tenant_id", "source_module", "source_record_id"], { unique: true })
export class OmnichannelEvent extends BaseTable {
  @Index()
  @Column({ type: "varchar", length: 100, default: "default" })
  tenant_id: string;

  @Index()
  @Column({ type: "uuid" })
  customer_id: string;

  @ManyToOne(() => Customer, { onDelete: "CASCADE", nullable: true })
  @JoinColumn({ name: "customer_id" })
  customer?: Customer;

  @Index()
  @Column({ type: "varchar", length: 30 })
  event_type: OmnichannelEventType; // 'WHATSAPP' | 'EMAIL' | 'CALL' | 'MEETING' | 'INTERVIEW'

  @Index()
  @Column({ type: "varchar", length: 20, default: "inbound" })
  direction: OmnichannelEventDirection; // 'inbound' | 'outbound' | 'internal'

  @Index()
  @Column({ type: "varchar", length: 50 })
  source_module: string; // 'whatsapp' | 'email' | 'voice' | 'calendar' | 'recruitment'

  @Index()
  @Column({ type: "varchar", length: 150 })
  source_record_id: string; // ID in native source table

  @Index()
  @Column({ type: "timestamptz" })
  event_timestamp: Date; // actual occurrence timestamp

  @Column({ type: "varchar", length: 300 })
  title: string;

  @Column({ type: "text", nullable: true })
  description: string;

  @Column({ type: "text", nullable: true })
  summary: string;

  @Column({ type: "varchar", length: 50, default: "completed" })
  event_status: string; // 'sent', 'delivered', 'read', 'answered', 'completed', 'scheduled', 'cancelled'

  @Column({ type: "jsonb", nullable: true, default: () => "'{}'::jsonb" })
  metadata: Record<string, any>;
}
