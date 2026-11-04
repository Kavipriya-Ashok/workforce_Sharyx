import { Entity, Column, Index, ManyToOne, JoinColumn, PrimaryGeneratedColumn, BaseEntity } from "typeorm";
import { lead } from "../Lead/lead";

export type CommunicationChannel = "whatsapp" | "email" | "call";
export type CommunicationDirection = "inbound" | "outbound";

@Entity({ name: "communications" })
export class OmnichannelCommunication extends BaseEntity {
  @PrimaryGeneratedColumn("uuid")
  @Index()
  id: string;

  @Index()
  @Column({ type: "varchar", length: 100, default: "default" })
  tenant_id: string;

  @Index()
  @Column({ type: "uuid" })
  lead_id: string;

  @ManyToOne(() => lead, { onDelete: "CASCADE" })
  @JoinColumn({ name: "lead_id" })
  lead?: lead;

  @Index()
  @Column({ type: "varchar", length: 50 })
  channel: CommunicationChannel;

  @Index()
  @Column({ type: "varchar", length: 20, default: "inbound" })
  direction: CommunicationDirection;

  @Column({ type: "text" })
  description: string;

  @Column({ type: "jsonb", default: () => "'{}'" })
  content: {
    body?: string;
    subject?: string;
    from?: string;
    to?: string;
    transcript?: string;
    ai_summary?: string;
    outcome?: string;
    attachments?: Array<{ name: string; url: string; mimeType?: string; size?: number }>;
    thread_replies?: Array<{ sender: string; body: string; timestamp: string }>;
    [key: string]: any;
  };

  @Column({ type: "integer", nullable: true })
  duration: number | null; // in seconds (for calls)

  @Column({ type: "text", nullable: true })
  recording_url: string | null;

  @Index()
  @Column({ type: "timestamp with time zone", default: () => "CURRENT_TIMESTAMP" })
  occurred_at: Date;

  @Column({ type: "varchar", length: 50, default: "delivered" })
  status: string;

  @Index()
  @Column({ type: "varchar", length: 255, nullable: true })
  provider_id: string | null;

  @Column({ type: "timestamp", nullable: true, default: () => "CURRENT_TIMESTAMP" })
  created_on?: Date;

  @Column({ type: "timestamp", nullable: true, default: () => "CURRENT_TIMESTAMP" })
  updated_on?: Date;
}
