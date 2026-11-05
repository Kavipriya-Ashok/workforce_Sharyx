import { EventEmitter2 } from "@nestjs/event-emitter";
import { EmailAccountConfig } from "@Database/Table/Email/EmailAccountConfig.entity";
import { EmailLog } from "@Database/Table/Email/EmailLog.entity";
import { EncryptionService } from "@Service/Encryption.service";
import { EmailValidationService } from "./EmailValidation.service";
import { EmailAccountConfigModel } from "../Models/EmailAccountConfig.model";
import { SendEmailModel } from "../Models/SendEmail.model";
export declare class EmailService {
    private readonly encryptionService;
    private readonly validationService;
    private readonly events;
    private readonly logger;
    constructor(encryptionService: EncryptionService, validationService: EmailValidationService, events: EventEmitter2);
    validateEmail(email: string): Promise<import("./EmailValidation.service").ValidationResult>;
    private getOAuthClient;
    private requireTenant;
    getConfig(tenantId: string): Promise<EmailAccountConfig | null>;
    getConfigAny(tenantId: string): Promise<EmailAccountConfig | null>;
    private plainSecret;
    toSafeConfig(config: EmailAccountConfig | null): {
        id: string;
        tenant_id: string;
        provider: string;
        display_name: string;
        email_address: string;
        client_id: string;
        smtp_host: string;
        smtp_port: number;
        smtp_user: string;
        imap_host: string;
        imap_port: number;
        use_ssl: boolean;
        is_active: boolean;
        token_expires_at: Date;
        has_client_secret: boolean;
        has_password: boolean;
        has_refresh_token: boolean;
        has_access_token: boolean;
        password_hint: string;
    };
    getSafeConfig(tenantId: string): Promise<{
        id: string;
        tenant_id: string;
        provider: string;
        display_name: string;
        email_address: string;
        client_id: string;
        smtp_host: string;
        smtp_port: number;
        smtp_user: string;
        imap_host: string;
        imap_port: number;
        use_ssl: boolean;
        is_active: boolean;
        token_expires_at: Date;
        has_client_secret: boolean;
        has_password: boolean;
        has_refresh_token: boolean;
        has_access_token: boolean;
        password_hint: string;
    }>;
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
    disconnect(tenantId: string, userId?: string): Promise<{
        success: boolean;
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
    guessImapHost(smtpHost?: string | null): string | null;
    private googleClient;
    checkSmtp(cfg: EmailAccountConfig): Promise<{
        ok: boolean;
        status: "connected" | "failed" | "degraded";
        code?: string;
        message: string;
    }>;
    checkImap(cfg: EmailAccountConfig): Promise<{
        ok: boolean;
        status: "connected" | "failed" | "degraded" | "not_configured";
        code?: string;
        message: string;
    }>;
    testConnection(tenantId: string, userId: string | undefined, data?: Partial<EmailAccountConfigModel>): Promise<{
        connected: boolean;
        provider: string;
        email: string;
        smtp: {
            ok: boolean;
            status: "connected" | "failed" | "degraded";
            code?: string;
            message: string;
        };
        imap: {
            ok: boolean;
            status: "connected" | "failed" | "degraded" | "not_configured";
            code?: string;
            message: string;
        };
        message: string;
    }>;
    recordEmailNotSent(tenantId: string, to: string | null, reason: string, opts?: {
        leadId?: string | null;
        subject?: string;
        status?: "skipped" | "failed";
        attempts?: number;
    }): Promise<void>;
    sendEmailReliable(dto: SendEmailModel, userId: string | undefined, isAiDrafted: boolean, tenantId: string, opts?: {
        leadId?: string | null;
    }): Promise<{
        status: "sent" | "skipped" | "failed";
        reason?: string;
        attempts: number;
    }>;
    sendEmail(dto: SendEmailModel, userId?: string, isAiDrafted?: boolean, tenantId?: string): Promise<EmailLog>;
    getInboxLogs(tenantId: string): Promise<EmailLog[]>;
    getThread(leadIdOrEmail: string, tenantId?: string): Promise<EmailLog[]>;
}
