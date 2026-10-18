import { WhatsAppConfig } from "@Database/Table/WhatsApp/WhatsAppConfig.entity";
import { WhatsAppConversation } from "@Database/Table/WhatsApp/WhatsAppConversation.entity";
import { WhatsAppMessage } from "@Database/Table/WhatsApp/WhatsAppMessage.entity";
import { SendWhatsAppMessageModel } from "../Models/SendWhatsAppMessage.model";
import { WhatsAppConfigModel } from "../Models/WhatsAppConfig.model";
export declare class WhatsAppService {
    private readonly logger;
    private readonly apiUrl;
    getConfig(tenantId?: string): Promise<WhatsAppConfig | null>;
    saveConfig(data: WhatsAppConfigModel, userId?: string): Promise<WhatsAppConfig>;
    testConnection(data: WhatsAppConfigModel, userId?: string): Promise<any>;
    sendMessage(dto: SendWhatsAppMessageModel, userId?: string, isAiGenerated?: boolean): Promise<{
        message: WhatsAppMessage;
        metaResponse: any;
    }>;
    getConversations(tenantId?: string): Promise<WhatsAppConversation[]>;
    getMessagesByConversation(conversationId: string): Promise<WhatsAppMessage[]>;
}
