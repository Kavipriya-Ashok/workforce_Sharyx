import { PdfGeneratorService } from "@Service/PdfGenerator.service";
import { EmailService } from "@Email/Services/Email.service";
export interface TriggerContext {
    tenantId: string;
    phone?: string;
    email?: string;
    leadName?: string;
    outcome?: string;
    callSummary?: string;
    agentName?: string;
    meetUrl?: string;
    dealValue?: number;
    currency?: string;
    jobTitle?: string;
    company?: string;
    dashboardUrl?: string;
    calendarUrl?: string;
    llmWhatsApp?: string;
    llmEmailParagraph?: string;
}
export declare function isRealMeetingLink(url?: string | null): boolean;
export declare class OutcomeTriggerService {
    private readonly emailService;
    private readonly pdfService;
    private readonly logger;
    private readonly recentDispatches;
    private readonly llm;
    constructor(emailService: EmailService, pdfService: PdfGeneratorService);
    private generateLlmFollowup;
    executeTrigger(channel: "whatsapp" | "email" | "both", event: string, ctx: TriggerContext): Promise<{
        sent: number;
        failed: number;
        details: string[];
    }>;
    private executeWhatsAppTrigger;
    private executeEmailTrigger;
}
