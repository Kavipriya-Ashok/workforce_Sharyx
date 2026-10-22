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
let VoiceCallController = class VoiceCallController {
    constructor(callService) {
        this.callService = callService;
    }
    async dispatch(body) {
        const callLog = await this.callService.dispatchCall(body);
        return { ok: true, data: callLog };
    }
    async getLogs(tenantId, limit) {
        const logs = await this.callService.getCallLogs(tenantId || "default", limit ? parseInt(limit, 10) : 50);
        return { ok: true, data: logs };
    }
    async getStats(tenantId) {
        const stats = await this.callService.getCallStats(tenantId || "default");
        return { ok: true, data: stats };
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
    __param(1, (0, common_1.Query)("limit")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], VoiceCallController.prototype, "getLogs", null);
__decorate([
    (0, common_1.Get)("stats"),
    __param(0, (0, common_1.Query)("tenantId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], VoiceCallController.prototype, "getStats", null);
exports.VoiceCallController = VoiceCallController = __decorate([
    (0, common_1.Controller)({ path: "Voice/Calls", version: "1" }),
    __metadata("design:paramtypes", [VoiceCall_service_1.VoiceCallService])
], VoiceCallController);
//# sourceMappingURL=VoiceCall.controller.js.map