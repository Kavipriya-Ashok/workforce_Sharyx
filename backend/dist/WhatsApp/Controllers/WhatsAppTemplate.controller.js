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
exports.WhatsAppTemplateController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const JWTAuth_controller_1 = require("../../Controller/JWTAuth.controller");
const Common_helper_1 = require("../../Helper/Common.helper");
const ResponseEnum_1 = require("../../Helper/Enum/ResponseEnum");
const WhatsAppTemplate_service_1 = require("../Services/WhatsAppTemplate.service");
let WhatsAppTemplateController = class WhatsAppTemplateController extends JWTAuth_controller_1.JWTAuthController {
    constructor(templateService) {
        super();
        this.templateService = templateService;
    }
    async getTemplates(tenantId) {
        const templates = await this.templateService.getTemplates(tenantId);
        return this.SendResponseData(templates);
    }
    async syncMetaTemplates(tenantId) {
        const synced = await this.templateService.syncMetaTemplates(tenantId);
        return this.SendResponse(ResponseEnum_1.ResponseEnum.Success, "Templates synced from Meta Graph API", synced);
    }
    async createTemplate(body, tenantId) {
        const template = await this.templateService.createTemplate(body, tenantId);
        return this.SendResponse(ResponseEnum_1.ResponseEnum.Success, ResponseEnum_1.ResponseEnum.Created, template);
    }
    async updateTemplate(id, body, tenantId) {
        const updated = await this.templateService.updateTemplate(id, body, tenantId);
        return this.SendResponse(ResponseEnum_1.ResponseEnum.Success, ResponseEnum_1.ResponseEnum.Updated, updated);
    }
    async deleteTemplate(id, tenantId) {
        await this.templateService.deleteTemplate(id, tenantId);
        return this.SendResponse(ResponseEnum_1.ResponseEnum.Success, ResponseEnum_1.ResponseEnum.Deleted, { id });
    }
};
exports.WhatsAppTemplateController = WhatsAppTemplateController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, Common_helper_1.CurrentTenant)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], WhatsAppTemplateController.prototype, "getTemplates", null);
__decorate([
    (0, common_1.Post)("SyncMeta"),
    __param(0, (0, Common_helper_1.CurrentTenant)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], WhatsAppTemplateController.prototype, "syncMetaTemplates", null);
__decorate([
    (0, common_1.Post)("Create"),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, Common_helper_1.CurrentTenant)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], WhatsAppTemplateController.prototype, "createTemplate", null);
__decorate([
    (0, common_1.Put)("Update/:id"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, Common_helper_1.CurrentTenant)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", Promise)
], WhatsAppTemplateController.prototype, "updateTemplate", null);
__decorate([
    (0, common_1.Delete)("Delete/:id"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, Common_helper_1.CurrentTenant)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], WhatsAppTemplateController.prototype, "deleteTemplate", null);
exports.WhatsAppTemplateController = WhatsAppTemplateController = __decorate([
    (0, common_1.Controller)({ path: "WhatsApp/Templates", version: "1" }),
    (0, swagger_1.ApiTags)("WhatsApp Templates"),
    __metadata("design:paramtypes", [WhatsAppTemplate_service_1.WhatsAppTemplateService])
], WhatsAppTemplateController);
//# sourceMappingURL=WhatsAppTemplate.controller.js.map