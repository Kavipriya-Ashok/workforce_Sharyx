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
}
export declare class OutcomeTriggerService {
    private readonly emailService;
    private readonly pdfService;
    private readonly logger;
    constructor(emailService: EmailService, pdfService: PdfGeneratorService);
    executeTrigger(channel: "whatsapp" | "email" | "both", event: string, ctx: TriggerContext): Promise<{
        sent: number;
        failed: number;
        details: string[];
    }>;
    private executeWhatsAppTrigger;
    private executeEmailTrigger;
}
