import { EmailAIConfig } from "@Database/Table/Email/EmailAIConfig.entity";
import { EmailAIConfigModel, GenerateEmailAIDraftModel } from "../Models/EmailAIConfig.model";
export declare class EmailAIService {
    private readonly logger;
    getConfig(tenantId?: string): Promise<EmailAIConfig | null>;
    saveConfig(data: EmailAIConfigModel, userId?: string): Promise<EmailAIConfig>;
    generateDraft(dto: GenerateEmailAIDraftModel, tenantId?: string): Promise<{
        subject: string;
        draft: any;
    }>;
}
