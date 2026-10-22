import { Column, Entity } from "typeorm";
import { BaseTable } from "../BaseTable";
import { VoiceProviderType } from "./VoiceProviderConfig.entity";

@Entity("voice_agent")
export class VoiceAgent extends BaseTable {
  @Column({ default: "default" })
  tenant_id: string;

  @Column({ type: "varchar", length: 100 })
  name: string;

  @Column({ type: "varchar", length: 30, default: "vapi" })
  provider: VoiceProviderType;

  @Column({ type: "varchar", length: 150, nullable: true })
  remote_agent_id: string; // Vapi assistantId, Retell agentId, or SaaS agentId

  @Column({ type: "text" })
  system_prompt: string;

  @Column({ type: "text", nullable: true })
  first_message: string;

  @Column({ type: "varchar", length: 100, default: "jennifer" })
  voice_id: string;

  @Column({ type: "varchar", length: 50, default: "elevenlabs" })
  voice_provider: string; // elevenlabs, cartesia, deepgram, openai

  @Column({ type: "varchar", length: 50, default: "gpt-4o-mini" })
  llm_model: string;

  @Column({ type: "float", default: 0.4 })
  temperature: number;

  @Column({ type: "varchar", length: 10, default: "en" })
  language: string;

  @Column({ type: "jsonb", nullable: true })
  allowed_tools: string[];

  @Column({ type: "varchar", length: 150, nullable: true })
  transfer_agent_id: string;

  @Column({ type: "varchar", length: 50, nullable: true })
  transfer_phone_number: string;

  @Column({ type: "jsonb", nullable: true })
  raw_provider_response: Record<string, any>;
}
