import { Module } from "@nestjs/common";
import { AiAgentController } from "./Controllers/AiAgent.controller";
import { AgentOrchestratorService } from "./Services/AgentOrchestrator.service";
import { AgentLlmService } from "./Services/AgentLlm.service";
import { AgentToolsService } from "./Services/AgentTools.service";
import { AiAgentService } from "./Services/AiAgent.service";

/**
 * Multi-agent LLM team for WhatsApp + Email:
 * Receptionist (welcome + product) -> Sales / Appointment / Support (360°).
 */
@Module({
  controllers: [AiAgentController],
  providers: [AgentOrchestratorService, AgentLlmService, AgentToolsService, AiAgentService],
  exports: [AgentOrchestratorService, AiAgentService, AgentLlmService],
})
export class AgentOrchestratorModule {}
