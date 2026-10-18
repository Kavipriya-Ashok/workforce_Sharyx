import { EmailAccountConfig } from "@Database/Table/Email/EmailAccountConfig.entity";
import { EmailLog } from "@Database/Table/Email/EmailLog.entity";
import { EncryptionService } from "@Service/Encryption.service";
import { EmailAccountConfigModel } from "../Models/EmailAccountConfig.model";
import { SendEmailModel } from "../Models/SendEmail.model";
export declare class EmailService {
    private readonly encryptionService;
    private readonly logger;
    constructor(encryptionService: EncryptionService);
    getConfig(tenantId?: string): Promise<EmailAccountConfig | null>;
    saveConfig(data: EmailAccountConfigModel, userId?: string): Promise<EmailAccountConfig>;
    sendEmail(dto: SendEmailModel, userId?: string, isAiDrafted?: boolean): Promise<EmailLog>;
    getInboxLogs(tenantId?: string): Promise<EmailLog[]>;
    getThread(leadIdOrEmail: string): Promise<EmailLog[]>;
}
