import { WhatsAppCampaign } from "@Database/Table/WhatsApp/WhatsAppCampaign.entity";
import { WhatsAppCampaignModel } from "../Models/WhatsAppCampaign.model";
import { WhatsAppService } from "./WhatsApp.service";
export declare class WhatsAppCampaignService {
    private readonly whatsAppService;
    private readonly logger;
    constructor(whatsAppService: WhatsAppService);
    listCampaigns(tenantId?: string): Promise<WhatsAppCampaign[]>;
    createCampaign(dto: WhatsAppCampaignModel, userId?: string): Promise<WhatsAppCampaign>;
    updateCampaign(id: string, data: Partial<WhatsAppCampaignModel>): Promise<WhatsAppCampaign>;
    toggleCampaign(id: string, is_active: boolean): Promise<WhatsAppCampaign>;
    deleteCampaign(id: string): Promise<boolean>;
    executeCampaign(campaignId: string, recipients: string[], templateName: string): Promise<void>;
}
