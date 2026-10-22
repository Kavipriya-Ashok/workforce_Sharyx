import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { OutcomeTriggerService } from "@Service/OutcomeTrigger.service";
import { AGENT_OUTCOME_EVENT, AgentOutcomeEvent } from "../../AgentOrchestrator/Services/AgentTools.service";

/**
 * Bridges multi-agent outcomes (Demo Booked, Hot Lead ...) to the
 * outcome-based WhatsApp + Email template campaigns (with PDFs).
 */
@Injectable()
export class AgentOutcomeListener {
  private readonly logger = new Logger(AgentOutcomeListener.name);

  constructor(private readonly outcomeTrigger: OutcomeTriggerService) {}

  @OnEvent(AGENT_OUTCOME_EVENT, { async: true })
  async handle(evt: AgentOutcomeEvent) {
    try {
      const res = await this.outcomeTrigger.executeTrigger("both", evt.event, {
        tenantId: evt.tenantId || "default",
        phone: evt.phone,
        email: evt.email,
        leadName: evt.leadName,
        outcome: evt.outcome,
        callSummary: evt.summary,
        agentName: evt.agentName,
        meetUrl: evt.meetUrl,
      });
      this.logger.log(`⚡ [AGENT OUTCOME] ${evt.outcome} (${evt.event}) -> sent ${res.sent}, failed ${res.failed}`);
    } catch (err: any) {
      this.logger.warn(`Agent outcome trigger failed: ${err.message}`);
    }
  }
}
