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
exports.EmailController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const AuthBase_controller_1 = require("../../Controller/AuthBase.controller");
const Common_helper_1 = require("../../Helper/Common.helper");
const ResponseEnum_1 = require("../../Helper/Enum/ResponseEnum");
const Email_service_1 = require("../Services/Email.service");
const EmailAccountConfig_model_1 = require("../Models/EmailAccountConfig.model");
const SendEmail_model_1 = require("../Models/SendEmail.model");
let EmailController = class EmailController extends AuthBase_controller_1.AuthBaseController {
    constructor(emailService) {
        super();
        this.emailService = emailService;
    }
    async getConfig() {
        const config = await this.emailService.getConfig();
        return this.SendResponseData(config);
    }
    async saveConfig(body, userId) {
        const result = await this.emailService.saveConfig(body, userId);
        return this.SendResponse(ResponseEnum_1.ResponseEnum.Success, ResponseEnum_1.ResponseEnum.Saved, result);
    }
    async sendEmail(body, userId) {
        const result = await this.emailService.sendEmail(body, userId);
        return this.SendResponse(ResponseEnum_1.ResponseEnum.Success, ResponseEnum_1.ResponseEnum.Mail, result);
    }
    async getInbox() {
        const logs = await this.emailService.getInboxLogs();
        return this.SendResponseData(logs);
    }
    async getThread(identifier) {
        const thread = await this.emailService.getThread(identifier);
        return this.SendResponseData(thread);
    }
};
exports.EmailController = EmailController;
__decorate([
    (0, common_1.Get)("Config"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], EmailController.prototype, "getConfig", null);
__decorate([
    (0, common_1.Post)("Config"),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, Common_helper_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [EmailAccountConfig_model_1.EmailAccountConfigModel, String]),
    __metadata("design:returntype", Promise)
], EmailController.prototype, "saveConfig", null);
__decorate([
    (0, common_1.Post)("Send"),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, Common_helper_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [SendEmail_model_1.SendEmailModel, String]),
    __metadata("design:returntype", Promise)
], EmailController.prototype, "sendEmail", null);
__decorate([
    (0, common_1.Get)("Inbox"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], EmailController.prototype, "getInbox", null);
__decorate([
    (0, common_1.Get)("Thread/:identifier"),
    __param(0, (0, common_1.Param)("identifier")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], EmailController.prototype, "getThread", null);
exports.EmailController = EmailController = __decorate([
    (0, common_1.Controller)({ path: "Email", version: "1" }),
    (0, swagger_1.ApiTags)("Email Automation"),
    __metadata("design:paramtypes", [Email_service_1.EmailService])
], EmailController);
//# sourceMappingURL=Email.controller.js.map