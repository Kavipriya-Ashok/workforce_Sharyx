import { JWTAuthController } from "@Controller/JWTAuth.controller";
import { ResponseEnum } from "@Helper/Enum/ResponseEnum";
import { EmailCampaignService } from "../Services/EmailCampaign.service";
import { EmailCampaignModel } from "../Models/EmailCampaign.model";
export declare class EmailCampaignController extends JWTAuthController {
    private readonly campaignService;
    constructor(campaignService: EmailCampaignService);
    listCampaigns(tenantId: string): Promise<any>;
    createCampaign(body: EmailCampaignModel, userId: string, tenantId: string): Promise<{
        Type: ResponseEnum;
        Message: string;
        AddtionalData: any;
    } | {
        Type: ResponseEnum;
        Message: string;
        AddtionalData?: undefined;
    }>;
}
