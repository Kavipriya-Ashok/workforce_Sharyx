import { Entity, Column, Index } from "typeorm";
import { BaseTable } from "../BaseTable";

@Entity({ name: "omnichannel_activity_log" })
export class OmnichannelActivityLog extends BaseTable {
  @Index()
  @Column({ type: "varchar", length: 100, default: "default" })
  tenant_id: string;

  @Index()
  @Column({ type: "uuid", nullable: true })
  customer_id: string | null;

  @Index()
  @Column({ type: "uuid", nullable: true })
  conversation_id: string | null;

  @Index()
  @Column({ type: "varchar", length: 100 })
  type: string; // incoming_message | outgoing_reply | call_started | call_ended | status_changed | customer_created

  @Column({ type: "text" })
  detail: string;

  @Index()
  @Column({ type: "timestamp with time zone", default: () => "CURRENT_TIMESTAMP" })
  timestamp: Date;

  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, any> | null;
}

