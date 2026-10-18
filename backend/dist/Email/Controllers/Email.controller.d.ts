import { AuthBaseController } from "@Controller/AuthBase.controller";
import { ResponseEnum } from "@Helper/Enum/ResponseEnum";
import { EmailService } from "../Services/Email.service";
import { EmailAccountConfigModel } from "../Models/EmailAccountConfig.model";
import { SendEmailModel } from "../Models/SendEmail.model";
export declare class EmailController extends AuthBaseController {
    private readonly emailService;
    constructor(emailService: EmailService);
    getConfig(): Promise<any>;
    saveConfig(body: EmailAccountConfigModel, userId: string): Promise<{
        Type: ResponseEnum;
        Message: string;
        AddtionalData: any;
    } | {
        Type: ResponseEnum;
        Message: string;
        AddtionalData?: undefined;
    }>;
    sendEmail(body: SendEmailModel, userId: string): Promise<{
        Type: ResponseEnum;
        Message: string;
        AddtionalData: any;
    } | {
        Type: ResponseEnum;
        Message: string;
        AddtionalData?: undefined;
    }>;
    getInbox(): Promise<any>;
    getThread(identifier: string): Promise<any>;
}
