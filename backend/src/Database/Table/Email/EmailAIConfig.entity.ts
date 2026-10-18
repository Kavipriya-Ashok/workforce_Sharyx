import { Column, Entity } from "typeorm";
import { BaseTable } from "../BaseTable";

@Entity("email_ai_config")
export class EmailAIConfig extends BaseTable {
  @Column({ default: "default" })
  tenant_id: string;

  @Column({ type: "boolean", default: true })
  auto_reply_enabled: boolean;

  @Column({ type: "text", nullable: true })
  system_prompt: string;

  @Column({ length: 50, default: "professional" }) // 'professional', 'friendly', 'persuasive'
  tone: string;

  @Column({ length: 50, default: "openai" })
  llm_provider: string;

  @Column({ length: 50, default: "gpt-4o-mini" })
  llm_model: string;
}
