export type PdfTemplateType = "executive_proposal" | "corporate_gold" | "call_summary" | "invoice" | "candidate_report" | "onboarding_kit";
export interface PdfData {
    templateType: PdfTemplateType;
    leadName?: string;
    company?: string;
    agentName?: string;
    outcome?: string;
    callSummary?: string;
    jobTitle?: string;
    dealValue?: string;
    currency?: string;
    meetUrl?: string;
    date?: string;
    tenantName?: string;
    phone?: string;
    email?: string;
    customFields?: Record<string, string>;
}
export declare class PdfGeneratorService {
    private readonly logger;
    generate(pdfData: PdfData): Promise<Buffer>;
    getTemplateTypes(): {
        value: string;
        label: string;
        description: string;
    }[];
}
