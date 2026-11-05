import { WhatsAppCampaign } from "@Database/Table/WhatsApp/WhatsAppCampaign.entity";
import { WhatsAppCampaignModel } from "../Models/WhatsAppCampaign.model";
import { WhatsAppService } from "./WhatsApp.service";
export declare class WhatsAppCampaignService {
    private readonly whatsAppService;
    private readonly logger;
    constructor(whatsAppService: WhatsAppService);
    listCampaigns(tenantId: string): Promise<WhatsAppCampaign[]>;
    createCampaign(dto: WhatsAppCampaignModel, userId: string | undefined, tenantId: string): Promise<WhatsAppCampaign>;
    updateCampaign(id: string, data: Partial<WhatsAppCampaignModel>, tenantId: string): Promise<WhatsAppCampaign>;
    toggleCampaign(id: string, is_active: boolean, tenantId: string): Promise<WhatsAppCampaign>;
    deleteCampaign(id: string, tenantId: string): Promise<boolean>;
    executeCampaign(campaignId: string, recipients: string[], templateName: string, tenantId: string): Promise<void>;
}
