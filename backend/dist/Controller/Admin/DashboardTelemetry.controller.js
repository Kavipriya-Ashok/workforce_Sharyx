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
exports.DashboardTelemetryController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const DashboardTelemetry_service_1 = require("../../Service/Admin/DashboardTelemetry.service");
const JwtAuthGuard_service_1 = require("../../Service/Auth/JwtAuthGuard.service");
const TenantContext_guard_1 = require("../../Service/Auth/TenantContext.guard");
let DashboardTelemetryController = class DashboardTelemetryController {
    constructor(telemetryService) {
        this.telemetryService = telemetryService;
    }
    async getTelemetry(range, tenantId, headerTenantId) {
        const effectiveTenant = (headerTenantId && headerTenantId !== "all") ? headerTenantId : (tenantId || "default");
        const data = await this.telemetryService.getTelemetry(range || "7d", effectiveTenant);
        return {
            Type: "Success",
            Message: "Telemetry loaded successfully",
            AddtionalData: data,
            data,
        };
    }
    async syncNow(tenantId, headerTenantId) {
        const effectiveTenant = (headerTenantId && headerTenantId !== "all") ? headerTenantId : (tenantId || "default");
        const data = await this.telemetryService.getTelemetry("today", effectiveTenant);
        return {
            Type: "Success",
            Message: "Telemetry synchronized successfully",
            AddtionalData: data,
            data,
        };
    }
};
exports.DashboardTelemetryController = DashboardTelemetryController;
__decorate([
    (0, common_1.Get)("telemetry"),
    __param(0, (0, common_1.Query)("range")),
    __param(1, (0, common_1.Query)("tenantId")),
    __param(2, (0, common_1.Headers)("x-tenant-id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], DashboardTelemetryController.prototype, "getTelemetry", null);
__decorate([
    (0, common_1.Get)("sync"),
    __param(0, (0, common_1.Query)("tenantId")),
    __param(1, (0, common_1.Headers)("x-tenant-id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], DashboardTelemetryController.prototype, "syncNow", null);
exports.DashboardTelemetryController = DashboardTelemetryController = __decorate([
    (0, common_1.UseGuards)(JwtAuthGuard_service_1.JwtAuthGuard, TenantContext_guard_1.TenantContextGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)({ path: "Admin/Dashboard", version: "1" }),
    (0, swagger_1.ApiTags)("Dashboard Telemetry"),
    __metadata("design:paramtypes", [DashboardTelemetry_service_1.DashboardTelemetryService])
], DashboardTelemetryController);
//# sourceMappingURL=DashboardTelemetry.controller.js.map