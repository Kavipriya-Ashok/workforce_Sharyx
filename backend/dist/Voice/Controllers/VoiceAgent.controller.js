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
exports.VoiceAgentController = void 0;
const common_1 = require("@nestjs/common");
const VoiceAgent_service_1 = require("../Services/VoiceAgent.service");
const VoiceFactory_service_1 = require("../Services/VoiceFactory.service");
const common_2 = require("@nestjs/common");
const JwtAuthGuard_service_1 = require("../../Service/Auth/JwtAuthGuard.service");
const TenantContext_guard_1 = require("../../Service/Auth/TenantContext.guard");
let VoiceAgentController = class VoiceAgentController {
    constructor(agentService, factory) {
        this.agentService = agentService;
        this.factory = factory;
    }
    async list(queryTenantId, headerTenantId) {
        const activeTenant = headerTenantId || queryTenantId || "default";
        const agents = await this.agentService.list(activeTenant);
        return { ok: true, data: agents };
    }
    getProviders() {
        return { ok: true, data: this.factory.getAllProviders() };
    }
    async syncAll(tenantId) {
        const agents = await this.agentService.list(tenantId || "default");
        return { ok: true, count: agents.length, data: agents };
    }
    async deployWorkforceTeam(tenantId, body) {
        const result = await this.agentService.deployWorkforceTeam(tenantId || "default", body === null || body === void 0 ? void 0 : body.provider);
        return result;
    }
    async deployToVapi(tenantId) {
        const result = await this.agentService.deployWorkforceTeam(tenantId || "default", "vapi");
        return result;
    }
    async syncFromProvider(provider, tenantId) {
        const agents = await this.agentService.syncFromProvider(provider || "vapi", tenantId || "default");
        return { ok: true, count: agents.length, data: agents };
    }
    async getCatalog(provider, tenantId) {
        const data = await this.agentService.getCatalog(provider || "vapi", tenantId || "default");
        return { ok: true, data };
    }
    async enableCatalogAgent(key, body) {
        const result = await this.agentService.enableCatalogAgent(key, (body === null || body === void 0 ? void 0 : body.provider) || "vapi", (body === null || body === void 0 ? void 0 : body.tenantId) || "default");
        return result;
    }
    async disableCatalogAgent(key, body) {
        const result = await this.agentService.disableCatalogAgent(key, (body === null || body === void 0 ? void 0 : body.provider) || "vapi", (body === null || body === void 0 ? void 0 : body.tenantId) || "default");
        return result;
    }
    async enableAllCatalogAgents(body) {
        const result = await this.agentService.enableAllCatalogAgents((body === null || body === void 0 ? void 0 : body.provider) || "vapi", (body === null || body === void 0 ? void 0 : body.tenantId) || "default");
        return result;
    }
    async disableAllCatalogAgents(body) {
        const result = await this.agentService.disableAllCatalogAgents((body === null || body === void 0 ? void 0 : body.provider) || "vapi", (body === null || body === void 0 ? void 0 : body.tenantId) || "default");
        return result;
    }
    async getOne(id, tenantId) {
        const agent = await this.agentService.getOne(id, tenantId || "default");
        return { ok: true, data: agent };
    }
    async create(body) {
        const agent = await this.agentService.create(body, body.tenantId || "default");
        return { ok: true, data: agent };
    }
    async update(id, body) {
        const agent = await this.agentService.update(id, body, body.tenantId || "default");
        return { ok: true, data: agent };
    }
    async remove(id, tenantId) {
        const deleted = await this.agentService.remove(id, tenantId || "default");
        return { ok: true, deleted };
    }
};
exports.VoiceAgentController = VoiceAgentController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)("tenantId")),
    __param(1, (0, common_1.Headers)("x-tenant-id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], VoiceAgentController.prototype, "list", null);
__decorate([
    (0, common_1.Get)("providers"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], VoiceAgentController.prototype, "getProviders", null);
__decorate([
    (0, common_1.Post)("sync-all"),
    __param(0, (0, common_1.Query)("tenantId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], VoiceAgentController.prototype, "syncAll", null);
__decorate([
    (0, common_1.Post)("deploy-workforce-team"),
    __param(0, (0, common_1.Query)("tenantId")),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], VoiceAgentController.prototype, "deployWorkforceTeam", null);
__decorate([
    (0, common_1.Post)("deploy-to-vapi"),
    __param(0, (0, common_1.Query)("tenantId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], VoiceAgentController.prototype, "deployToVapi", null);
__decorate([
    (0, common_1.Post)("sync/:provider"),
    __param(0, (0, common_1.Param)("provider")),
    __param(1, (0, common_1.Query)("tenantId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], VoiceAgentController.prototype, "syncFromProvider", null);
__decorate([
    (0, common_1.Get)("catalog"),
    __param(0, (0, common_1.Query)("provider")),
    __param(1, (0, common_1.Query)("tenantId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], VoiceAgentController.prototype, "getCatalog", null);
__decorate([
    (0, common_1.Post)("catalog/:key/enable"),
    __param(0, (0, common_1.Param)("key")),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], VoiceAgentController.prototype, "enableCatalogAgent", null);
__decorate([
    (0, common_1.Post)("catalog/:key/disable"),
    __param(0, (0, common_1.Param)("key")),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], VoiceAgentController.prototype, "disableCatalogAgent", null);
__decorate([
    (0, common_1.Post)("catalog/enable-all"),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], VoiceAgentController.prototype, "enableAllCatalogAgents", null);
__decorate([
    (0, common_1.Post)("catalog/disable-all"),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], VoiceAgentController.prototype, "disableAllCatalogAgents", null);
__decorate([
    (0, common_1.Get)(":id"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Query)("tenantId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], VoiceAgentController.prototype, "getOne", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], VoiceAgentController.prototype, "create", null);
__decorate([
    (0, common_1.Put)(":id"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], VoiceAgentController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(":id"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Query)("tenantId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], VoiceAgentController.prototype, "remove", null);
exports.VoiceAgentController = VoiceAgentController = __decorate([
    (0, common_2.UseGuards)(JwtAuthGuard_service_1.JwtAuthGuard, TenantContext_guard_1.TenantContextGuard),
    (0, common_1.Controller)({ path: "Voice/Agents", version: "1" }),
    __metadata("design:paramtypes", [VoiceAgent_service_1.VoiceAgentService,
        VoiceFactory_service_1.VoiceFactoryService])
], VoiceAgentController);
//# sourceMappingURL=VoiceAgent.controller.js.map