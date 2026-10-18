import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { WhatsAppCampaign } from "@Database/Table/WhatsApp/WhatsAppCampaign.entity";
import { WhatsAppCampaignModel } from "../Models/WhatsAppCampaign.model";
import { WhatsAppService } from "./WhatsApp.service";

@Injectable()
export class WhatsAppCampaignService {
  private readonly logger = new Logger(WhatsAppCampaignService.name);

  constructor(private readonly whatsAppService: WhatsAppService) {}

  async listCampaigns(tenantId: string = "default") {
    return await WhatsAppCampaign.find({
      where: { tenant_id: tenantId, status: true },
      order: { created_on: "DESC" },
    });
  }

  async createCampaign(dto: WhatsAppCampaignModel, userId?: string) {
    const campaign = new WhatsAppCampaign();
    campaign.tenant_id = "default";
    campaign.name = dto.name;
    campaign.description = dto.description || null;
    campaign.trigger_event = dto.trigger_event || "round_1_cleared";
    campaign.template_name = dto.template_name;
    campaign.delay_minutes = dto.delay_minutes ?? 0;
    campaign.is_active = dto.is_active !== undefined ? dto.is_active : true;
    campaign.total_recipients = dto.recipients?.length || 0;
    campaign.campaign_status = "active";
    campaign.scheduled_at = dto.scheduled_at || null;
    campaign.created_by_id = userId || "system";
    campaign.created_on = new Date();
    await campaign.save();

    // If manual recipients provided and no schedule date, dispatch immediately
    if (!dto.scheduled_at && dto.recipients?.length) {
      this.executeCampaign(campaign.id, dto.recipients, dto.template_name);
    }

    return campaign;
  }

  async updateCampaign(id: string, data: Partial<WhatsAppCampaignModel>) {
    const campaign = await WhatsAppCampaign.findOne({ where: { id, status: true } });
    if (!campaign) throw new NotFoundException("Campaign not found");

    if (data.name) campaign.name = data.name;
    if (data.description !== undefined) campaign.description = data.description;
    if (data.trigger_event) campaign.trigger_event = data.trigger_event;
    if (data.template_name) campaign.template_name = data.template_name;
    if (data.delay_minutes !== undefined) campaign.delay_minutes = data.delay_minutes;
    if (data.is_active !== undefined) campaign.is_active = data.is_active;
    if (data.scheduled_at !== undefined) campaign.scheduled_at = data.scheduled_at;
    campaign.updated_on = new Date();

    return await campaign.save();
  }

  async toggleCampaign(id: string, is_active: boolean) {
    const campaign = await WhatsAppCampaign.findOne({ where: { id, status: true } });
    if (!campaign) throw new NotFoundException("Campaign not found");

    campaign.is_active = is_active;
    campaign.campaign_status = is_active ? "active" : "paused";
    campaign.updated_on = new Date();
    return await campaign.save();
  }

  async deleteCampaign(id: string) {
    const campaign = await WhatsAppCampaign.findOne({ where: { id } });
    if (!campaign) throw new NotFoundException("Campaign not found");

    campaign.status = false;
    campaign.updated_on = new Date();
    await campaign.save();
    return true;
  }

  async executeCampaign(campaignId: string, recipients: string[], templateName: string) {
    const campaign = await WhatsAppCampaign.findOne({ where: { id: campaignId } });
    if (!campaign) return;

    campaign.campaign_status = "running";
    await campaign.save();

    let sent = 0;
    for (const phone of recipients) {
      try {
        await this.whatsAppService.sendMessage({
          to: phone,
          text: `Template: ${templateName}`,
          message_type: "template",
          template_name: templateName,
        });
        sent++;
      } catch (err: any) {
        this.logger.error(`Failed to send campaign message to ${phone}: ${err.message}`);
      }
    }

    campaign.sent_count = sent;
    campaign.campaign_status = "completed";
    await campaign.save();
  }
}
