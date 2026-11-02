import { JobOpening } from "@Database/Table/Lead/JobOpening.entity";
export interface SlotValidationResult {
    valid: boolean;
    reason?: string;
    formattedSlot?: string;
    dateObj?: Date;
    availableSlots?: string[];
}
export declare class JobOpeningsService {
    private readonly logger;
    private ensureSeeded;
    listOpenings(tenantId?: string): Promise<JobOpening[]>;
    getOpenRoles(tenantId?: string): Promise<JobOpening[]>;
    createOpening(data: Partial<JobOpening>, userId?: string, tenantId?: string): Promise<JobOpening>;
    updateOpening(id: string, data: Partial<JobOpening>, userId?: string): Promise<JobOpening>;
    deleteOpening(id: string): Promise<{
        deleted: boolean;
    }>;
    formatOpenRolesForPrompt(tenantId?: string): Promise<{
        openRoles: JobOpening[];
        promptBlock: string;
        shortSummary: string;
    }>;
    private getScheduleConfig;
    getAvailableSlots(tenantId?: string, count?: number): Promise<string[]>;
    validateInterviewSlot(slotInput: string, tenantId?: string): Promise<SlotValidationResult>;
}
