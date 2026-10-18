import { AuthBaseController } from "@Controller/AuthBase.controller";
import { LeadService } from "@Service/Lead/Lead.service";
export declare class LeadController extends AuthBaseController {
    private readonly leadService;
    constructor(leadService: LeadService);
    list(filter: any, userId: string): Promise<any>;
    stats(isCandidate: any, userId: string): Promise<any>;
    getById(id: string, userId: string): Promise<any>;
    checkDuplicate(phone: string, excludeId: string, userId: string): Promise<any>;
    insert(data: any, userId: string): Promise<any>;
    update(id: string, data: any, userId: string): Promise<any>;
    updateStatus(id: string, newStatus: string, userId: string): Promise<any>;
    delete(id: string): Promise<any>;
    bulkDelete(ids: string[]): Promise<any>;
    bulkUpdateStatus(body: {
        ids: string[];
        lead_status: string;
    }, userId: string): Promise<any>;
    addActivity(body: any, userId: string): Promise<any>;
    importLeads(model: any, userId: string): Promise<any>;
    approveInterview(id: string, body: any, userId: string): Promise<any>;
}
