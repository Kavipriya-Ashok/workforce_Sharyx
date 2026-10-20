import { EmailAccountConfig } from "@Database/Table/Email/EmailAccountConfig.entity";
import { EmailLog } from "@Database/Table/Email/EmailLog.entity";
import { EncryptionService } from "@Service/Encryption.service";
import { EmailValidationService } from "./EmailValidation.service";
import { EmailAccountConfigModel } from "../Models/EmailAccountConfig.model";
import { SendEmailModel } from "../Models/SendEmail.model";
export declare class EmailService {
    private readonly encryptionService;
    private readonly validationService;
    private readonly logger;
    constructor(encryptionService: EncryptionService, validationService: EmailValidationService);
    validateEmail(email: string): Promise<import("./EmailValidation.service").ValidationResult>;
    private getOAuthClient;
    getConfig(tenantId?: string): Promise<EmailAccountConfig | null>;
    getGoogleAuthUrl(customRedirectUri?: string): {
        url: string;
    };
    connectGoogleAccount(code: string, redirectUri?: string, userId?: string, tenantId?: string): Promise<{
        success: boolean;
        email: string;
        displayName: string;
        provider: string;
        message: string;
    }>;
    disconnectGoogleAccount(tenantId?: string, userId?: string): Promise<{
        success: boolean;
        message: string;
    }>;
    getOAuthStatus(tenantId?: string): Promise<{
        isConnected: boolean;
        provider: string;
        email_address?: undefined;
        display_name?: undefined;
        token_expires_at?: undefined;
    } | {
        isConnected: boolean;
        provider: string;
        email_address: string;
        display_name: string;
        token_expires_at: Date;
    }>;
    saveConfig(data: EmailAccountConfigModel, userId?: string): Promise<EmailAccountConfig>;
    sendEmail(dto: SendEmailModel, userId?: string, isAiDrafted?: boolean, tenantId?: string): Promise<EmailLog>;
    getInboxLogs(tenantId?: string): Promise<EmailLog[]>;
    getThread(leadIdOrEmail: string): Promise<EmailLog[]>;
}
