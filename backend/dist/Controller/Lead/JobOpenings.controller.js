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
exports.JobOpeningsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const JobOpenings_service_1 = require("../../Service/Lead/JobOpenings.service");
let JobOpeningsController = class JobOpeningsController {
    constructor(openingsService) {
        this.openingsService = openingsService;
    }
    async listOpenings(tenantId, onlyOpen) {
        const tId = tenantId || "default";
        if (onlyOpen === "true") {
            return await this.openingsService.getOpenRoles(tId);
        }
        return await this.openingsService.listOpenings(tId);
    }
    async getAvailableSlots(tenantId, count) {
        return await this.openingsService.getAvailableSlots(tenantId || "default", count ? parseInt(count, 10) : 4);
    }
    async createOpening(body) {
        return await this.openingsService.createOpening(body, (body === null || body === void 0 ? void 0 : body.updated_by) || "hr_admin", (body === null || body === void 0 ? void 0 : body.tenant_id) || "default");
    }
    async updateOpening(id, body) {
        return await this.openingsService.updateOpening(id, body, (body === null || body === void 0 ? void 0 : body.updated_by) || "hr_admin");
    }
    async patchOpening(id, body) {
        return await this.openingsService.updateOpening(id, body, (body === null || body === void 0 ? void 0 : body.updated_by) || "hr_admin");
    }
    async updateStatus(id, status, updatedBy) {
        return await this.openingsService.updateOpening(id, { status }, updatedBy || "hr_admin");
    }
    async deleteOpening(id) {
        return await this.openingsService.deleteOpening(id);
    }
};
exports.JobOpeningsController = JobOpeningsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)("tenant_id")),
    __param(1, (0, common_1.Query)("only_open")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], JobOpeningsController.prototype, "listOpenings", null);
__decorate([
    (0, common_1.Get)("slots"),
    __param(0, (0, common_1.Query)("tenant_id")),
    __param(1, (0, common_1.Query)("count")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], JobOpeningsController.prototype, "getAvailableSlots", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], JobOpeningsController.prototype, "createOpening", null);
__decorate([
    (0, common_1.Put)(":id"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], JobOpeningsController.prototype, "updateOpening", null);
__decorate([
    (0, common_1.Patch)(":id"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], JobOpeningsController.prototype, "patchOpening", null);
__decorate([
    (0, common_1.Patch)(":id/status"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)("status")),
    __param(2, (0, common_1.Body)("updated_by")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], JobOpeningsController.prototype, "updateStatus", null);
__decorate([
    (0, common_1.Delete)(":id"),
    __param(0, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], JobOpeningsController.prototype, "deleteOpening", null);
exports.JobOpeningsController = JobOpeningsController = __decorate([
    (0, common_1.Controller)({
        path: ["openings", "Lead/Openings"],
        version: ["1", common_1.VERSION_NEUTRAL],
    }),
    (0, swagger_1.ApiTags)("Job Openings"),
    __metadata("design:paramtypes", [JobOpenings_service_1.JobOpeningsService])
], JobOpeningsController);
//# sourceMappingURL=JobOpenings.controller.js.map