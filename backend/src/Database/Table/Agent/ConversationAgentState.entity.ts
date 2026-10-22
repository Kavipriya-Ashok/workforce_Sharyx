import { Column, Entity, Index } from "typeorm";
import { BaseTable } from "../BaseTable";

/**
 * Tracks which agent currently owns a conversation (per channel thread),
 * plus the shared memory (handoff brief + collected slots) passed between agents.
 */
@Entity("conversation_agent_state")
@Index(["tenant_id", "channel", "conversation_ref"])
export class ConversationAgentState extends BaseTable {
  @Column({ default: "default" })
  tenant_id: string;

  @Column({ length: 20 }) // 'whatsapp' | 'email'
  channel: string;

  // wa_conversation.id for WhatsApp, customer email address for Email
  @Column({ length: 200 })
  conversation_ref: string;

  @Column({ length: 30, nullable: true })
  customer_phone: string;

  @Column({ length: 200, nullable: true })
  customer_email: string;

  @Column({ length: 150, nullable: true })
  customer_name: string;

  @Column({ type: "uuid", nullable: true })
  lead_id: string;

  @Column({ length: 40, default: "receptionist" })
  active_agent: string;

  @Column({ length: 40, nullable: true })
  previous_agent: string;

  @Column({ type: "int", default: 0 })
  handoff_count: number;

  @Column({ type: "text", nullable: true })
  handoff_brief: string;

  @Column({ type: "jsonb", default: () => "'{}'" })
  collected_slots: Record<string, any>;

  @Column({ type: "boolean", default: false })
  human_takeover: boolean;

  @Column({ type: "int", default: 0 })
  turn_count: number;

  @Column({ type: "timestamp with time zone", nullable: true })
  last_activity_at: Date;
}
