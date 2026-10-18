import { Column, Entity, OneToMany } from "typeorm";
import { BaseTable } from "../BaseTable";
import { WhatsAppMessage } from "./WhatsAppMessage.entity";

@Entity("wa_conversation")
export class WhatsAppConversation extends BaseTable {
  @Column({ default: "default" })
  tenant_id: string;

  @Column({ length: 30 })
  customer_phone: string;

  @Column({ length: 150, nullable: true })
  customer_name: string;

  @Column({ type: "uuid", nullable: true })
  lead_id: string;

  @Column({ length: 30, default: "open" }) // 'open', 'closed', 'waiting_human'
  conversation_status: string;

  @Column({ type: "text", nullable: true })
  last_message_text: string;

  @Column({ type: "timestamp with time zone", default: () => "CURRENT_TIMESTAMP" })
  last_message_at: Date;

  @Column({ type: "int", default: 0 })
  unread_count: number;

  @Column({ type: "jsonb", nullable: true })
  meeting_info?: {
    slot?: string;
    meet_url?: string;
    scheduled_at?: string;
  };

  @OneToMany(() => WhatsAppMessage, (message) => message.conversation)
  messages: WhatsAppMessage[];
}
