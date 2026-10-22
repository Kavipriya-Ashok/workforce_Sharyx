import { Column, Entity } from "typeorm";
import { BaseTable } from "../BaseTable";

/**
 * A configurable LLM agent (Receptionist, Sales, Appointment, Support).
 * Used by the multi-agent orchestrator for WhatsApp + Email conversations.
 */
@Entity("ai_agent")
export class AiAgent extends BaseTable {
  @Column({ default: "default" })
  tenant_id: string;

  @Column({ length: 40 }) // 'receptionist' | 'sales' | 'appointment' | 'support'
  agent_key: string;

  @Column({ length: 100 })
  display_name: string;

  @Column({ length: 10, nullable: true })
  emoji: string;

  @Column({ type: "text", nullable: true })
  description: string;

  @Column({ type: "text" })
  persona_prompt: string;

  // Agent-specific knowledge (product catalog, pricing table, FAQ, support policy ...)
  @Column({ type: "text", nullable: true })
  knowledge: string;

  @Column({ type: "jsonb", default: () => "'[]'" })
  allowed_tools: string[];

  @Column({ type: "jsonb", default: () => "'[]'" })
  handoff_targets: string[];

  @Column({ type: "jsonb", default: () => `'["whatsapp","email"]'` })
  channels: string[];

  @Column({ type: "boolean", default: true })
  announce_handoff: boolean;

  @Column({ type: "text", nullable: true })
  handoff_message: string; // e.g. "Connecting you to our Sales team 💼"

  @Column({ type: "text", nullable: true })
  fallback_message: string; // used when LLM is unavailable

  @Column({ length: 40, nullable: true, default: "openai" })
  llm_provider: string; // 'openai' | 'gemini' | 'anthropic' | 'groq'

  @Column({ length: 60, nullable: true })
  llm_model: string;

  @Column({ type: "float", default: 0.4 })
  temperature: number;

  @Column({ type: "int", default: 0 })
  sort_order: number;

  @Column({ type: "boolean", default: true })
  is_active: boolean;
}
