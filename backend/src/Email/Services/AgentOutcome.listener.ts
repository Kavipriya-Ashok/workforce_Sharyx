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
      // 1. Deliver WhatsApp + Email confirmation messages first
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

      // 2. Automatically trigger voice confirmation call strictly when interview or demo Google Meet is scheduled
      // (Only trigger if the incoming channel wasn't already voice to prevent loops, and strictly requires a confirmed meet link)
      const hasMeetUrl = Boolean(evt.meetUrl && evt.meetUrl.includes("meet.google.com"));
      const isBooking =
        (evt.event === "appointment_booked" || evt.event === "interview_booked" || /booked/i.test(evt.outcome || "")) &&
        hasMeetUrl;

      if (isBooking && evt.phone && evt.channel !== "voice") {
        const isInterview = /interview/i.test(`${evt.event} ${evt.outcome} ${evt.summary}`);
        this.logger.log(
          `📞 [AUTO VOICE TRIGGER] Dispatched confirmation voice call to ${evt.phone} for ${
            isInterview ? "Interview" : "Demo"
          } after WhatsApp delivery`
        );

        // 3-second buffer to ensure the customer receives the WhatsApp message before phone rings
        setTimeout(() => {
          this.events.emit("voice.call.requested", {
            tenantId: evt.tenantId || "default",
            phone: evt.phone,
            customerName: evt.leadName,
            scheduledType: isInterview ? "interview" : "demo",
            reason: isInterview ? "Interview scheduled" : "Demo scheduled",
            meetingSlot: evt.summary || "your upcoming session",
            meetUrl: evt.meetUrl,
            agentKey: isInterview ? "recruitment" : "sales",
          });
        }, 3000);
      }
    } catch (err: any) {
      this.logger.warn(`Agent outcome trigger failed: ${err.message}`);
    }
  }
}
