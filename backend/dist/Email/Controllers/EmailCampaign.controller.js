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
const AuthBase_controller_1 = require("../../Controller/AuthBase.controller");
const Common_helper_1 = require("../../Helper/Common.helper");
const ResponseEnum_1 = require("../../Helper/Enum/ResponseEnum");
const EmailCampaign_service_1 = require("../Services/EmailCampaign.service");
const EmailCampaign_model_1 = require("../Models/EmailCampaign.model");
let EmailCampaignController = class EmailCampaignController extends AuthBase_controller_1.AuthBaseController {
    constructor(campaignService) {
        super();
        this.campaignService = campaignService;
    }
    async listCampaigns() {
        const campaigns = await this.campaignService.listCampaigns();
        return this.SendResponseData(campaigns);
    }
    async createCampaign(body, userId) {
        const campaign = await this.campaignService.createCampaign(body, userId);
        return this.SendResponse(ResponseEnum_1.ResponseEnum.Success, ResponseEnum_1.ResponseEnum.Created, campaign);
    }
};
exports.EmailCampaignController = EmailCampaignController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], EmailCampaignController.prototype, "listCampaigns", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, Common_helper_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [EmailCampaign_model_1.EmailCampaignModel, String]),
    __metadata("design:returntype", Promise)
], EmailCampaignController.prototype, "createCampaign", null);
exports.EmailCampaignController = EmailCampaignController = __decorate([
    (0, common_1.Controller)({ path: "Email/Campaign", version: "1" }),
    (0, swagger_1.ApiTags)("Email Campaign"),
    __metadata("design:paramtypes", [EmailCampaign_service_1.EmailCampaignService])
], EmailCampaignController);
//# sourceMappingURL=EmailCampaign.controller.js.map