import { JWTAuthController } from "@Controller/JWTAuth.controller";
import { LeadService } from "@Service/Lead/Lead.service";
export declare class LeadController extends JWTAuthController {
    private readonly leadService;
    constructor(leadService: LeadService);
    list(filter: any, userId: string, tenantId: string): Promise<any>;
    stats(isCandidate: any, userId: string, tenantId: string): Promise<any>;
    getById(id: string, userId: string, tenantId: string): Promise<any>;
    checkDuplicate(phone: string, excludeId: string, userId: string, tenantId: string | null): Promise<any>;
    checkDuplicateEmail(email: string, excludeId: string, tenantId: string | null): Promise<any>;
    insert(data: any, userId: string, tenantId: string | null): Promise<any>;
    update(id: string, data: any, userId: string, tenantId: string | null): Promise<any>;
    updateStatus(id: string, newStatus: string, userId: string, tenantId: string | null): Promise<any>;
    updateCandidateStage(id: string, stage: string, userId: string, tenantId: string | null): Promise<any>;
    delete(id: string, tenantId: string | null): Promise<any>;
    bulkDelete(ids: string[], tenantId: string | null): Promise<any>;
    bulkUpdateStatus(body: {
        ids: string[];
        lead_status: string;
    }, userId: string, tenantId: string | null): Promise<any>;
    addActivity(body: any, userId: string, tenantId: string | null): Promise<any>;
    importLeads(model: any, userId: string, tenantId: string | null): Promise<any>;
    approveInterview(id: string, body: any, userId: string, tenantId: string | null): Promise<any>;
    triggerVoiceCall(id: string, body: any, userId: string, tenantId: string | null): Promise<any>;
}
