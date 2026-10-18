import { AuthBaseController } from "@Controller/AuthBase.controller";
import { ResponseEnum } from "@Helper/Enum/ResponseEnum";
import { WhatsAppService } from "../Services/WhatsApp.service";
import { SendWhatsAppMessageModel } from "../Models/SendWhatsAppMessage.model";
import { WhatsAppConfigModel } from "../Models/WhatsAppConfig.model";
export declare class WhatsAppController extends AuthBaseController {
    private readonly whatsAppService;
    constructor(whatsAppService: WhatsAppService);
    getConfig(): Promise<any>;
    saveConfig(body: WhatsAppConfigModel, userId: string): Promise<{
        Type: ResponseEnum;
        Message: string;
        AddtionalData: any;
    } | {
        Type: ResponseEnum;
        Message: string;
        AddtionalData?: undefined;
    }>;
    testConnection(body: WhatsAppConfigModel, userId: string): Promise<{
        Type: ResponseEnum;
        Message: string;
        AddtionalData: any;
    } | {
        Type: ResponseEnum;
        Message: string;
        AddtionalData?: undefined;
    }>;
    sendMessage(body: SendWhatsAppMessageModel, userId: string): Promise<{
        Type: ResponseEnum;
        Message: string;
        AddtionalData: any;
    } | {
        Type: ResponseEnum;
        Message: string;
        AddtionalData?: undefined;
    }>;
    getConversations(): Promise<any>;
    getMessages(conversationId: string): Promise<any>;
}
