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
exports.AutomationController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const RuleEngine_service_1 = require("../../Service/Automation/RuleEngine.service");
const JwtAuthGuard_service_1 = require("../../Service/Auth/JwtAuthGuard.service");
const TenantContext_guard_1 = require("../../Service/Auth/TenantContext.guard");
let AutomationController = class AutomationController {
    constructor(ruleEngineService) {
        this.ruleEngineService = ruleEngineService;
    }
    async getRules(tenantId) {
        return await this.ruleEngineService.getRules(tenantId || "default");
    }
    async createRule(body, req) {
        var _a;
        const userId = ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) || "system";
        return await this.ruleEngineService.createRule(body, userId);
    }
    async dryRunTest(body) {
        return await this.ruleEngineService.dryRunTest(body);
    }
    async convertLead(id, body) {
        return await this.ruleEngineService.convertLeadToCustomer(id, body);
    }
    async seedRules(tenantId) {
        return await this.ruleEngineService.seedDefaultRules(tenantId || "default");
    }
    async getRuleById(id) {
        return await this.ruleEngineService.getRuleById(id);
    }
    async updateRule(id, body, req) {
        var _a;
        const userId = ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) || "system";
        return await this.ruleEngineService.updateRule(id, body, userId);
    }
    async deleteRule(id) {
        return await this.ruleEngineService.deleteRule(id);
    }
};
exports.AutomationController = AutomationController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)("tenant_id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AutomationController.prototype, "getRules", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AutomationController.prototype, "createRule", null);
__decorate([
    (0, common_1.Post)("DryRunTest"),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AutomationController.prototype, "dryRunTest", null);
__decorate([
    (0, common_1.Post)("ConvertLead/:id"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AutomationController.prototype, "convertLead", null);
__decorate([
    (0, common_1.Post)("SeedRules"),
    __param(0, (0, common_1.Query)("tenant_id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AutomationController.prototype, "seedRules", null);
__decorate([
    (0, common_1.Get)(":id"),
    __param(0, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AutomationController.prototype, "getRuleById", null);
__decorate([
    (0, common_1.Put)(":id"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], AutomationController.prototype, "updateRule", null);
__decorate([
    (0, common_1.Delete)(":id"),
    __param(0, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AutomationController.prototype, "deleteRule", null);
exports.AutomationController = AutomationController = __decorate([
    (0, common_1.UseGuards)(JwtAuthGuard_service_1.JwtAuthGuard, TenantContext_guard_1.TenantContextGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)({
        path: ["Automation", "api/Automation", "api/v1/Automation"],
        version: ["1", common_1.VERSION_NEUTRAL],
    }),
    (0, swagger_1.ApiTags)("Lead to Customer Conversion Automation"),
    __metadata("design:paramtypes", [RuleEngine_service_1.RuleEngineService])
], AutomationController);
//# sourceMappingURL=Automation.controller.js.map