import { AuthBaseController } from "@Controller/AuthBase.controller";
import { ResponseEnum } from "@Helper/Enum/ResponseEnum";
import { EmailAIService } from "../Services/EmailAI.service";
import { EmailAIConfigModel, GenerateEmailAIDraftModel } from "../Models/EmailAIConfig.model";
export declare class EmailAIController extends AuthBaseController {
    private readonly emailAiService;
    constructor(emailAiService: EmailAIService);
    getConfig(): Promise<any>;
    saveConfig(body: EmailAIConfigModel, userId: string): Promise<{
        Type: ResponseEnum;
        Message: string;
        AddtionalData: any;
    } | {
        Type: ResponseEnum;
        Message: string;
        AddtionalData?: undefined;
    }>;
    generateDraft(body: GenerateEmailAIDraftModel): Promise<any>;
}
