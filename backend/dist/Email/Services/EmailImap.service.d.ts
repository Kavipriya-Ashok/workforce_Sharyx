import { OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { lead } from "@Database/Table/Lead/lead";
import { EncryptionService } from "@Service/Encryption.service";
import { EmailAIService } from "./EmailAI.service";
import { EmailService } from "./Email.service";
import { AgentOrchestratorService } from "../../AgentOrchestrator/Services/AgentOrchestrator.service";
export declare class EmailImapService implements OnModuleInit, OnModuleDestroy {
    private readonly encryptionService;
    private readonly emailService;
    private readonly aiService;
    private readonly orchestrator;
    private readonly events;
    private readonly logger;
    private timer;
    private isPolling;
    constructor(encryptionService: EncryptionService, emailService: EmailService, aiService: EmailAIService, orchestrator: AgentOrchestratorService, events: EventEmitter2);
    onModuleInit(): void;
    onModuleDestroy(): void;
    extractPhoneNumber(text: string): string | null;
    extractCompanyName(fromEmail: string, bodyText: string): string | null;
    extractPersonName(bodyText: string): string | null;
    extractScheduledSlot(replyHtml: string, bodyText: string, leadRecord?: lead | null): string;
    extractAppliedRole(subject: string, bodyText: string, replyHtml: string, leadRecord?: lead | null): string;
    resolveCandidatePhone(bodyText: string, replyHtml: string, leadRecord: lead | null, fromEmail: string, tenantId?: string): Promise<string | null>;
    findOrCreateLeadFromEmail(fromEmail: string, fromName: string, bodyText: string, subject: string, tenantId?: string): Promise<{
        leadRecord: lead;
        extractedPhone: string | null;
        extractedCompany: string | null;
    }>;
    private triggerAutoReply;
    syncNow(tenantId?: string): Promise<{
        synced: number;
        status: string;
        provider?: undefined;
    } | {
        synced: number;
        provider: string;
        status?: undefined;
    }>;
    private isSystemOrAutomatedEmail;
    pollInbox(): Promise<{
        synced: number;
        status: string;
        provider?: undefined;
    } | {
        synced: number;
        provider: string;
        status?: undefined;
    }>;
}
