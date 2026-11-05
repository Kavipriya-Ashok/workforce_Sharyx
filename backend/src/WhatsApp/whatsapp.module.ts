import { WhatsAppFollowupService } from "./Services/WhatsAppFollowup.service";
import { Module } from "@nestjs/common";
import { WhatsAppController } from "./Controllers/WhatsApp.controller";
import { WhatsAppWebhookController } from "./Controllers/WhatsAppWebhook.controller";
import { WhatsAppAIController } from "./Controllers/WhatsAppAI.controller";
import { WhatsAppCampaignController } from "./Controllers/WhatsAppCampaign.controller";
import { WhatsAppTemplateController } from "./Controllers/WhatsAppTemplate.controller";
import { WhatsAppService } from "./Services/WhatsApp.service";
import { WhatsAppAIService } from "./Services/WhatsAppAI.service";
import { WhatsAppWebhookService } from "./Services/WhatsAppWebhook.service";
import { WhatsAppCampaignService } from "./Services/WhatsAppCampaign.service";
import { WhatsAppTemplateService } from "./Services/WhatsAppTemplate.service";
import { PromptEngineService } from "./Services/PromptEngine.service";
import { AgentOrchestratorModule } from "../AgentOrchestrator/agent-orchestrator.module";

@Module({
  imports: [AgentOrchestratorModule],
  controllers: [
    WhatsAppController,
    WhatsAppWebhookController,
    WhatsAppAIController,
    WhatsAppCampaignController,
    WhatsAppTemplateController,
  ],
  providers: [
    WhatsAppService,
    WhatsAppAIService,
    WhatsAppFollowupService,
    WhatsAppWebhookService,
    WhatsAppCampaignService,
    WhatsAppTemplateService,
    PromptEngineService,
  ],
  exports: [
    WhatsAppFollowupService,
    WhatsAppService,
    WhatsAppAIService,
    WhatsAppWebhookService,
    WhatsAppCampaignService,
    WhatsAppTemplateService,
    PromptEngineService,
  ],
})
export class WhatsAppModule {}
