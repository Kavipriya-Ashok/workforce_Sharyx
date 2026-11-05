import { WhatsAppConfig } from "@Database/Table/WhatsApp/WhatsAppConfig.entity";
import { WhatsAppConversation } from "@Database/Table/WhatsApp/WhatsAppConversation.entity";
import { WhatsAppMessage } from "@Database/Table/WhatsApp/WhatsAppMessage.entity";
import { SendWhatsAppMessageModel } from "../Models/SendWhatsAppMessage.model";
import { WhatsAppConfigModel } from "../Models/WhatsAppConfig.model";
export declare class WhatsAppService {
    private readonly logger;
    private readonly apiUrl;
    private requireTenant;
    getConfig(tenantId: string): Promise<WhatsAppConfig | null>;
    getConfigByPhoneNumberId(phoneNumberId: string): Promise<WhatsAppConfig | null>;
    getConfigByVerifyToken(token: string): Promise<WhatsAppConfig | null>;
    toSafeConfig(config: WhatsAppConfig | null): {
        id: string;
        tenant_id: string;
        phone_number: string;
        phone_number_id: string;
        waba_id: string;
        verify_token: string;
        provider: string;
        api_url: string;
        is_connected: boolean;
        has_access_token: boolean;
        access_token_hint: string;
        has_api_key: boolean;
        has_app_secret: boolean;
    };
    getSafeConfig(tenantId: string): Promise<{
        id: string;
        tenant_id: string;
        phone_number: string;
        phone_number_id: string;
        waba_id: string;
        verify_token: string;
        provider: string;
        api_url: string;
        is_connected: boolean;
        has_access_token: boolean;
        access_token_hint: string;
        has_api_key: boolean;
        has_app_secret: boolean;
    }>;
    saveConfig(data: WhatsAppConfigModel, userId: string | undefined, tenantId: string): Promise<WhatsAppConfig>;
    testConnection(data: WhatsAppConfigModel, userId: string | undefined, tenantId: string): Promise<{
        connected: boolean;
        provider: string;
        display_phone_number: any;
        verified_name: any;
        quality_rating: any;
        code_verification_status: any;
        message: string;
        session_id?: undefined;
        status?: undefined;
    } | {
        connected: boolean;
        provider: string;
        session_id: string;
        status: string;
        message: string;
        display_phone_number?: undefined;
        verified_name?: undefined;
        quality_rating?: undefined;
        code_verification_status?: undefined;
    } | {
        connected: boolean;
        provider: string;
        message: string;
        display_phone_number?: undefined;
        verified_name?: undefined;
        quality_rating?: undefined;
        code_verification_status?: undefined;
        session_id?: undefined;
        status?: undefined;
    }>;
    disconnect(tenantId: string, userId?: string): Promise<{
        id: string;
        tenant_id: string;
        phone_number: string;
        phone_number_id: string;
        waba_id: string;
        verify_token: string;
        provider: string;
        api_url: string;
        is_connected: boolean;
        has_access_token: boolean;
        access_token_hint: string;
        has_api_key: boolean;
        has_app_secret: boolean;
    }>;
    sendMessage(dto: SendWhatsAppMessageModel, userId: string | undefined, isAiGenerated?: boolean, tenantId?: string): Promise<{
        message: WhatsAppMessage;
        metaResponse: any;
    }>;
    getConversations(tenantId: string | null): Promise<WhatsAppConversation[]>;
    setConversationStatus(id: string, conversationStatus: string, tenantId: string | null): Promise<WhatsAppConversation>;
    getMessagesByConversation(conversationId: string, tenantId: string | null): Promise<WhatsAppMessage[]>;
}
