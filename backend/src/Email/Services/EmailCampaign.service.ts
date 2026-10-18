import { Injectable, Logger } from "@nestjs/common";
import { EmailCampaign } from "@Database/Table/Email/EmailCampaign.entity";
import { EmailCampaignModel } from "../Models/EmailCampaign.model";
import { EmailService } from "./Email.service";

@Injectable()
export class EmailCampaignService {
  private readonly logger = new Logger(EmailCampaignService.name);

  constructor(private readonly emailService: EmailService) {}

  async listCampaigns(tenantId: string = "default") {
    return await EmailCampaign.find({
      where: { tenant_id: tenantId, status: true },
      order: { created_on: "DESC" },
    });
  }

  async createCampaign(dto: EmailCampaignModel, userId?: string) {
    const campaign = new EmailCampaign();
    campaign.tenant_id = "default";
    campaign.campaign_name = dto.campaign_name;
    campaign.subject = dto.subject;
    campaign.html_template = dto.html_template;
    campaign.recipients_count = dto.recipients?.length || 0;
    campaign.sent_count = 0;
    campaign.opened_count = 0;
    campaign.campaign_status = "sending";
    campaign.created_by_id = userId || "system";
    campaign.created_on = new Date();
    await campaign.save();

    // Run sending in background
    if (dto.recipients?.length) {
      this.executeCampaign(campaign.id, dto.recipients, dto.subject, dto.html_template, userId);
    }

    return campaign;
  }

  async executeCampaign(
    campaignId: string,
    recipients: string[],
    subject: string,
    html: string,
    userId?: string
  ) {
    const campaign = await EmailCampaign.findOne({ where: { id: campaignId } });
    if (!campaign) return;

    let sent = 0;
    for (const email of recipients) {
      try {
        await this.emailService.sendEmail(
          {
            to: email,
            subject,
            html,
          },
          userId
        );
        sent++;
      } catch (err: any) {
        this.logger.error(`Failed to send campaign email to ${email}: ${err.message}`);
      }
    }

    campaign.sent_count = sent;
    campaign.campaign_status = "sent";
    await campaign.save();
  }
}
