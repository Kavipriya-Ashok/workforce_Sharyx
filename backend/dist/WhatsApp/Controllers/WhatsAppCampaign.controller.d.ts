import { JWTAuthController } from "@Controller/JWTAuth.controller";
import { ResponseEnum } from "@Helper/Enum/ResponseEnum";
import { WhatsAppCampaignService } from "../Services/WhatsAppCampaign.service";
import { WhatsAppCampaignModel } from "../Models/WhatsAppCampaign.model";
export declare class WhatsAppCampaignController extends JWTAuthController {
    private readonly campaignService;
    constructor(campaignService: WhatsAppCampaignService);
    listCampaigns(tenantId: string): Promise<any>;
    createCampaignBase(body: WhatsAppCampaignModel, userId: string, tenantId: string): Promise<{
        Type: ResponseEnum;
        Message: string;
        AddtionalData: any;
    } | {
        Type: ResponseEnum;
        Message: string;
        AddtionalData?: undefined;
    }>;
    createCampaign(body: WhatsAppCampaignModel, userId: string, tenantId: string): Promise<{
        Type: ResponseEnum;
        Message: string;
        AddtionalData: any;
    } | {
        Type: ResponseEnum;
        Message: string;
        AddtionalData?: undefined;
    }>;
    updateCampaign(id: string, body: Partial<WhatsAppCampaignModel>, tenantId: string): Promise<{
        Type: ResponseEnum;
        Message: string;
        AddtionalData: any;
    } | {
        Type: ResponseEnum;
        Message: string;
        AddtionalData?: undefined;
    }>;
    toggleCampaign(id: string, isActive: boolean, tenantId: string): Promise<{
        Type: ResponseEnum;
        Message: string;
        AddtionalData: any;
    } | {
        Type: ResponseEnum;
        Message: string;
        AddtionalData?: undefined;
    }>;
    deleteCampaign(id: string, tenantId: string): Promise<{
        Type: ResponseEnum;
        Message: string;
        AddtionalData: any;
    } | {
        Type: ResponseEnum;
        Message: string;
        AddtionalData?: undefined;
    }>;
}
