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
let VoiceAgentController = class VoiceAgentController {
    constructor(agentService, factory) {
        this.agentService = agentService;
        this.factory = factory;
    }
    async list(tenantId) {
        const agents = await this.agentService.list(tenantId || "default");
        return { ok: true, data: agents };
    }
    getProviders() {
        return { ok: true, data: this.factory.getAllProviders() };
    }
    async syncAll(tenantId) {
        const agents = await this.agentService.list(tenantId || "default");
        return { ok: true, count: agents.length, data: agents };
    }
    async syncFromProvider(provider, tenantId) {
        const agents = await this.agentService.syncFromProvider(provider || "vapi", tenantId || "default");
        return { ok: true, count: agents.length, data: agents };
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
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
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
    (0, common_1.Post)("sync/:provider"),
    __param(0, (0, common_1.Param)("provider")),
    __param(1, (0, common_1.Query)("tenantId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], VoiceAgentController.prototype, "syncFromProvider", null);
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
    (0, common_1.Controller)({ path: "Voice/Agents", version: "1" }),
    __metadata("design:paramtypes", [VoiceAgent_service_1.VoiceAgentService,
        VoiceFactory_service_1.VoiceFactoryService])
], VoiceAgentController);
//# sourceMappingURL=VoiceAgent.controller.js.map