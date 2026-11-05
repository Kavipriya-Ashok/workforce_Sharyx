import { JWTAuthController } from "@Controller/JWTAuth.controller";
import { ResponseEnum } from "@Helper/Enum/ResponseEnum";
import { EmailAIService } from "../Services/EmailAI.service";
import { EmailAIConfigModel, GenerateEmailAIDraftModel } from "../Models/EmailAIConfig.model";
export declare class EmailAIController extends JWTAuthController {
    private readonly emailAiService;
    constructor(emailAiService: EmailAIService);
    getConfig(tenantId: string): Promise<any>;
    saveConfig(body: EmailAIConfigModel, userId: string, tenantId: string): Promise<{
        Type: ResponseEnum;
        Message: string;
        AddtionalData: any;
    } | {
        Type: ResponseEnum;
        Message: string;
        AddtionalData?: undefined;
    }>;
    generateDraft(body: GenerateEmailAIDraftModel, tenantId: string): Promise<any>;
}
