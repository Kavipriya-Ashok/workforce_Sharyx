import { Entity, Column, Index, ManyToOne, JoinColumn } from "typeorm";
import { BaseTable } from "../BaseTable";
import { OmnichannelConversation } from "./OmnichannelConversation.entity";

export type MessageDirection = "in" | "out";
export type MessageStatus = "sent" | "delivered" | "read" | "failed";

@Entity({ name: "omnichannel_message" })
export class OmnichannelMessage extends BaseTable {
  @Index()
  @Column({ type: "varchar", length: 100, default: "default" })
  tenant_id: string;

  @Index()
  @Column({ type: "uuid" })
  conversation_id: string;

  @ManyToOne(() => OmnichannelConversation, (conv) => conv.messages, { onDelete: "CASCADE" })
  @JoinColumn({ name: "conversation_id" })
  conversation?: OmnichannelConversation;

  @Index()
  @Column({ type: "varchar", length: 10, default: "in" })
  direction: MessageDirection;

  @Column({ type: "text" })
  body: string;

  @Column({ type: "jsonb", default: () => "'[]'" })
  attachments: Array<{ name: string; url: string; mimeType?: string; size?: number }>;

  @Column({ type: "varchar", length: 500, nullable: true })
  subject: string | null;

  @Index()
  @Column({ type: "varchar", length: 20, default: "sent" })
  delivery_status: MessageStatus;

  @Index()
  @Column({ type: "timestamp with time zone", default: () => "CURRENT_TIMESTAMP" })
  timestamp: Date;

  @Index()
  @Column({ type: "varchar", length: 255, nullable: true })
  provider_message_id: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  sender_info: string | null;

  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, any> | null;
}

