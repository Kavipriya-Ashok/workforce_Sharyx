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
exports.EmailCampaignController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const JWTAuth_controller_1 = require("../../Controller/JWTAuth.controller");
const Common_helper_1 = require("../../Helper/Common.helper");
const ResponseEnum_1 = require("../../Helper/Enum/ResponseEnum");
const EmailCampaign_service_1 = require("../Services/EmailCampaign.service");
const EmailCampaign_model_1 = require("../Models/EmailCampaign.model");
const common_2 = require("@nestjs/common");
const JwtAuthGuard_service_1 = require("../../Service/Auth/JwtAuthGuard.service");
const TenantContext_guard_1 = require("../../Service/Auth/TenantContext.guard");
let EmailCampaignController = class EmailCampaignController extends JWTAuth_controller_1.JWTAuthController {
    constructor(campaignService) {
        super();
        this.campaignService = campaignService;
    }
    async listCampaigns(tenantId) {
        const campaigns = await this.campaignService.listCampaigns(tenantId);
        return this.SendResponseData(campaigns);
    }
    async createCampaign(body, userId, tenantId) {
        const campaign = await this.campaignService.createCampaign(body, userId, tenantId);
        return this.SendResponse(ResponseEnum_1.ResponseEnum.Success, ResponseEnum_1.ResponseEnum.Created, campaign);
    }
};
exports.EmailCampaignController = EmailCampaignController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, Common_helper_1.CurrentTenant)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], EmailCampaignController.prototype, "listCampaigns", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, Common_helper_1.CurrentUser)()),
    __param(2, (0, Common_helper_1.CurrentTenant)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [EmailCampaign_model_1.EmailCampaignModel, String, String]),
    __metadata("design:returntype", Promise)
], EmailCampaignController.prototype, "createCampaign", null);
exports.EmailCampaignController = EmailCampaignController = __decorate([
    (0, common_2.UseGuards)(JwtAuthGuard_service_1.JwtAuthGuard, TenantContext_guard_1.TenantContextGuard),
    (0, common_1.Controller)({ path: "Email/Campaign", version: "1" }),
    (0, swagger_1.ApiTags)("Email Campaign"),
    __metadata("design:paramtypes", [EmailCampaign_service_1.EmailCampaignService])
], EmailCampaignController);
//# sourceMappingURL=EmailCampaign.controller.js.map