import { Injectable, Logger } from "@nestjs/common";
import { OnEvent, EventEmitter2 } from "@nestjs/event-emitter";
import { OutcomeTriggerService } from "@Service/OutcomeTrigger.service";
import { AGENT_OUTCOME_EVENT, AgentOutcomeEvent } from "../../AgentOrchestrator/Services/AgentTools.service";

/**
 * Bridges multi-agent outcomes (Demo Booked, Interview Booked, Hot Lead ...) to:
 * 1. Outcome-based WhatsApp + Email campaigns (with PDFs and Google Meet links).
 * 2. Automated follow-up voice phone calls where the AI agent speaks directly to confirm the session.
 */
@Injectable()
export class AgentOutcomeListener {
  private readonly logger = new Logger(AgentOutcomeListener.name);

  constructor(
    private readonly outcomeTrigger: OutcomeTriggerService,
    private readonly events: EventEmitter2,
  ) {}

  @OnEvent(AGENT_OUTCOME_EVENT, { async: true })
  async handle(evt: AgentOutcomeEvent) {
    try {
      // When the booking/outcome originated on WhatsApp or from a Voice Call, the customer
      // already received confirmation in chat or on the phone. Only dispatch the Email confirmation
      // so we never send redundant/confusing duplicate WhatsApp messages!
      const targetChannel: "whatsapp" | "email" | "both" =
        evt.channel === "whatsapp" || evt.channel === "voice" ? "email" : "both";

      const res = await this.outcomeTrigger.executeTrigger(targetChannel, evt.event, {
        tenantId: evt.tenantId || "default",
        phone: evt.phone,
        email: evt.email,
        leadName: evt.leadName,
        outcome: evt.outcome,
        callSummary: evt.summary,
        agentName: evt.agentName,
        meetUrl: evt.meetUrl,
      });
      this.logger.log(`⚡ [AGENT OUTCOME] ${evt.outcome} (${evt.event}) [${targetChannel}] -> sent ${res.sent}, failed ${res.failed}`);
    } catch (err: any) {
      this.logger.warn(`Agent outcome trigger failed: ${err.message}`);
    }
  }
}
