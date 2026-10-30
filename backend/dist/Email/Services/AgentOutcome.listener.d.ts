import { EventEmitter2 } from "@nestjs/event-emitter";
import { OutcomeTriggerService } from "@Service/OutcomeTrigger.service";
import { AgentOutcomeEvent } from "../../AgentOrchestrator/Services/AgentTools.service";
export declare class AgentOutcomeListener {
    private readonly outcomeTrigger;
    private readonly events;
    private readonly logger;
    constructor(outcomeTrigger: OutcomeTriggerService, events: EventEmitter2);
    handle(evt: AgentOutcomeEvent): Promise<void>;
}
