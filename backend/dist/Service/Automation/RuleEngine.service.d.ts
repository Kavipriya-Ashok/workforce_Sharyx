import { Repository } from "typeorm";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { LeadConversionRule } from "@Database/Table/Automation/lead_conversion_rule";
import { Customer } from "@Database/Table/Customer/customer";
import { CrmDeal } from "@Database/Table/Customer/crm_deal";
import { CustomerInteraction } from "@Database/Table/Customer/customer_interaction";
import { lead } from "@Database/Table/Lead/lead";
import { lead_activity } from "@Database/Table/Lead/lead_activity";
import { OutcomeTriggerService } from "@Service/OutcomeTrigger.service";
export interface DryRunPayload {
    outcome: string;
    duration_seconds?: number;
    score?: number;
    goal_achieved?: boolean;
    tenantId?: string;
}
export declare class RuleEngineService {
    private readonly ruleRepo;
    private readonly customerRepo;
    private readonly dealRepo;
    private readonly interactionRepo;
    private readonly leadRepo;
    private readonly activityRepo;
    private readonly events;
    private readonly outcomeTriggerService;
    private readonly logger;
    constructor(ruleRepo: Repository<LeadConversionRule>, customerRepo: Repository<Customer>, dealRepo: Repository<CrmDeal>, interactionRepo: Repository<CustomerInteraction>, leadRepo: Repository<lead>, activityRepo: Repository<lead_activity>, events: EventEmitter2, outcomeTriggerService: OutcomeTriggerService);
    seedDefaultRules(tenantId?: string): Promise<LeadConversionRule[]>;
    getRules(tenantId?: string): Promise<LeadConversionRule[]>;
    getRuleById(id: string): Promise<LeadConversionRule>;
    createRule(data: Partial<LeadConversionRule>, userId?: string): Promise<LeadConversionRule>;
    updateRule(id: string, data: Partial<LeadConversionRule>, userId?: string): Promise<LeadConversionRule>;
    deleteRule(id: string): Promise<{
        success: boolean;
    }>;
    private matchOutcome;
    dryRunTest(payload: DryRunPayload): Promise<any>;
    evaluateCallOutcome(payload: {
        tenantId?: string;
        outcome: string;
        durationSeconds?: number;
        phone?: string;
        leadId?: string;
        leadName?: string;
        goalAchieved?: boolean;
        callSummary?: string;
    }): Promise<any>;
    convertLeadToCustomer(leadId: string, options?: any): Promise<{
        customer: Customer;
        deal?: CrmDeal;
        lead: lead;
    }>;
    handleVoiceCallOutcome(evt: {
        tenantId?: string;
        outcome: string;
        durationSeconds?: number;
        phone?: string;
        leadId?: string;
        leadName?: string;
        goalAchieved?: boolean;
        callSummary?: string;
    }): Promise<void>;
    handleLeadStageWon(evt: {
        leadId: string;
        tenantId?: string;
        dealValue?: number;
    }): Promise<void>;
}
