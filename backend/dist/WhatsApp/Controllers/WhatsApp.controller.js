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
exports.WhatsAppController = void 0;
const common_1 = require("@nestjs/common");
const StrictValidation_1 = require("../../Helper/StrictValidation");
const common_2 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const JWTAuth_controller_1 = require("../../Controller/JWTAuth.controller");
const Common_helper_1 = require("../../Helper/Common.helper");
const ResponseEnum_1 = require("../../Helper/Enum/ResponseEnum");
const WhatsApp_service_1 = require("../Services/WhatsApp.service");
const SendWhatsAppMessage_model_1 = require("../Models/SendWhatsAppMessage.model");
const WhatsAppConfig_model_1 = require("../Models/WhatsAppConfig.model");
let WhatsAppController = class WhatsAppController extends JWTAuth_controller_1.JWTAuthController {
    constructor(whatsAppService) {
        super();
        this.whatsAppService = whatsAppService;
    }
    async getConfig(tenantId) {
        const config = await this.whatsAppService.getSafeConfig(tenantId);
        return this.SendResponseData(config);
    }
    async saveConfig(body, userId, tenantId) {
        const saved = await this.whatsAppService.saveConfig(body, userId, tenantId);
        return this.SendResponse(ResponseEnum_1.ResponseEnum.Success, ResponseEnum_1.ResponseEnum.Saved, this.whatsAppService.toSafeConfig(saved));
    }
    async testConnection(body, userId, tenantId) {
        const result = await this.whatsAppService.testConnection(body, userId, tenantId);
        return this.SendResponse(ResponseEnum_1.ResponseEnum.Success, "WhatsApp connection test successful", result);
    }
    async disconnect(userId, tenantId) {
        const result = await this.whatsAppService.disconnect(tenantId, userId);
        return this.SendResponse(ResponseEnum_1.ResponseEnum.Success, "WhatsApp disconnected", result);
    }
    async sendMessage(body, userId, tenantId) {
        const result = await this.whatsAppService.sendMessage(body, userId, false, tenantId);
        return this.SendResponse(ResponseEnum_1.ResponseEnum.Success, "Message sent successfully", result);
    }
    async getConversations(tenantId) {
        const conversations = await this.whatsAppService.getConversations(tenantId);
        return this.SendResponseData(conversations);
    }
    async getMessages(conversationId, tenantId) {
        const messages = await this.whatsAppService.getMessagesByConversation(conversationId, tenantId);
        return this.SendResponseData(messages);
    }
    async updateConversationStatus(id, status, tenantId) {
        const result = await this.whatsAppService.setConversationStatus(id, status, tenantId);
        return this.SendResponse(ResponseEnum_1.ResponseEnum.Success, ResponseEnum_1.ResponseEnum.Updated, result);
    }
};
exports.WhatsAppController = WhatsAppController;
__decorate([
    (0, common_2.Get)("Config"),
    __param(0, (0, Common_helper_1.CurrentTenant)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], WhatsAppController.prototype, "getConfig", null);
__decorate([
    (0, common_2.Post)("Config"),
    (0, common_1.UsePipes)(...(0, StrictValidation_1.strictPipes)()),
    __param(0, (0, common_2.Body)()),
    __param(1, (0, Common_helper_1.CurrentUser)()),
    __param(2, (0, Common_helper_1.CurrentTenant)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [WhatsAppConfig_model_1.WhatsAppConfigModel, String, String]),
    __metadata("design:returntype", Promise)
], WhatsAppController.prototype, "saveConfig", null);
__decorate([
    (0, common_2.Post)("Test-Connection"),
    (0, common_1.UsePipes)(...(0, StrictValidation_1.strictPipes)()),
    __param(0, (0, common_2.Body)()),
    __param(1, (0, Common_helper_1.CurrentUser)()),
    __param(2, (0, Common_helper_1.CurrentTenant)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [WhatsAppConfig_model_1.WhatsAppConfigModel, String, String]),
    __metadata("design:returntype", Promise)
], WhatsAppController.prototype, "testConnection", null);
__decorate([
    (0, common_2.Post)("Disconnect"),
    __param(0, (0, Common_helper_1.CurrentUser)()),
    __param(1, (0, Common_helper_1.CurrentTenant)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], WhatsAppController.prototype, "disconnect", null);
__decorate([
    (0, common_2.Post)("Send"),
    __param(0, (0, common_2.Body)()),
    __param(1, (0, Common_helper_1.CurrentUser)()),
    __param(2, (0, Common_helper_1.CurrentTenant)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [SendWhatsAppMessage_model_1.SendWhatsAppMessageModel, String, String]),
    __metadata("design:returntype", Promise)
], WhatsAppController.prototype, "sendMessage", null);
__decorate([
    (0, common_2.Get)("Conversations"),
    __param(0, (0, Common_helper_1.CurrentTenant)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], WhatsAppController.prototype, "getConversations", null);
__decorate([
    (0, common_2.Get)("Messages/:conversationId"),
    __param(0, (0, common_2.Param)("conversationId")),
    __param(1, (0, Common_helper_1.CurrentTenant)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], WhatsAppController.prototype, "getMessages", null);
__decorate([
    (0, common_2.Patch)("Conversations/:id/status"),
    __param(0, (0, common_2.Param)("id")),
    __param(1, (0, common_2.Body)("status")),
    __param(2, (0, Common_helper_1.CurrentTenant)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], WhatsAppController.prototype, "updateConversationStatus", null);
exports.WhatsAppController = WhatsAppController = __decorate([
    (0, common_2.Controller)({ path: "WhatsApp", version: "1" }),
    (0, swagger_1.ApiTags)("WhatsApp"),
    __metadata("design:paramtypes", [WhatsApp_service_1.WhatsAppService])
], WhatsAppController);
//# sourceMappingURL=WhatsApp.controller.js.map