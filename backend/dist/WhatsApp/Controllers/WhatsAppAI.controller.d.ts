import { AuthBaseController } from "@Controller/AuthBase.controller";
import { ResponseEnum } from "@Helper/Enum/ResponseEnum";
import { WhatsAppAIService } from "../Services/WhatsAppAI.service";
import { WhatsAppAIConfigModel } from "../Models/WhatsAppAIConfig.model";
export declare class WhatsAppAIController extends AuthBaseController {
    private readonly aiService;
    constructor(aiService: WhatsAppAIService);
    getConfig(): Promise<any>;
    saveConfig(body: WhatsAppAIConfigModel, userId: string): Promise<{
        Type: ResponseEnum;
        Message: string;
        AddtionalData: any;
    } | {
        Type: ResponseEnum;
        Message: string;
        AddtionalData?: undefined;
    }>;
}
