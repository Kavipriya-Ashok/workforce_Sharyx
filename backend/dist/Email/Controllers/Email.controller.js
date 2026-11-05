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
const JWTAuth_controller_1 = require("../../Controller/JWTAuth.controller");
const Common_helper_1 = require("../../Helper/Common.helper");
const ResponseEnum_1 = require("../../Helper/Enum/ResponseEnum");
const Email_service_1 = require("../Services/Email.service");
const EmailAI_service_1 = require("../Services/EmailAI.service");
const EmailImap_service_1 = require("../Services/EmailImap.service");
const EmailAccountConfig_model_1 = require("../Models/EmailAccountConfig.model");
const SendEmail_model_1 = require("../Models/SendEmail.model");
const common_2 = require("@nestjs/common");
const StrictValidation_1 = require("../../Helper/StrictValidation");
const JwtAuthGuard_service_1 = require("../../Service/Auth/JwtAuthGuard.service");
const TenantContext_guard_1 = require("../../Service/Auth/TenantContext.guard");
let EmailController = class EmailController extends JWTAuth_controller_1.JWTAuthController {
    constructor(emailService, emailAiService, emailImapService) {
        super();
        this.emailService = emailService;
        this.emailAiService = emailAiService;
        this.emailImapService = emailImapService;
    }
    async getConfig(headerTenantId) {
        const safe = await this.emailService.getSafeConfig(headerTenantId || "default");
        return this.SendResponseData(safe);
    }
    async saveConfig(body, userId, headerTenantId) {
        if (!headerTenantId || headerTenantId === "all") {
            throw new common_1.BadRequestException("Select a specific tenant to save its email settings.");
        }
        body.tenant_id = headerTenantId;
        const saved = await this.emailService.saveConfig(body, userId);
        return this.SendResponse(ResponseEnum_1.ResponseEnum.Success, ResponseEnum_1.ResponseEnum.Saved, this.emailService.toSafeConfig(saved));
    }
    async testConnection(body, userId, headerTenantId) {
        const result = await this.emailService.testConnection(headerTenantId, userId, body);
        return this.SendResponse(ResponseEnum_1.ResponseEnum.Success, result.message, result);
    }
    getGoogleAuthUrl(redirectUri) {
        const res = this.emailService.getGoogleAuthUrl(redirectUri);
        return this.SendResponseData(res);
    }
    async connectGoogle(body, userId, headerTenantId) {
        if (!headerTenantId || headerTenantId === "all") {
            throw new common_1.BadRequestException("Select a specific tenant to connect a Google mailbox.");
        }
        const activeTenant = headerTenantId;
        const result = await this.emailService.connectGoogleAccount(body.code, body.redirectUri, userId, activeTenant);
        return this.SendResponse(ResponseEnum_1.ResponseEnum.Success, ResponseEnum_1.ResponseEnum.Saved, result);
    }
    async getOAuthStatus(headerTenantId) {
        const activeTenant = (headerTenantId && headerTenantId !== "all") ? headerTenantId : "default";
        const status = await this.emailService.getOAuthStatus(activeTenant);
        return this.SendResponseData(status);
    }
    async disconnectGoogle(userId, headerTenantId) {
        const activeTenant = (headerTenantId && headerTenantId !== "all") ? headerTenantId : "default";
        const result = await this.emailService.disconnectGoogleAccount(activeTenant, userId);
        return this.SendResponse(ResponseEnum_1.ResponseEnum.Success, ResponseEnum_1.ResponseEnum.Deleted, result);
    }
    async generateLeadDraft(body, tenantId) {
        const draft = await this.emailAiService.generateLeadFollowupDraft(body.lead_id, body.customPrompt, body.intent, tenantId);
        return this.SendResponseData(draft);
    }
    async sendLeadEmail(body, userId, tenantId) {
        var _a;
        const sendDto = {
            to: body.to,
            subject: body.subject,
            html: body.html,
            lead_id: body.lead_id,
        };
        const result = await this.emailService.sendEmail(sendDto, userId, (_a = body.isAiDrafted) !== null && _a !== void 0 ? _a : false, tenantId);
        return this.SendResponse(ResponseEnum_1.ResponseEnum.Success, ResponseEnum_1.ResponseEnum.Mail, result);
    }
    async validateEmail(email) {
        const result = await this.emailService.validateEmail(email);
        return this.SendResponseData(result);
    }
    async sendEmail(body, userId, tenantId) {
        const result = await this.emailService.sendEmail(body, userId, false, tenantId);
        return this.SendResponse(ResponseEnum_1.ResponseEnum.Success, ResponseEnum_1.ResponseEnum.Mail, result);
    }
    async getInbox(headerTenantId) {
        const activeTenant = (headerTenantId && headerTenantId !== "all") ? headerTenantId : "default";
        const logs = await this.emailService.getInboxLogs(activeTenant);
        return this.SendResponseData(logs);
    }
    async syncInbox() {
        const result = await this.emailImapService.pollInbox();
        return this.SendResponseData(result);
    }
    async getThread(identifier, tenantId) {
        const thread = await this.emailService.getThread(identifier, tenantId);
        return this.SendResponseData(thread);
    }
};
exports.EmailController = EmailController;
__decorate([
    (0, common_1.Get)("Config"),
    __param(0, (0, Common_helper_1.CurrentTenant)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], EmailController.prototype, "getConfig", null);
__decorate([
    (0, common_1.Post)("Config"),
    (0, common_2.UsePipes)(...(0, StrictValidation_1.strictPipes)()),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, Common_helper_1.CurrentUser)()),
    __param(2, (0, Common_helper_1.CurrentTenant)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [EmailAccountConfig_model_1.EmailAccountConfigModel, String, String]),
    __metadata("design:returntype", Promise)
], EmailController.prototype, "saveConfig", null);
__decorate([
    (0, common_1.Post)("Test-Connection"),
    (0, common_2.UsePipes)(...(0, StrictValidation_1.strictPipes)()),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, Common_helper_1.CurrentUser)()),
    __param(2, (0, Common_helper_1.CurrentTenant)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [EmailAccountConfig_model_1.EmailAccountConfigModel, String, String]),
    __metadata("design:returntype", Promise)
], EmailController.prototype, "testConnection", null);
__decorate([
    (0, common_1.Get)("OAuth/AuthUrl"),
    __param(0, (0, common_1.Query)("redirectUri")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], EmailController.prototype, "getGoogleAuthUrl", null);
__decorate([
    (0, common_1.Post)("OAuth/Connect"),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, Common_helper_1.CurrentUser)()),
    __param(2, (0, Common_helper_1.CurrentTenant)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], EmailController.prototype, "connectGoogle", null);
__decorate([
    (0, common_1.Get)("OAuth/Status"),
    __param(0, (0, Common_helper_1.CurrentTenant)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], EmailController.prototype, "getOAuthStatus", null);
__decorate([
    (0, common_1.Post)("OAuth/Disconnect"),
    __param(0, (0, Common_helper_1.CurrentUser)()),
    __param(1, (0, Common_helper_1.CurrentTenant)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], EmailController.prototype, "disconnectGoogle", null);
__decorate([
    (0, common_1.Post)("Lead/AiDraft"),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, Common_helper_1.CurrentTenant)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], EmailController.prototype, "generateLeadDraft", null);
__decorate([
    (0, common_1.Post)("Lead/Send"),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, Common_helper_1.CurrentUser)()),
    __param(2, (0, Common_helper_1.CurrentTenant)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], EmailController.prototype, "sendLeadEmail", null);
__decorate([
    (0, common_1.Post)("Validate"),
    __param(0, (0, common_1.Body)("email")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], EmailController.prototype, "validateEmail", null);
__decorate([
    (0, common_1.Post)("Send"),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, Common_helper_1.CurrentUser)()),
    __param(2, (0, Common_helper_1.CurrentTenant)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [SendEmail_model_1.SendEmailModel, String, String]),
    __metadata("design:returntype", Promise)
], EmailController.prototype, "sendEmail", null);
__decorate([
    (0, common_1.Get)("Inbox"),
    __param(0, (0, Common_helper_1.CurrentTenant)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], EmailController.prototype, "getInbox", null);
__decorate([
    (0, common_1.Post)("Sync"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], EmailController.prototype, "syncInbox", null);
__decorate([
    (0, common_1.Get)("Thread/:identifier"),
    __param(0, (0, common_1.Param)("identifier")),
    __param(1, (0, Common_helper_1.CurrentTenant)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], EmailController.prototype, "getThread", null);
exports.EmailController = EmailController = __decorate([
    (0, common_2.UseGuards)(JwtAuthGuard_service_1.JwtAuthGuard, TenantContext_guard_1.TenantContextGuard),
    (0, common_1.Controller)({ path: "Email", version: "1" }),
    (0, swagger_1.ApiTags)("Email Automation"),
    __metadata("design:paramtypes", [Email_service_1.EmailService,
        EmailAI_service_1.EmailAIService,
        EmailImap_service_1.EmailImapService])
], EmailController);
//# sourceMappingURL=Email.controller.js.map