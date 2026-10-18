import { WhatsAppAIConfig } from "@Database/Table/WhatsApp/WhatsAppAIConfig.entity";
import { WhatsAppAIConfigModel } from "../Models/WhatsAppAIConfig.model";
import { PromptEngineService } from "./PromptEngine.service";
export declare class WhatsAppAIService {
    private readonly promptEngineService;
    private readonly logger;
    constructor(promptEngineService: PromptEngineService);
    getConfig(tenantId?: string): Promise<WhatsAppAIConfig | null>;
    saveConfig(data: WhatsAppAIConfigModel, userId?: string): Promise<WhatsAppAIConfig>;
    generateResponse(customerMessage: string, customerPhone: string, tenantId?: string, conversationId?: string): Promise<string | null>;
}
