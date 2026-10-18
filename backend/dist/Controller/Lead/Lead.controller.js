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
exports.LeadController = void 0;
const common_1 = require("@nestjs/common");
const AuthBase_controller_1 = require("../AuthBase.controller");
const Common_helper_1 = require("../../Helper/Common.helper");
const Lead_service_1 = require("../../Service/Lead/Lead.service");
const swagger_1 = require("@nestjs/swagger");
let LeadController = class LeadController extends AuthBase_controller_1.AuthBaseController {
    constructor(leadService) {
        super();
        this.leadService = leadService;
    }
    async list(filter, userId) {
        const res = await this.leadService.getAll(filter, { userId });
        return this.SendResponseData(res);
    }
    async stats(isCandidate, userId) {
        const isCandBool = isCandidate === "true" ? true : isCandidate === "false" ? false : undefined;
        const stats = await this.leadService.getStats({ userId }, isCandBool);
        return this.SendResponseData(stats);
    }
    async getById(id, userId) {
        const lead = await this.leadService.getById(id, { userId });
        return this.SendResponseData(lead);
    }
    async checkDuplicate(phone, excludeId, userId) {
        const res = await this.leadService.checkDuplicatePhone(phone, excludeId, { userId });
        return this.SendResponseData(res);
    }
    async insert(data, userId) {
        const saved = await this.leadService.insert(data, userId, { userId });
        return this.SendResponseData(saved);
    }
    async update(id, data, userId) {
        const updated = await this.leadService.update(id, data, userId);
        return this.SendResponseData(updated);
    }
    async updateStatus(id, newStatus, userId) {
        const updated = await this.leadService.updateStatus(id, newStatus, userId);
        return this.SendResponseData(updated);
    }
    async delete(id) {
        const res = await this.leadService.delete(id);
        return this.SendResponseData(res);
    }
    async bulkDelete(ids) {
        const res = await this.leadService.bulkDelete(ids);
        return this.SendResponseData(res);
    }
    async bulkUpdateStatus(body, userId) {
        const res = await this.leadService.bulkUpdateStatus(body.ids, body.lead_status, userId);
        return this.SendResponseData(res);
    }
    async addActivity(body, userId) {
        const act = await this.leadService.addActivity(body, userId);
        return this.SendResponseData(act);
    }
    async importLeads(model, userId) {
        const res = await this.leadService.importLeads(model, userId, { userId });
        return this.SendResponseData(res);
    }
    async approveInterview(id, body, userId) {
        const res = await this.leadService.approveCandidateInterview(id, body, { userId });
        return this.SendResponseData(res);
    }
};
exports.LeadController = LeadController;
__decorate([
    (0, common_1.Get)("List"),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, Common_helper_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], LeadController.prototype, "list", null);
__decorate([
    (0, common_1.Get)("Stats"),
    __param(0, (0, common_1.Query)("is_candidate")),
    __param(1, (0, Common_helper_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], LeadController.prototype, "stats", null);
__decorate([
    (0, common_1.Get)("ById/:id"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, Common_helper_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], LeadController.prototype, "getById", null);
__decorate([
    (0, common_1.Get)("CheckDuplicate"),
    __param(0, (0, common_1.Query)("phone")),
    __param(1, (0, common_1.Query)("exclude_id")),
    __param(2, (0, Common_helper_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], LeadController.prototype, "checkDuplicate", null);
__decorate([
    (0, common_1.Post)("Insert"),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, Common_helper_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], LeadController.prototype, "insert", null);
__decorate([
    (0, common_1.Put)("Update/:id"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, Common_helper_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", Promise)
], LeadController.prototype, "update", null);
__decorate([
    (0, common_1.Patch)("UpdateStatus/:id"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)("lead_status")),
    __param(2, (0, Common_helper_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], LeadController.prototype, "updateStatus", null);
__decorate([
    (0, common_1.Delete)("Delete/:id"),
    __param(0, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], LeadController.prototype, "delete", null);
__decorate([
    (0, common_1.Post)("BulkDelete"),
    __param(0, (0, common_1.Body)("ids")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Array]),
    __metadata("design:returntype", Promise)
], LeadController.prototype, "bulkDelete", null);
__decorate([
    (0, common_1.Post)("BulkUpdateStatus"),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, Common_helper_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], LeadController.prototype, "bulkUpdateStatus", null);
__decorate([
    (0, common_1.Post)("Activity"),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, Common_helper_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], LeadController.prototype, "addActivity", null);
__decorate([
    (0, common_1.Post)("Import"),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, Common_helper_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], LeadController.prototype, "importLeads", null);
__decorate([
    (0, common_1.Post)("ApproveInterview/:id"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, Common_helper_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", Promise)
], LeadController.prototype, "approveInterview", null);
exports.LeadController = LeadController = __decorate([
    (0, common_1.Controller)({ path: "Lead", version: "1" }),
    (0, swagger_1.ApiTags)("Lead CRM"),
    __metadata("design:paramtypes", [Lead_service_1.LeadService])
], LeadController);
//# sourceMappingURL=Lead.controller.js.map