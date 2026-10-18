import { EmailCampaign } from "@Database/Table/Email/EmailCampaign.entity";
import { EmailCampaignModel } from "../Models/EmailCampaign.model";
import { EmailService } from "./Email.service";
export declare class EmailCampaignService {
    private readonly emailService;
    private readonly logger;
    constructor(emailService: EmailService);
    listCampaigns(tenantId?: string): Promise<EmailCampaign[]>;
    createCampaign(dto: EmailCampaignModel, userId?: string): Promise<EmailCampaign>;
    executeCampaign(campaignId: string, recipients: string[], subject: string, html: string, userId?: string): Promise<void>;
}
