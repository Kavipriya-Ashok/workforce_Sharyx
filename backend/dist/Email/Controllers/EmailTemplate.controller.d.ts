import { AuthBaseController } from "@Controller/AuthBase.controller";
import { ResponseEnum } from "@Helper/Enum/ResponseEnum";
import { EmailTemplateService } from "../Services/EmailTemplate.service";
export declare class EmailTemplateController extends AuthBaseController {
    private readonly templateService;
    constructor(templateService: EmailTemplateService);
    getTemplates(): Promise<any>;
    createTemplate(body: any): Promise<{
        Type: ResponseEnum;
        Message: string;
        AddtionalData: any;
    } | {
        Type: ResponseEnum;
        Message: string;
        AddtionalData?: undefined;
    }>;
    updateTemplate(id: string, body: any): Promise<{
        Type: ResponseEnum;
        Message: string;
        AddtionalData: any;
    } | {
        Type: ResponseEnum;
        Message: string;
        AddtionalData?: undefined;
    }>;
    deleteTemplate(id: string): Promise<{
        Type: ResponseEnum;
        Message: string;
        AddtionalData: any;
    } | {
        Type: ResponseEnum;
        Message: string;
        AddtionalData?: undefined;
    }>;
    previewTemplate(id: string, variables: Record<string, string>): Promise<any>;
}
