import { JWTAuthController } from "@Controller/JWTAuth.controller";
import { ResponseEnum } from "@Helper/Enum/ResponseEnum";
import { WhatsAppAIService } from "../Services/WhatsAppAI.service";
import { WhatsAppAIConfigModel } from "../Models/WhatsAppAIConfig.model";
export declare class WhatsAppAIController extends JWTAuthController {
    private readonly aiService;
    constructor(aiService: WhatsAppAIService);
    getConfig(tenantId: string): Promise<any>;
    saveConfig(body: WhatsAppAIConfigModel, userId: string, tenantId: string): Promise<{
        Type: ResponseEnum;
        Message: string;
        AddtionalData: any;
    } | {
        Type: ResponseEnum;
        Message: string;
        AddtionalData?: undefined;
    }>;
}
