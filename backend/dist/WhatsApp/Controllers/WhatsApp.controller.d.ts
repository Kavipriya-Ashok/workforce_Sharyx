import { JWTAuthController } from "@Controller/JWTAuth.controller";
import { ResponseEnum } from "@Helper/Enum/ResponseEnum";
import { WhatsAppService } from "../Services/WhatsApp.service";
import { SendWhatsAppMessageModel } from "../Models/SendWhatsAppMessage.model";
import { WhatsAppConfigModel } from "../Models/WhatsAppConfig.model";
export declare class WhatsAppController extends JWTAuthController {
    private readonly whatsAppService;
    constructor(whatsAppService: WhatsAppService);
    getConfig(tenantId: string | null): Promise<any>;
    saveConfig(body: WhatsAppConfigModel, userId: string, tenantId: string | null): Promise<{
        Type: ResponseEnum;
        Message: string;
        AddtionalData: any;
    } | {
        Type: ResponseEnum;
        Message: string;
        AddtionalData?: undefined;
    }>;
    testConnection(body: WhatsAppConfigModel, userId: string, tenantId: string | null): Promise<{
        Type: ResponseEnum;
        Message: string;
        AddtionalData: any;
    } | {
        Type: ResponseEnum;
        Message: string;
        AddtionalData?: undefined;
    }>;
    disconnect(userId: string, tenantId: string | null): Promise<{
        Type: ResponseEnum;
        Message: string;
        AddtionalData: any;
    } | {
        Type: ResponseEnum;
        Message: string;
        AddtionalData?: undefined;
    }>;
    sendMessage(body: SendWhatsAppMessageModel, userId: string, tenantId: string | null): Promise<{
        Type: ResponseEnum;
        Message: string;
        AddtionalData: any;
    } | {
        Type: ResponseEnum;
        Message: string;
        AddtionalData?: undefined;
    }>;
    getConversations(tenantId: string | null): Promise<any>;
    getMessages(conversationId: string, tenantId: string | null): Promise<any>;
    updateConversationStatus(id: string, status: string, tenantId: string | null): Promise<{
        Type: ResponseEnum;
        Message: string;
        AddtionalData: any;
    } | {
        Type: ResponseEnum;
        Message: string;
        AddtionalData?: undefined;
    }>;
}
