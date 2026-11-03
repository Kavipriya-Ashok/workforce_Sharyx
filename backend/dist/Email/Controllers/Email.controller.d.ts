import { AuthBaseController } from "@Controller/AuthBase.controller";
import { ResponseEnum } from "@Helper/Enum/ResponseEnum";
import { EmailService } from "../Services/Email.service";
import { EmailAIService } from "../Services/EmailAI.service";
import { EmailImapService } from "../Services/EmailImap.service";
import { EmailAccountConfigModel } from "../Models/EmailAccountConfig.model";
import { SendEmailModel } from "../Models/SendEmail.model";
export declare class EmailController extends AuthBaseController {
    private readonly emailService;
    private readonly emailAiService;
    private readonly emailImapService;
    constructor(emailService: EmailService, emailAiService: EmailAIService, emailImapService: EmailImapService);
    getConfig(headerTenantId?: string): Promise<any>;
    saveConfig(body: EmailAccountConfigModel, userId: string, headerTenantId?: string): Promise<{
        Type: ResponseEnum;
        Message: string;
        AddtionalData: any;
    } | {
        Type: ResponseEnum;
        Message: string;
        AddtionalData?: undefined;
    }>;
    testConnection(body: EmailAccountConfigModel): Promise<{
        Type: ResponseEnum;
        Message: string;
        AddtionalData: any;
    } | {
        Type: ResponseEnum;
        Message: string;
        AddtionalData?: undefined;
    }>;
    getGoogleAuthUrl(redirectUri?: string): any;
    connectGoogle(body: {
        code: string;
        redirectUri?: string;
    }, userId: string, headerTenantId?: string): Promise<{
        Type: ResponseEnum;
        Message: string;
        AddtionalData: any;
    } | {
        Type: ResponseEnum;
        Message: string;
        AddtionalData?: undefined;
    }>;
    getOAuthStatus(headerTenantId?: string): Promise<any>;
    disconnectGoogle(userId: string, headerTenantId?: string): Promise<{
        Type: ResponseEnum;
        Message: string;
        AddtionalData: any;
    } | {
        Type: ResponseEnum;
        Message: string;
        AddtionalData?: undefined;
    }>;
    generateLeadDraft(body: {
        lead_id: string;
        customPrompt?: string;
        intent?: string;
    }): Promise<any>;
    sendLeadEmail(body: {
        lead_id: string;
        to: string;
        subject: string;
        html: string;
        isAiDrafted?: boolean;
    }, userId: string): Promise<{
        Type: ResponseEnum;
        Message: string;
        AddtionalData: any;
    } | {
        Type: ResponseEnum;
        Message: string;
        AddtionalData?: undefined;
    }>;
    validateEmail(email: string): Promise<any>;
    sendEmail(body: SendEmailModel, userId: string): Promise<{
        Type: ResponseEnum;
        Message: string;
        AddtionalData: any;
    } | {
        Type: ResponseEnum;
        Message: string;
        AddtionalData?: undefined;
    }>;
    getInbox(headerTenantId?: string): Promise<any>;
    syncInbox(): Promise<any>;
    getThread(identifier: string): Promise<any>;
}
