import { OutcomeTriggerService } from "@Service/OutcomeTrigger.service";
import { AgentOutcomeEvent } from "../../AgentOrchestrator/Services/AgentTools.service";
export declare class AgentOutcomeListener {
    private readonly outcomeTrigger;
    private readonly logger;
    constructor(outcomeTrigger: OutcomeTriggerService);
    handle(evt: AgentOutcomeEvent): Promise<void>;
}
