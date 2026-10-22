"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentOrchestratorModule = void 0;
const common_1 = require("@nestjs/common");
const AiAgent_controller_1 = require("./Controllers/AiAgent.controller");
const AgentOrchestrator_service_1 = require("./Services/AgentOrchestrator.service");
const AgentLlm_service_1 = require("./Services/AgentLlm.service");
const AgentTools_service_1 = require("./Services/AgentTools.service");
const AiAgent_service_1 = require("./Services/AiAgent.service");
let AgentOrchestratorModule = class AgentOrchestratorModule {
};
exports.AgentOrchestratorModule = AgentOrchestratorModule;
exports.AgentOrchestratorModule = AgentOrchestratorModule = __decorate([
    (0, common_1.Module)({
        controllers: [AiAgent_controller_1.AiAgentController],
        providers: [AgentOrchestrator_service_1.AgentOrchestratorService, AgentLlm_service_1.AgentLlmService, AgentTools_service_1.AgentToolsService, AiAgent_service_1.AiAgentService],
        exports: [AgentOrchestrator_service_1.AgentOrchestratorService, AiAgent_service_1.AiAgentService, AgentLlm_service_1.AgentLlmService],
    })
], AgentOrchestratorModule);
//# sourceMappingURL=agent-orchestrator.module.js.map