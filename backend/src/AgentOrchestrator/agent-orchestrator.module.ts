import { Module } from "@nestjs/common";
import { AiAgentController } from "./Controllers/AiAgent.controller";
import { AgentOrchestratorService } from "./Services/AgentOrchestrator.service";
import { AgentLlmService } from "./Services/AgentLlm.service";
import { AgentToolsService } from "./Services/AgentTools.service";
import { AiAgentService } from "./Services/AiAgent.service";
import { JobOpeningsService } from "@Service/Lead/JobOpenings.service";

/**
 * Multi-agent LLM team for WhatsApp + Email:
 * Receptionist (welcome + product) -> Sales / Appointment / Support (360°).
 */
@Module({
  controllers: [AiAgentController],
  providers: [AgentOrchestratorService, AgentLlmService, AgentToolsService, AiAgentService, JobOpeningsService],
  exports: [AgentOrchestratorService, AiAgentService, AgentLlmService, JobOpeningsService],
})
export class AgentOrchestratorModule {}
