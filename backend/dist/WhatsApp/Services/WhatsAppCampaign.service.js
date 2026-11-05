"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var WhatsAppCampaignService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsAppCampaignService = void 0;
const common_1 = require("@nestjs/common");
const WhatsAppCampaign_entity_1 = require("../../Database/Table/WhatsApp/WhatsAppCampaign.entity");
const WhatsApp_service_1 = require("./WhatsApp.service");
let WhatsAppCampaignService = WhatsAppCampaignService_1 = class WhatsAppCampaignService {
    constructor(whatsAppService) {
        this.whatsAppService = whatsAppService;
        this.logger = new common_1.Logger(WhatsAppCampaignService_1.name);
    }
    async listCampaigns(tenantId) {
        return await WhatsAppCampaign_entity_1.WhatsAppCampaign.find({
            where: { tenant_id: tenantId, status: true },
            order: { created_on: "DESC" },
        });
    }
    async createCampaign(dto, userId, tenantId) {
        var _a, _b, _c;
        const campaign = new WhatsAppCampaign_entity_1.WhatsAppCampaign();
        campaign.tenant_id = tenantId;
        campaign.name = dto.name;
        campaign.description = dto.description || null;
        campaign.trigger_event = dto.trigger_event || "after_call_ends";
        campaign.outcome_filter = dto.outcome_filter || "ALL";
        campaign.template_name = dto.template_name;
        campaign.delay_minutes = (_a = dto.delay_minutes) !== null && _a !== void 0 ? _a : 0;
        campaign.is_active = dto.is_active !== undefined ? dto.is_active : true;
        campaign.attach_pdf = Boolean(dto.attach_pdf);
        campaign.pdf_template_type = dto.pdf_template_type || null;
        campaign.pdf_title = dto.pdf_title || null;
        campaign.total_recipients = ((_b = dto.recipients) === null || _b === void 0 ? void 0 : _b.length) || 0;
        campaign.campaign_status = "active";
        campaign.scheduled_at = dto.scheduled_at || null;
        campaign.created_by_id = userId || undefined;
        campaign.created_on = new Date();
        await campaign.save();
        if (!dto.scheduled_at && ((_c = dto.recipients) === null || _c === void 0 ? void 0 : _c.length)) {
            this.executeCampaign(campaign.id, dto.recipients, dto.template_name, tenantId);
        }
        return campaign;
    }
    async updateCampaign(id, data, tenantId) {
        const campaign = await WhatsAppCampaign_entity_1.WhatsAppCampaign.findOne({ where: { id, tenant_id: tenantId, status: true } });
        if (!campaign)
            throw new common_1.NotFoundException("Campaign not found");
        if (data.name)
            campaign.name = data.name;
        if (data.description !== undefined)
            campaign.description = data.description;
        if (data.trigger_event)
            campaign.trigger_event = data.trigger_event;
        if (data.outcome_filter !== undefined)
            campaign.outcome_filter = data.outcome_filter;
        if (data.template_name)
            campaign.template_name = data.template_name;
        if (data.delay_minutes !== undefined)
            campaign.delay_minutes = data.delay_minutes;
        if (data.is_active !== undefined)
            campaign.is_active = data.is_active;
        if (data.scheduled_at !== undefined)
            campaign.scheduled_at = data.scheduled_at;
        if (data.attach_pdf !== undefined)
            campaign.attach_pdf = Boolean(data.attach_pdf);
        if (data.pdf_template_type !== undefined)
            campaign.pdf_template_type = data.pdf_template_type;
        if (data.pdf_title !== undefined)
            campaign.pdf_title = data.pdf_title;
        campaign.updated_on = new Date();
        return await campaign.save();
    }
    async toggleCampaign(id, is_active, tenantId) {
        const campaign = await WhatsAppCampaign_entity_1.WhatsAppCampaign.findOne({ where: { id, tenant_id: tenantId, status: true } });
        if (!campaign)
            throw new common_1.NotFoundException("Campaign not found");
        campaign.is_active = is_active;
        campaign.campaign_status = is_active ? "active" : "paused";
        campaign.updated_on = new Date();
        return await campaign.save();
    }
    async deleteCampaign(id, tenantId) {
        const campaign = await WhatsAppCampaign_entity_1.WhatsAppCampaign.findOne({ where: { id, tenant_id: tenantId } });
        if (!campaign)
            throw new common_1.NotFoundException("Campaign not found");
        campaign.status = false;
        campaign.updated_on = new Date();
        await campaign.save();
        return true;
    }
    async executeCampaign(campaignId, recipients, templateName, tenantId) {
        const campaign = await WhatsAppCampaign_entity_1.WhatsAppCampaign.findOne({ where: { id: campaignId, tenant_id: tenantId } });
        if (!campaign)
            return;
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
                }, undefined, false, tenantId);
                sent++;
            }
            catch (err) {
                this.logger.error(`Failed to send campaign message to ${phone}: ${err.message}`);
            }
        }
        campaign.sent_count = sent;
        campaign.campaign_status = "completed";
        await campaign.save();
    }
};
exports.WhatsAppCampaignService = WhatsAppCampaignService;
exports.WhatsAppCampaignService = WhatsAppCampaignService = WhatsAppCampaignService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [WhatsApp_service_1.WhatsAppService])
], WhatsAppCampaignService);
//# sourceMappingURL=WhatsAppCampaign.service.js.map