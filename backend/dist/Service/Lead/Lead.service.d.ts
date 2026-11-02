import { EventEmitter2 } from "@nestjs/event-emitter";
import { Repository } from "typeorm";
import { lead } from "@Database/Table/Lead/lead";
import { lead_activity } from "@Database/Table/Lead/lead_activity";
export declare class LeadService {
    private readonly leadRepo;
    private readonly activityRepo;
    private readonly events;
    private readonly logger;
    constructor(leadRepo: Repository<lead>, activityRepo: Repository<lead_activity>, events: EventEmitter2);
    getAll(filter: any, userContext?: any): Promise<{
        items: lead[];
        total: number;
        take: number;
        skip: number;
    }>;
    getStats(userContext?: any, isCandidate?: boolean): Promise<{
        totalLeads: number;
        newToday: number;
        qualifiedLeads: number;
        inProgressLeads: number;
        wonLeads: number;
        pipelineValue: number;
        conversionRate: number;
        stageCounts: Record<string, number>;
    }>;
    getById(id: string, userContext?: any): Promise<{
        activities: lead_activity[];
        whatsappMessages: any[];
        emailLogs: any[];
        voiceCalls: any[];
        first_name: string;
        last_name: string;
        name: string;
        email: string;
        phone: string;
        company_name: string;
        job_title: string;
        lead_status: string;
        source: string;
        score: number;
        deal_value: number;
        currency: string;
        notes: string;
        tags: string[];
        custom_fields: Record<string, any>;
        assigned_to_id: string;
        tenant_id: string;
        last_contacted_at: Date;
        is_candidate: boolean;
        total_experience: number;
        relevant_experience: number;
        employment_status: string;
        relieving_date: Date;
        current_ctc: number;
        expected_ctc: number;
        ctc_basis: string;
        relocation: string;
        preferred_interview_slot: string;
        resume_url: string;
        candidate_stage: string;
        interview_date: Date;
        interview_link: string;
        reminder_sent: boolean;
        followup_sent: boolean;
        id: string;
        status: boolean;
        created_by_id?: string;
        created_on?: Date;
        updated_by_id?: string;
        updated_on?: Date;
    }>;
    checkDuplicatePhone(phone: string, excludeId?: string, userContext?: any): Promise<{
        is_duplicate: boolean;
        existing_lead?: undefined;
    } | {
        is_duplicate: boolean;
        existing_lead: {
            id: string;
            name: string;
            phone: string;
            lead_status: string;
        };
    }>;
    checkDuplicateEmail(email: string, excludeId?: string): Promise<{
        is_duplicate: boolean;
        existing_lead?: undefined;
    } | {
        is_duplicate: boolean;
        existing_lead: {
            id: string;
            name: string;
            email: string;
            lead_status: string;
        };
    }>;
    insert(data: any, userId?: string, userContext?: any): Promise<lead>;
    update(id: string, data: any, userId?: string): Promise<lead>;
    updateStatus(id: string, newStatus: string, userId?: string): Promise<lead>;
    updateCandidateStage(id: string, candidate_stage: string, userId?: string): Promise<lead>;
    delete(id: string): Promise<{
        success: boolean;
    }>;
    bulkDelete(ids: string[]): Promise<{
        success: boolean;
        count: number;
    }>;
    bulkUpdateStatus(ids: string[], lead_status: string, userId?: string): Promise<{
        success: boolean;
        count: number;
    }>;
    addActivity(body: any, userId?: string): Promise<lead_activity>;
    importLeads(model: any, userId?: string, userContext?: any): Promise<{
        success: boolean;
        imported: number;
        skipped: number;
        total: number;
    }>;
    approveCandidateInterview(id: string, body: any, userContext?: any): Promise<{
        success: boolean;
        lead: lead;
    }>;
    triggerVoiceCall(id: string, body?: any, userContext?: any): Promise<{
        success: boolean;
        message: string;
        leadId: string;
    }>;
    sendInterviewReminders(): Promise<void>;
    sendPostInterviewFollowup(): Promise<void>;
}
