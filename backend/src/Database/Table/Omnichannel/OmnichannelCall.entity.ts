import { Entity, Column, Index, ManyToOne, JoinColumn } from "typeorm";
import { BaseTable } from "../BaseTable";
import { OmnichannelConversation } from "./OmnichannelConversation.entity";

export type CallDirection = "inbound" | "outbound";

@Entity({ name: "omnichannel_call" })
export class OmnichannelCall extends BaseTable {
  @Index()
  @Column({ type: "varchar", length: 100, default: "default" })
  tenant_id: string;

  @Index()
  @Column({ type: "uuid" })
  conversation_id: string;

  @ManyToOne(() => OmnichannelConversation, (conv) => conv.calls, { onDelete: "CASCADE" })
  @JoinColumn({ name: "conversation_id" })
  conversation?: OmnichannelConversation;

  @Index()
  @Column({ type: "varchar", length: 20, default: "inbound" })
  direction: CallDirection;

  @Column({ type: "integer", default: 0 })
  duration: number; // in seconds

  @Column({ type: "text", nullable: true })
  recording_url: string | null;

  @Column({ type: "text", nullable: true })
  transcript: string | null;

  @Column({ type: "text", nullable: true })
  ai_summary: string | null;

  @Index()
  @Column({ type: "varchar", length: 50, default: "completed" })
  outcome: string | null;

  @Index()
  @Column({ type: "timestamp with time zone", default: () => "CURRENT_TIMESTAMP" })
  started_at: Date;

  @Column({ type: "timestamp with time zone", nullable: true })
  ended_at: Date | null;

  @Index()
  @Column({ type: "varchar", length: 255, nullable: true })
  provider_call_id: string | null;

  @Column({ type: "varchar", length: 100, default: "telephony" })
  telephony_provider: string | null;

  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, any> | null;
}

