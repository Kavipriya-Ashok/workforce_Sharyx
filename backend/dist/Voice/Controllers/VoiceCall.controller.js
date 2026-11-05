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
exports.VoiceCallController = void 0;
const common_1 = require("@nestjs/common");
const VoiceCall_service_1 = require("../Services/VoiceCall.service");
const common_2 = require("@nestjs/common");
const JwtAuthGuard_service_1 = require("../../Service/Auth/JwtAuthGuard.service");
const TenantContext_guard_1 = require("../../Service/Auth/TenantContext.guard");
let VoiceCallController = class VoiceCallController {
    constructor(callService) {
        this.callService = callService;
    }
    async dispatch(body) {
        const callLog = await this.callService.dispatchCall(body);
        return { ok: true, data: callLog };
    }
    async getLogs(queryTenantId, headerTenantId, limit, agentId, skipSync) {
        const activeTenant = headerTenantId || queryTenantId || "default";
        const logs = await this.callService.getCallLogs(activeTenant, limit ? parseInt(limit, 10) : 50, agentId || undefined, skipSync === "true");
        return { ok: true, data: logs };
    }
    async getStats(queryTenantId, headerTenantId) {
        const activeTenant = headerTenantId || queryTenantId || "default";
        const stats = await this.callService.getCallStats(activeTenant);
        return { ok: true, data: stats };
    }
    async syncFromSaas(tenantId) {
        const synced = await this.callService.syncCallLogsFromSaas(tenantId || "default");
        return { ok: true, synced, message: `Synced ${synced} call logs from Sharyx SaaS platform` };
    }
    async streamAudio(callId, providerCallId, tenantId, res) {
        return await this.callService.streamCallAudio(callId, providerCallId, tenantId || "default", res);
    }
    async syncFromVapi(tenantId) {
        const synced = await this.callService.syncCallLogsFromVapi(tenantId || "default");
        return { ok: true, synced, message: `Synced ${synced} call logs from Vapi platform` };
    }
};
exports.VoiceCallController = VoiceCallController;
__decorate([
    (0, common_1.Post)("dispatch"),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], VoiceCallController.prototype, "dispatch", null);
__decorate([
    (0, common_1.Get)("logs"),
    __param(0, (0, common_1.Query)("tenantId")),
    __param(1, (0, common_1.Headers)("x-tenant-id")),
    __param(2, (0, common_1.Query)("limit")),
    __param(3, (0, common_1.Query)("agentId")),
    __param(4, (0, common_1.Query)("skipSync")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], VoiceCallController.prototype, "getLogs", null);
__decorate([
    (0, common_1.Get)("stats"),
    __param(0, (0, common_1.Query)("tenantId")),
    __param(1, (0, common_1.Headers)("x-tenant-id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], VoiceCallController.prototype, "getStats", null);
__decorate([
    (0, common_1.Post)("sync-saas"),
    __param(0, (0, common_1.Query)("tenantId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], VoiceCallController.prototype, "syncFromSaas", null);
__decorate([
    (0, common_1.Get)("audio"),
    __param(0, (0, common_1.Query)("callId")),
    __param(1, (0, common_1.Query)("providerCallId")),
    __param(2, (0, common_1.Query)("tenantId")),
    __param(3, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", Promise)
], VoiceCallController.prototype, "streamAudio", null);
__decorate([
    (0, common_1.Post)("sync-vapi"),
    __param(0, (0, common_1.Query)("tenantId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], VoiceCallController.prototype, "syncFromVapi", null);
exports.VoiceCallController = VoiceCallController = __decorate([
    (0, common_2.UseGuards)(JwtAuthGuard_service_1.JwtAuthGuard, TenantContext_guard_1.TenantContextGuard),
    (0, common_1.Controller)({ path: "Voice/Calls", version: "1" }),
    __metadata("design:paramtypes", [VoiceCall_service_1.VoiceCallService])
], VoiceCallController);
//# sourceMappingURL=VoiceCall.controller.js.map