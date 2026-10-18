import { AuthBaseController } from "@Controller/AuthBase.controller";
import { ResponseEnum } from "@Helper/Enum/ResponseEnum";
import { WhatsAppCampaignService } from "../Services/WhatsAppCampaign.service";
import { WhatsAppCampaignModel } from "../Models/WhatsAppCampaign.model";
export declare class WhatsAppCampaignController extends AuthBaseController {
    private readonly campaignService;
    constructor(campaignService: WhatsAppCampaignService);
    listCampaigns(): Promise<any>;
    createCampaignBase(body: WhatsAppCampaignModel, userId: string): Promise<{
        Type: ResponseEnum;
        Message: string;
        AddtionalData: any;
    } | {
        Type: ResponseEnum;
        Message: string;
        AddtionalData?: undefined;
    }>;
    createCampaign(body: WhatsAppCampaignModel, userId: string): Promise<{
        Type: ResponseEnum;
        Message: string;
        AddtionalData: any;
    } | {
        Type: ResponseEnum;
        Message: string;
        AddtionalData?: undefined;
    }>;
    updateCampaign(id: string, body: Partial<WhatsAppCampaignModel>): Promise<{
        Type: ResponseEnum;
        Message: string;
        AddtionalData: any;
    } | {
        Type: ResponseEnum;
        Message: string;
        AddtionalData?: undefined;
    }>;
    toggleCampaign(id: string, isActive: boolean): Promise<{
        Type: ResponseEnum;
        Message: string;
        AddtionalData: any;
    } | {
        Type: ResponseEnum;
        Message: string;
        AddtionalData?: undefined;
    }>;
    deleteCampaign(id: string): Promise<{
        Type: ResponseEnum;
        Message: string;
        AddtionalData: any;
    } | {
        Type: ResponseEnum;
        Message: string;
        AddtionalData?: undefined;
    }>;
}
