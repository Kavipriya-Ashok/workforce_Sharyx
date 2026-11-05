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
exports.EmailAIController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const JWTAuth_controller_1 = require("../../Controller/JWTAuth.controller");
const Common_helper_1 = require("../../Helper/Common.helper");
const ResponseEnum_1 = require("../../Helper/Enum/ResponseEnum");
const EmailAI_service_1 = require("../Services/EmailAI.service");
const EmailAIConfig_model_1 = require("../Models/EmailAIConfig.model");
const common_2 = require("@nestjs/common");
const JwtAuthGuard_service_1 = require("../../Service/Auth/JwtAuthGuard.service");
const TenantContext_guard_1 = require("../../Service/Auth/TenantContext.guard");
let EmailAIController = class EmailAIController extends JWTAuth_controller_1.JWTAuthController {
    constructor(emailAiService) {
        super();
        this.emailAiService = emailAiService;
    }
    async getConfig(tenantId) {
        const config = await this.emailAiService.getConfig(tenantId);
        return this.SendResponseData(config ? Object.assign(Object.assign({}, config), { api_key: undefined, has_api_key: !!config.api_key }) : config);
    }
    async saveConfig(body, userId, tenantId) {
        const config = await this.emailAiService.saveConfig(body, userId, tenantId);
        return this.SendResponse(ResponseEnum_1.ResponseEnum.Success, ResponseEnum_1.ResponseEnum.Saved, Object.assign(Object.assign({}, config), { api_key: undefined, has_api_key: !!config.api_key }));
    }
    async generateDraft(body, tenantId) {
        const draft = await this.emailAiService.generateDraft(body, tenantId);
        return this.SendResponseData(draft);
    }
};
exports.EmailAIController = EmailAIController;
__decorate([
    (0, common_1.Get)("Config"),
    __param(0, (0, Common_helper_1.CurrentTenant)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], EmailAIController.prototype, "getConfig", null);
__decorate([
    (0, common_1.Post)("Config"),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, Common_helper_1.CurrentUser)()),
    __param(2, (0, Common_helper_1.CurrentTenant)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [EmailAIConfig_model_1.EmailAIConfigModel, String, String]),
    __metadata("design:returntype", Promise)
], EmailAIController.prototype, "saveConfig", null);
__decorate([
    (0, common_1.Post)("Draft"),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, Common_helper_1.CurrentTenant)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [EmailAIConfig_model_1.GenerateEmailAIDraftModel, String]),
    __metadata("design:returntype", Promise)
], EmailAIController.prototype, "generateDraft", null);
exports.EmailAIController = EmailAIController = __decorate([
    (0, common_2.UseGuards)(JwtAuthGuard_service_1.JwtAuthGuard, TenantContext_guard_1.TenantContextGuard),
    (0, common_1.Controller)({ path: "Email/AI", version: "1" }),
    (0, swagger_1.ApiTags)("Email AI"),
    __metadata("design:paramtypes", [EmailAI_service_1.EmailAIService])
], EmailAIController);
//# sourceMappingURL=EmailAI.controller.js.map