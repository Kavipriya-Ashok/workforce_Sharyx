import { Column, Entity } from "typeorm";
import { BaseTable } from "../BaseTable";

@Entity("wa_ai_config")
export class WhatsAppAIConfig extends BaseTable {
  @Column({ default: "default" })
  tenant_id: string;

  @Column({ type: "boolean", default: true })
  is_ai_enabled: boolean;

  @Column({ length: 30, default: "hybrid" }) // 'fully_automated', 'hybrid', 'manual'
  ai_mode: string;

  @Column({ type: "text", nullable: true })
  system_prompt: string;

  @Column({ type: "text", nullable: true })
  welcome_message: string;

  @Column({ type: "text", nullable: true })
  fallback_message: string;

  @Column({ length: 50, default: "openai" })
  llm_provider: string;

  @Column({ length: 50, default: "gpt-4o-mini" })
  llm_model: string;

  @Column({ type: "text", nullable: true })
  api_key: string;

  @Column({ type: "boolean", default: true })
  auto_followup_enabled: boolean;

  @Column({ type: "int", default: 60 })
  followup_delay_minutes: number;

  @Column({ type: "text", nullable: true })
  followup_message: string;

  @Column("simple-array", { nullable: true })
  stop_words: string[];
}
