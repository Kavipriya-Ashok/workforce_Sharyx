import { AuthBaseController } from "@Controller/AuthBase.controller";
import { ResponseEnum } from "@Helper/Enum/ResponseEnum";
import { EmailCampaignService } from "../Services/EmailCampaign.service";
import { EmailCampaignModel } from "../Models/EmailCampaign.model";
export declare class EmailCampaignController extends AuthBaseController {
    private readonly campaignService;
    constructor(campaignService: EmailCampaignService);
    listCampaigns(): Promise<any>;
    createCampaign(body: EmailCampaignModel, userId: string): Promise<{
        Type: ResponseEnum;
        Message: string;
        AddtionalData: any;
    } | {
        Type: ResponseEnum;
        Message: string;
        AddtionalData?: undefined;
    }>;
}
