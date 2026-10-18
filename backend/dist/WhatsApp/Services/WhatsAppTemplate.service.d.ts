import { WhatsAppTemplate } from "@Database/Table/WhatsApp/WhatsAppTemplate.entity";
export declare class WhatsAppTemplateService {
    private readonly logger;
    private readonly graphApiVersion;
    getTemplates(tenantId?: string): Promise<WhatsAppTemplate[]>;
    createTemplate(data: Partial<WhatsAppTemplate>, tenantId?: string): Promise<WhatsAppTemplate>;
    syncMetaTemplates(tenantId?: string): Promise<WhatsAppTemplate[]>;
    updateTemplate(id: string, data: Partial<WhatsAppTemplate>): Promise<WhatsAppTemplate>;
    deleteTemplate(id: string, tenantId?: string): Promise<boolean>;
    sendTemplateMessage(phone: string, templateName: string, parameters?: string[], tenantId?: string): Promise<any>;
}
