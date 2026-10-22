import { Column, Entity } from "typeorm";
import { BaseTable } from "../BaseTable";
import { VoiceProviderType } from "./VoiceProviderConfig.entity";

export type CallStatus =
  | "initiated"
  | "ringing"
  | "in-progress"
  | "completed"
  | "failed"
  | "busy"
  | "no-answer"
  | "cancelled";

@Entity("voice_call_log")
export class VoiceCallLog extends BaseTable {
  @Column({ default: "default" })
  tenant_id: string;

  @Column({ type: "uuid", nullable: true })
  agent_id: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  agent_name: string;

  @Column({ type: "varchar", length: 30, default: "vapi" })
  provider: VoiceProviderType;

  @Column({ type: "varchar", length: 150, nullable: true })
  provider_call_id: string;

  @Column({ type: "varchar", length: 40 })
  customer_phone: string;

  @Column({ type: "varchar", length: 150, nullable: true })
  customer_name: string;

  @Column({ type: "uuid", nullable: true })
  lead_id: string;

  @Column({ type: "varchar", length: 20, default: "outbound" })
  direction: "inbound" | "outbound";

  @Column({ type: "varchar", length: 30, default: "initiated" })
  call_status: CallStatus;

  @Column({ type: "int", default: 0 })
  duration_seconds: number;

  @Column({ type: "text", nullable: true })
  transcript: string;

  @Column({ type: "text", nullable: true })
  recording_url: string;

  @Column({ type: "text", nullable: true })
  summary: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  call_outcome: string;

  @Column({ type: "jsonb", nullable: true })
  extracted_slots: Record<string, any>;

  @Column({ type: "jsonb", nullable: true })
  raw_webhook_payload: Record<string, any>;
}
