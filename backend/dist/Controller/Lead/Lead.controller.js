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
const JWTAuth_controller_1 = require("../JWTAuth.controller");
const Common_helper_1 = require("../../Helper/Common.helper");
const Lead_service_1 = require("../../Service/Lead/Lead.service");
const swagger_1 = require("@nestjs/swagger");
let LeadController = class LeadController extends JWTAuth_controller_1.JWTAuthController {
    constructor(leadService) {
        super();
        this.leadService = leadService;
    }
    async list(filter, userId, tenantId) {
        const res = await this.leadService.getAll(filter, { userId, tenant_id: tenantId, active_tenant_id: tenantId });
        return this.SendResponseData(res);
    }
    async stats(isCandidate, userId, tenantId) {
        const isCandBool = isCandidate === "true" ? true : isCandidate === "false" ? false : undefined;
        const stats = await this.leadService.getStats({ userId, tenant_id: tenantId, active_tenant_id: tenantId }, isCandBool);
        return this.SendResponseData(stats);
    }
    async getById(id, userId, tenantId) {
        const lead = await this.leadService.getById(id, { userId, tenant_id: tenantId, active_tenant_id: tenantId });
        return this.SendResponseData(lead);
    }
    async checkDuplicate(phone, excludeId, userId, tenantId) {
        const res = await this.leadService.checkDuplicatePhone(phone, excludeId, { userId, tenant_id: tenantId });
        return this.SendResponseData(res);
    }
    async checkDuplicateEmail(email, excludeId, tenantId) {
        const res = await this.leadService.checkDuplicateEmail(email, excludeId, { tenant_id: tenantId });
        return this.SendResponseData(res);
    }
    async insert(data, userId, tenantId) {
        const saved = await this.leadService.insert(data, userId, { userId, tenant_id: tenantId });
        return this.SendResponseData(saved);
    }
    async update(id, data, userId, tenantId) {
        const updated = await this.leadService.update(id, data, userId, tenantId);
        return this.SendResponseData(updated);
    }
    async updateStatus(id, newStatus, userId, tenantId) {
        const updated = await this.leadService.updateStatus(id, newStatus, userId, tenantId);
        return this.SendResponseData(updated);
    }
    async updateCandidateStage(id, stage, userId, tenantId) {
        const updated = await this.leadService.updateCandidateStage(id, stage, userId, tenantId);
        return this.SendResponseData(updated);
    }
    async delete(id, tenantId) {
        const res = await this.leadService.delete(id, tenantId);
        return this.SendResponseData(res);
    }
    async bulkDelete(ids, tenantId) {
        const res = await this.leadService.bulkDelete(ids, tenantId);
        return this.SendResponseData(res);
    }
    async bulkUpdateStatus(body, userId, tenantId) {
        const res = await this.leadService.bulkUpdateStatus(body.ids, body.lead_status, userId, tenantId);
        return this.SendResponseData(res);
    }
    async addActivity(body, userId, tenantId) {
        const act = await this.leadService.addActivity(body, userId, tenantId);
        return this.SendResponseData(act);
    }
    async importLeads(model, userId, tenantId) {
        const res = await this.leadService.importLeads(model, userId, { userId, tenant_id: tenantId });
        return this.SendResponseData(res);
    }
    async approveInterview(id, body, userId, tenantId) {
        const res = await this.leadService.approveCandidateInterview(id, body, { userId, tenant_id: tenantId });
        return this.SendResponseData(res);
    }
    async triggerVoiceCall(id, body, userId, tenantId) {
        const res = await this.leadService.triggerVoiceCall(id, body, { userId, tenant_id: tenantId });
        return this.SendResponseData(res);
    }
};
exports.LeadController = LeadController;
__decorate([
    (0, common_1.Get)("List"),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, Common_helper_1.CurrentUser)()),
    __param(2, (0, Common_helper_1.CurrentTenant)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], LeadController.prototype, "list", null);
__decorate([
    (0, common_1.Get)("Stats"),
    __param(0, (0, common_1.Query)("is_candidate")),
    __param(1, (0, Common_helper_1.CurrentUser)()),
    __param(2, (0, Common_helper_1.CurrentTenant)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], LeadController.prototype, "stats", null);
__decorate([
    (0, common_1.Get)("ById/:id"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, Common_helper_1.CurrentUser)()),
    __param(2, (0, Common_helper_1.CurrentTenant)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], LeadController.prototype, "getById", null);
__decorate([
    (0, common_1.Get)("CheckDuplicate"),
    __param(0, (0, common_1.Query)("phone")),
    __param(1, (0, common_1.Query)("exclude_id")),
    __param(2, (0, Common_helper_1.CurrentUser)()),
    __param(3, (0, Common_helper_1.CurrentTenant)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", Promise)
], LeadController.prototype, "checkDuplicate", null);
__decorate([
    (0, common_1.Get)("CheckDuplicateEmail"),
    __param(0, (0, common_1.Query)("email")),
    __param(1, (0, common_1.Query)("exclude_id")),
    __param(2, (0, Common_helper_1.CurrentTenant)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], LeadController.prototype, "checkDuplicateEmail", null);
__decorate([
    (0, common_1.Post)("Insert"),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, Common_helper_1.CurrentUser)()),
    __param(2, (0, Common_helper_1.CurrentTenant)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], LeadController.prototype, "insert", null);
__decorate([
    (0, common_1.Put)("Update/:id"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, Common_helper_1.CurrentUser)()),
    __param(3, (0, Common_helper_1.CurrentTenant)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, String]),
    __metadata("design:returntype", Promise)
], LeadController.prototype, "update", null);
__decorate([
    (0, common_1.Patch)("UpdateStatus/:id"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)("lead_status")),
    __param(2, (0, Common_helper_1.CurrentUser)()),
    __param(3, (0, Common_helper_1.CurrentTenant)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", Promise)
], LeadController.prototype, "updateStatus", null);
__decorate([
    (0, common_1.Patch)("UpdateCandidateStage/:id"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)("candidate_stage")),
    __param(2, (0, Common_helper_1.CurrentUser)()),
    __param(3, (0, Common_helper_1.CurrentTenant)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", Promise)
], LeadController.prototype, "updateCandidateStage", null);
__decorate([
    (0, common_1.Delete)("Delete/:id"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, Common_helper_1.CurrentTenant)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], LeadController.prototype, "delete", null);
__decorate([
    (0, common_1.Post)("BulkDelete"),
    __param(0, (0, common_1.Body)("ids")),
    __param(1, (0, Common_helper_1.CurrentTenant)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Array, String]),
    __metadata("design:returntype", Promise)
], LeadController.prototype, "bulkDelete", null);
__decorate([
    (0, common_1.Post)("BulkUpdateStatus"),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, Common_helper_1.CurrentUser)()),
    __param(2, (0, Common_helper_1.CurrentTenant)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], LeadController.prototype, "bulkUpdateStatus", null);
__decorate([
    (0, common_1.Post)("Activity"),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, Common_helper_1.CurrentUser)()),
    __param(2, (0, Common_helper_1.CurrentTenant)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], LeadController.prototype, "addActivity", null);
__decorate([
    (0, common_1.Post)("Import"),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, Common_helper_1.CurrentUser)()),
    __param(2, (0, Common_helper_1.CurrentTenant)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], LeadController.prototype, "importLeads", null);
__decorate([
    (0, common_1.Post)("ApproveInterview/:id"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, Common_helper_1.CurrentUser)()),
    __param(3, (0, Common_helper_1.CurrentTenant)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, String]),
    __metadata("design:returntype", Promise)
], LeadController.prototype, "approveInterview", null);
__decorate([
    (0, common_1.Post)("TriggerVoiceCall/:id"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, Common_helper_1.CurrentUser)()),
    __param(3, (0, Common_helper_1.CurrentTenant)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, String]),
    __metadata("design:returntype", Promise)
], LeadController.prototype, "triggerVoiceCall", null);
exports.LeadController = LeadController = __decorate([
    (0, common_1.Controller)({ path: "Lead", version: "1" }),
    (0, swagger_1.ApiTags)("Lead CRM"),
    __metadata("design:paramtypes", [Lead_service_1.LeadService])
], LeadController);
//# sourceMappingURL=Lead.controller.js.map