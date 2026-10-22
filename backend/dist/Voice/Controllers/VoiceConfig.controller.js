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
exports.VoiceConfigController = void 0;
const common_1 = require("@nestjs/common");
const VoiceConfig_service_1 = require("../Services/VoiceConfig.service");
let VoiceConfigController = class VoiceConfigController {
    constructor(configService) {
        this.configService = configService;
    }
    async getConfigs(tenantId) {
        const data = await this.configService.getConfigs(tenantId || "default");
        return { ok: true, data };
    }
    async saveConfig(tenantId, body) {
        const data = await this.configService.saveConfig(tenantId || "default", body);
        return { ok: true, data };
    }
    async activateProvider(tenantId, provider) {
        await this.configService.setActiveProvider(tenantId || "default", provider);
        return { ok: true, activeProvider: provider };
    }
    async disconnectProvider(tenantId, provider) {
        await this.configService.disconnectProvider(tenantId || "default", provider);
        return { ok: true, disconnectedProvider: provider };
    }
    async testConnection(tenantId, body) {
        const result = await this.configService.testConnection(tenantId || "default", body.provider, body.apiKey);
        return Object.assign({ ok: result.ok }, result);
    }
};
exports.VoiceConfigController = VoiceConfigController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)("tenantId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], VoiceConfigController.prototype, "getConfigs", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Query)("tenantId")),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], VoiceConfigController.prototype, "saveConfig", null);
__decorate([
    (0, common_1.Post)("activate/:provider"),
    __param(0, (0, common_1.Query)("tenantId")),
    __param(1, (0, common_1.Param)("provider")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], VoiceConfigController.prototype, "activateProvider", null);
__decorate([
    (0, common_1.Post)("disconnect/:provider"),
    __param(0, (0, common_1.Query)("tenantId")),
    __param(1, (0, common_1.Param)("provider")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], VoiceConfigController.prototype, "disconnectProvider", null);
__decorate([
    (0, common_1.Post)("test"),
    __param(0, (0, common_1.Query)("tenantId")),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], VoiceConfigController.prototype, "testConnection", null);
exports.VoiceConfigController = VoiceConfigController = __decorate([
    (0, common_1.Controller)({ path: "Voice/Config", version: "1" }),
    __metadata("design:paramtypes", [VoiceConfig_service_1.VoiceConfigService])
], VoiceConfigController);
//# sourceMappingURL=VoiceConfig.controller.js.map