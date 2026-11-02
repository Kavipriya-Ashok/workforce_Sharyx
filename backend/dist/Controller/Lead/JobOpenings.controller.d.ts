import { JobOpeningsService } from "@Service/Lead/JobOpenings.service";
export declare class JobOpeningsController {
    private readonly openingsService;
    constructor(openingsService: JobOpeningsService);
    listOpenings(tenantId?: string, onlyOpen?: string): Promise<import("../../Database/Table/Lead/JobOpening.entity").JobOpening[]>;
    getAvailableSlots(tenantId?: string, count?: string): Promise<string[]>;
    createOpening(body: any): Promise<import("../../Database/Table/Lead/JobOpening.entity").JobOpening>;
    updateOpening(id: string, body: any): Promise<import("../../Database/Table/Lead/JobOpening.entity").JobOpening>;
    patchOpening(id: string, body: any): Promise<import("../../Database/Table/Lead/JobOpening.entity").JobOpening>;
    updateStatus(id: string, status: string, updatedBy?: string): Promise<import("../../Database/Table/Lead/JobOpening.entity").JobOpening>;
    deleteOpening(id: string): Promise<{
        deleted: boolean;
    }>;
}
