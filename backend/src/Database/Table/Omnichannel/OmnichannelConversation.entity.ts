import { Entity, Column, Index, ManyToOne, JoinColumn, OneToMany } from "typeorm";
import { BaseTable } from "../BaseTable";
import { Customer } from "../Customer/customer";
import { OmnichannelMessage } from "./OmnichannelMessage.entity";
import { OmnichannelCall } from "./OmnichannelCall.entity";

export type OmnichannelChannel = "whatsapp" | "email" | "call";
export type OmnichannelStatus = "new" | "open" | "pending" | "resolved";

@Entity({ name: "omnichannel_conversation" })
export class OmnichannelConversation extends BaseTable {
  @Index()
  @Column({ type: "varchar", length: 100, default: "default" })
  tenant_id: string;

  @Index()
  @Column({ type: "uuid", nullable: true })
  customer_id: string | null;

  @ManyToOne(() => Customer, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "customer_id" })
  customer?: Customer;

  @Index()
  @Column({ type: "varchar", length: 50, default: "whatsapp" })
  channel: OmnichannelChannel;

  @Index()
  @Column({ type: "varchar", length: 50, default: "new" })
  conversation_status: OmnichannelStatus;

  @Column({ type: "text", nullable: true })
  summary: string | null;

  @Index()
  @Column({ type: "timestamp with time zone", default: () => "CURRENT_TIMESTAMP" })
  last_activity_at: Date;

  @Index()
  @Column({ type: "varchar", length: 255, nullable: true })
  assigned_to: string | null;

  @Index()
  @Column({ type: "varchar", length: 255, nullable: true })
  provider_thread_id: string | null;

  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, any> | null;

  @OneToMany(() => OmnichannelMessage, (msg) => msg.conversation)
  messages?: OmnichannelMessage[];

  @OneToMany(() => OmnichannelCall, (call) => call.conversation)
  calls?: OmnichannelCall[];
}

