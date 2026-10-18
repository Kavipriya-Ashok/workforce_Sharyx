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
var EmailCampaignService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailCampaignService = void 0;
const common_1 = require("@nestjs/common");
const EmailCampaign_entity_1 = require("../../Database/Table/Email/EmailCampaign.entity");
const Email_service_1 = require("./Email.service");
let EmailCampaignService = EmailCampaignService_1 = class EmailCampaignService {
    constructor(emailService) {
        this.emailService = emailService;
        this.logger = new common_1.Logger(EmailCampaignService_1.name);
    }
    async listCampaigns(tenantId = "default") {
        return await EmailCampaign_entity_1.EmailCampaign.find({
            where: { tenant_id: tenantId, status: true },
            order: { created_on: "DESC" },
        });
    }
    async createCampaign(dto, userId) {
        var _a, _b;
        const campaign = new EmailCampaign_entity_1.EmailCampaign();
        campaign.tenant_id = "default";
        campaign.campaign_name = dto.campaign_name;
        campaign.subject = dto.subject;
        campaign.html_template = dto.html_template;
        campaign.recipients_count = ((_a = dto.recipients) === null || _a === void 0 ? void 0 : _a.length) || 0;
        campaign.sent_count = 0;
        campaign.opened_count = 0;
        campaign.campaign_status = "sending";
        campaign.created_by_id = userId || "system";
        campaign.created_on = new Date();
        await campaign.save();
        if ((_b = dto.recipients) === null || _b === void 0 ? void 0 : _b.length) {
            this.executeCampaign(campaign.id, dto.recipients, dto.subject, dto.html_template, userId);
        }
        return campaign;
    }
    async executeCampaign(campaignId, recipients, subject, html, userId) {
        const campaign = await EmailCampaign_entity_1.EmailCampaign.findOne({ where: { id: campaignId } });
        if (!campaign)
            return;
        let sent = 0;
        for (const email of recipients) {
            try {
                await this.emailService.sendEmail({
                    to: email,
                    subject,
                    html,
                }, userId);
                sent++;
            }
            catch (err) {
                this.logger.error(`Failed to send campaign email to ${email}: ${err.message}`);
            }
        }
        campaign.sent_count = sent;
        campaign.campaign_status = "sent";
        await campaign.save();
    }
};
exports.EmailCampaignService = EmailCampaignService;
exports.EmailCampaignService = EmailCampaignService = EmailCampaignService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [Email_service_1.EmailService])
], EmailCampaignService);
//# sourceMappingURL=EmailCampaign.service.js.map