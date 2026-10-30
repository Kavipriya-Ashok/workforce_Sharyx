import { RuleEngineService, DryRunPayload } from "@Service/Automation/RuleEngine.service";
export declare class AutomationController {
    private readonly ruleEngineService;
    constructor(ruleEngineService: RuleEngineService);
    getRules(tenantId?: string): Promise<import("../../Database/Table/Automation/lead_conversion_rule").LeadConversionRule[]>;
    createRule(body: any, req: any): Promise<import("../../Database/Table/Automation/lead_conversion_rule").LeadConversionRule>;
    dryRunTest(body: DryRunPayload): Promise<any>;
    convertLead(id: string, body: any): Promise<{
        customer: import("../../Database/Table/Customer/customer").Customer;
        deal?: import("../../Database/Table/Customer/crm_deal").CrmDeal;
        lead: import("../../Database/Table/Lead/lead").lead;
    }>;
    seedRules(tenantId?: string): Promise<import("../../Database/Table/Automation/lead_conversion_rule").LeadConversionRule[]>;
    getRuleById(id: string): Promise<import("../../Database/Table/Automation/lead_conversion_rule").LeadConversionRule>;
    updateRule(id: string, body: any, req: any): Promise<import("../../Database/Table/Automation/lead_conversion_rule").LeadConversionRule>;
    deleteRule(id: string): Promise<{
        success: boolean;
    }>;
}
