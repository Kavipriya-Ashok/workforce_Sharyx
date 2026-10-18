import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { BaseTable } from "../BaseTable";
import { WhatsAppConversation } from "./WhatsAppConversation.entity";

@Entity("wa_message")
export class WhatsAppMessage extends BaseTable {
  @Column({ type: "uuid", nullable: true })
  conversation_id: string;

  @ManyToOne(() => WhatsAppConversation, (conv) => conv.messages, { onDelete: "CASCADE", nullable: true })
  @JoinColumn({ name: "conversation_id" })
  conversation: WhatsAppConversation;

  @Column({ default: "default" })
  tenant_id: string;

  @Column({ length: 30 })
  sender_phone: string;

  @Column({ length: 30 })
  recipient_phone: string;

  @Column({ length: 15, default: "outbound" }) // 'inbound', 'outbound'
  direction: string;

  @Column({ length: 20, default: "text" }) // 'text', 'template', 'image'
  message_type: string;

  @Column({ type: "text", nullable: true })
  message_text: string;

  @Column({ length: 100, nullable: true })
  template_name: string;

  @Column({ length: 150, nullable: true })
  meta_message_id: string;

  @Column({ length: 20, default: "sent" }) // 'sent', 'delivered', 'read', 'failed'
  delivery_status: string;

  @Column({ type: "boolean", default: false })
  is_ai_generated: boolean;
}
