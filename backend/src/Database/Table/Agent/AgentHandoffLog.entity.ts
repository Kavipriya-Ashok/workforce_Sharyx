import { Column, Entity } from "typeorm";
import { BaseTable } from "../BaseTable";

/** Audit trail of every agent-to-agent (or agent-to-human) switch. */
@Entity("agent_handoff_log")
export class AgentHandoffLog extends BaseTable {
  @Column({ default: "default" })
  tenant_id: string;

  @Column({ type: "uuid" })
  state_id: string;

  @Column({ length: 20 })
  channel: string;

  @Column({ length: 40, nullable: true })
  from_agent: string;

  @Column({ length: 40 })
  to_agent: string; // agent key or 'human'

  @Column({ type: "text", nullable: true })
  reason: string;

  @Column({ type: "text", nullable: true })
  trigger_message: string;
}
