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
const swagger_1 = require("@nestjs/swagger");
const AuthBase_controller_1 = require("../../Controller/AuthBase.controller");
const Common_helper_1 = require("../../Helper/Common.helper");
const ResponseEnum_1 = require("../../Helper/Enum/ResponseEnum");
const WhatsApp_service_1 = require("../Services/WhatsApp.service");
const SendWhatsAppMessage_model_1 = require("../Models/SendWhatsAppMessage.model");
const WhatsAppConfig_model_1 = require("../Models/WhatsAppConfig.model");
let WhatsAppController = class WhatsAppController extends AuthBase_controller_1.AuthBaseController {
    constructor(whatsAppService) {
        super();
        this.whatsAppService = whatsAppService;
    }
    async getConfig() {
        const config = await this.whatsAppService.getConfig();
        return this.SendResponseData(config);
    }
    async saveConfig(body, userId) {
        const result = await this.whatsAppService.saveConfig(body, userId);
        return this.SendResponse(ResponseEnum_1.ResponseEnum.Success, ResponseEnum_1.ResponseEnum.Saved, result);
    }
    async testConnection(body, userId) {
        const result = await this.whatsAppService.testConnection(body, userId);
        return this.SendResponse(ResponseEnum_1.ResponseEnum.Success, "WhatsApp connection test successful", result);
    }
    async sendMessage(body, userId) {
        const result = await this.whatsAppService.sendMessage(body, userId);
        return this.SendResponse(ResponseEnum_1.ResponseEnum.Success, "Message sent successfully", result);
    }
    async getConversations() {
        const conversations = await this.whatsAppService.getConversations();
        return this.SendResponseData(conversations);
    }
    async getMessages(conversationId) {
        const messages = await this.whatsAppService.getMessagesByConversation(conversationId);
        return this.SendResponseData(messages);
    }
};
exports.WhatsAppController = WhatsAppController;
__decorate([
    (0, common_1.Get)("Config"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], WhatsAppController.prototype, "getConfig", null);
__decorate([
    (0, common_1.Post)("Config"),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, Common_helper_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [WhatsAppConfig_model_1.WhatsAppConfigModel, String]),
    __metadata("design:returntype", Promise)
], WhatsAppController.prototype, "saveConfig", null);
__decorate([
    (0, common_1.Post)("Test-Connection"),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, Common_helper_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [WhatsAppConfig_model_1.WhatsAppConfigModel, String]),
    __metadata("design:returntype", Promise)
], WhatsAppController.prototype, "testConnection", null);
__decorate([
    (0, common_1.Post)("Send"),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, Common_helper_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [SendWhatsAppMessage_model_1.SendWhatsAppMessageModel, String]),
    __metadata("design:returntype", Promise)
], WhatsAppController.prototype, "sendMessage", null);
__decorate([
    (0, common_1.Get)("Conversations"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], WhatsAppController.prototype, "getConversations", null);
__decorate([
    (0, common_1.Get)("Messages/:conversationId"),
    __param(0, (0, common_1.Param)("conversationId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], WhatsAppController.prototype, "getMessages", null);
exports.WhatsAppController = WhatsAppController = __decorate([
    (0, common_1.Controller)({ path: "WhatsApp", version: "1" }),
    (0, swagger_1.ApiTags)("WhatsApp"),
    __metadata("design:paramtypes", [WhatsApp_service_1.WhatsAppService])
], WhatsAppController);
//# sourceMappingURL=WhatsApp.controller.js.map