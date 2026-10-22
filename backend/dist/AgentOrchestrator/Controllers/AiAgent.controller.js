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
exports.AiAgentController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const AuthBase_controller_1 = require("../../Controller/AuthBase.controller");
const Common_helper_1 = require("../../Helper/Common.helper");
const ResponseEnum_1 = require("../../Helper/Enum/ResponseEnum");
const AiAgent_service_1 = require("../Services/AiAgent.service");
const AgentOrchestrator_service_1 = require("../Services/AgentOrchestrator.service");
let AiAgentController = class AiAgentController extends AuthBase_controller_1.AuthBaseController {
    constructor(agentService, orchestrator) {
        super();
        this.agentService = agentService;
        this.orchestrator = orchestrator;
    }
    async list() {
        return this.SendResponseData(await this.agentService.list("default"));
    }
    async update(id, body, userId) {
        const agent = await this.agentService.update(id, body, userId);
        return this.SendResponse(ResponseEnum_1.ResponseEnum.Success, ResponseEnum_1.ResponseEnum.Saved, agent);
    }
    async reset(id) {
        const agent = await this.agentService.resetToDefault(id);
        return this.SendResponse(ResponseEnum_1.ResponseEnum.Success, ResponseEnum_1.ResponseEnum.Saved, agent);
    }
    async states(channel) {
        return this.SendResponseData(await this.agentService.listStates("default", channel));
    }
    async handoffs(id) {
        return this.SendResponseData(await this.agentService.getHandoffs(id));
    }
    async takeover(id, body) {
        var _a;
        const s = await this.agentService.setHumanTakeover(id, (_a = body === null || body === void 0 ? void 0 : body.takeover) !== null && _a !== void 0 ? _a : true);
        return this.SendResponse(ResponseEnum_1.ResponseEnum.Success, ResponseEnum_1.ResponseEnum.Saved, s);
    }
    async assign(id, body) {
        const s = await this.agentService.forceAgent(id, body.agent_key);
        return this.SendResponse(ResponseEnum_1.ResponseEnum.Success, ResponseEnum_1.ResponseEnum.Saved, s);
    }
    async simulate(body) {
        const channel = body.channel || "whatsapp";
        const sessionId = body.session_id || "playground";
        const result = await this.orchestrator.handle({
            channel,
            tenantId: "default",
            conversationRef: `sim_${channel}_${sessionId}`,
            message: body.message,
            name: body.name || "Playground User",
            history: undefined,
        });
        return this.SendResponseData(result);
    }
};
exports.AiAgentController = AiAgentController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AiAgentController.prototype, "list", null);
__decorate([
    (0, common_1.Put)(":id"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, Common_helper_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", Promise)
], AiAgentController.prototype, "update", null);
__decorate([
    (0, common_1.Post)(":id/Reset"),
    __param(0, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AiAgentController.prototype, "reset", null);
__decorate([
    (0, common_1.Get)("Conversations"),
    __param(0, (0, common_1.Query)("channel")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AiAgentController.prototype, "states", null);
__decorate([
    (0, common_1.Get)("Conversations/:id/Handoffs"),
    __param(0, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AiAgentController.prototype, "handoffs", null);
__decorate([
    (0, common_1.Post)("Conversations/:id/Takeover"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AiAgentController.prototype, "takeover", null);
__decorate([
    (0, common_1.Post)("Conversations/:id/Assign"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AiAgentController.prototype, "assign", null);
__decorate([
    (0, common_1.Post)("Simulate"),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AiAgentController.prototype, "simulate", null);
exports.AiAgentController = AiAgentController = __decorate([
    (0, common_1.Controller)({ path: "AiAgents", version: "1" }),
    (0, swagger_1.ApiTags)("AI Multi-Agent"),
    __metadata("design:paramtypes", [AiAgent_service_1.AiAgentService,
        AgentOrchestrator_service_1.AgentOrchestratorService])
], AiAgentController);
//# sourceMappingURL=AiAgent.controller.js.map