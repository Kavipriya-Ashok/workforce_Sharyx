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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsAppCampaignController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const JWTAuth_controller_1 = require("../../Controller/JWTAuth.controller");
const Common_helper_1 = require("../../Helper/Common.helper");
const ResponseEnum_1 = require("../../Helper/Enum/ResponseEnum");
const WhatsAppCampaign_service_1 = require("../Services/WhatsAppCampaign.service");
const WhatsAppCampaign_model_1 = require("../Models/WhatsAppCampaign.model");
let WhatsAppCampaignController = class WhatsAppCampaignController extends JWTAuth_controller_1.JWTAuthController {
    constructor(campaignService) {
        super();
        this.campaignService = campaignService;
    }
    async listCampaigns(tenantId) {
        const campaigns = await this.campaignService.listCampaigns(tenantId);
        return this.SendResponseData(campaigns);
    }
    async createCampaignBase(body, userId, tenantId) {
        const campaign = await this.campaignService.createCampaign(body, userId, tenantId);
        return this.SendResponse(ResponseEnum_1.ResponseEnum.Success, ResponseEnum_1.ResponseEnum.Created, campaign);
    }
    async createCampaign(body, userId, tenantId) {
        const campaign = await this.campaignService.createCampaign(body, userId, tenantId);
        return this.SendResponse(ResponseEnum_1.ResponseEnum.Success, ResponseEnum_1.ResponseEnum.Created, campaign);
    }
    async updateCampaign(id, body, tenantId) {
        const campaign = await this.campaignService.updateCampaign(id, body, tenantId);
        return this.SendResponse(ResponseEnum_1.ResponseEnum.Success, ResponseEnum_1.ResponseEnum.Updated, campaign);
    }
    async toggleCampaign(id, isActive, tenantId) {
        const campaign = await this.campaignService.toggleCampaign(id, isActive, tenantId);
        return this.SendResponse(ResponseEnum_1.ResponseEnum.Success, ResponseEnum_1.ResponseEnum.Updated, campaign);
    }
    async deleteCampaign(id, tenantId) {
        await this.campaignService.deleteCampaign(id, tenantId);
        return this.SendResponse(ResponseEnum_1.ResponseEnum.Success, ResponseEnum_1.ResponseEnum.Deleted, { id });
    }
};
exports.WhatsAppCampaignController = WhatsAppCampaignController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, Common_helper_1.CurrentTenant)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], WhatsAppCampaignController.prototype, "listCampaigns", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, Common_helper_1.CurrentUser)()),
    __param(2, (0, Common_helper_1.CurrentTenant)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [WhatsAppCampaign_model_1.WhatsAppCampaignModel, String, String]),
    __metadata("design:returntype", Promise)
], WhatsAppCampaignController.prototype, "createCampaignBase", null);
__decorate([
    (0, common_1.Post)("Create"),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, Common_helper_1.CurrentUser)()),
    __param(2, (0, Common_helper_1.CurrentTenant)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [WhatsAppCampaign_model_1.WhatsAppCampaignModel, String, String]),
    __metadata("design:returntype", Promise)
], WhatsAppCampaignController.prototype, "createCampaign", null);
__decorate([
    (0, common_1.Put)("Update/:id"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, Common_helper_1.CurrentTenant)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", Promise)
], WhatsAppCampaignController.prototype, "updateCampaign", null);
__decorate([
    (0, common_1.Patch)("Toggle/:id"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)("is_active")),
    __param(2, (0, Common_helper_1.CurrentTenant)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Boolean, String]),
    __metadata("design:returntype", Promise)
], WhatsAppCampaignController.prototype, "toggleCampaign", null);
__decorate([
    (0, common_1.Delete)("Delete/:id"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, Common_helper_1.CurrentTenant)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], WhatsAppCampaignController.prototype, "deleteCampaign", null);
exports.WhatsAppCampaignController = WhatsAppCampaignController = __decorate([
    (0, common_1.Controller)({ path: "WhatsApp/Campaigns", version: "1" }),
    (0, swagger_1.ApiTags)("WhatsApp Campaigns"),
    __metadata("design:paramtypes", [WhatsAppCampaign_service_1.WhatsAppCampaignService])
], WhatsAppCampaignController);
//# sourceMappingURL=WhatsAppCampaign.controller.js.map