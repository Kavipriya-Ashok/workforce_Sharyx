import { EmailTemplate } from "@Database/Table/Email/EmailTemplate.entity";
export declare class EmailTemplateService {
    private readonly logger;
    getTemplates(tenantId?: string): Promise<EmailTemplate[]>;
    seedDefaultTemplates(tenantId?: string): Promise<void>;
    createTemplate(data: Partial<EmailTemplate>, tenantId?: string): Promise<EmailTemplate>;
    updateTemplate(id: string, data: Partial<EmailTemplate>): Promise<EmailTemplate>;
    deleteTemplate(id: string): Promise<boolean>;
    previewTemplate(id: string, variables: Record<string, string>): Promise<{
        subject: string;
        body_html: string;
        preview_text: string;
    }>;
    private extractVariables;
}
