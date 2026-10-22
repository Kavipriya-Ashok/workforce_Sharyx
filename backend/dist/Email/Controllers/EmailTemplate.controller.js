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
exports.EmailTemplateController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const AuthBase_controller_1 = require("../../Controller/AuthBase.controller");
const ResponseEnum_1 = require("../../Helper/Enum/ResponseEnum");
const EmailTemplate_service_1 = require("../Services/EmailTemplate.service");
let EmailTemplateController = class EmailTemplateController extends AuthBase_controller_1.AuthBaseController {
    constructor(templateService) {
        super();
        this.templateService = templateService;
    }
    async getTemplates() {
        const templates = await this.templateService.getTemplates();
        return this.SendResponseData(templates);
    }
    async createTemplate(body) {
        const template = await this.templateService.createTemplate(body);
        return this.SendResponse(ResponseEnum_1.ResponseEnum.Success, ResponseEnum_1.ResponseEnum.Created, template);
    }
    async updateTemplate(id, body) {
        const updated = await this.templateService.updateTemplate(id, body);
        return this.SendResponse(ResponseEnum_1.ResponseEnum.Success, ResponseEnum_1.ResponseEnum.Updated, updated);
    }
    async deleteTemplate(id) {
        await this.templateService.deleteTemplate(id);
        return this.SendResponse(ResponseEnum_1.ResponseEnum.Success, ResponseEnum_1.ResponseEnum.Deleted, { id });
    }
    async previewTemplate(id, variables) {
        const preview = await this.templateService.previewTemplate(id, variables);
        return this.SendResponseData(preview);
    }
};
exports.EmailTemplateController = EmailTemplateController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], EmailTemplateController.prototype, "getTemplates", null);
__decorate([
    (0, common_1.Post)("Create"),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EmailTemplateController.prototype, "createTemplate", null);
__decorate([
    (0, common_1.Put)("Update/:id"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], EmailTemplateController.prototype, "updateTemplate", null);
__decorate([
    (0, common_1.Delete)("Delete/:id"),
    __param(0, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], EmailTemplateController.prototype, "deleteTemplate", null);
__decorate([
    (0, common_1.Post)("Preview/:id"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], EmailTemplateController.prototype, "previewTemplate", null);
exports.EmailTemplateController = EmailTemplateController = __decorate([
    (0, common_1.Controller)({ path: "Email/Templates", version: "1" }),
    (0, swagger_1.ApiTags)("Email Templates"),
    __metadata("design:paramtypes", [EmailTemplate_service_1.EmailTemplateService])
], EmailTemplateController);
//# sourceMappingURL=EmailTemplate.controller.js.map