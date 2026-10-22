import { Module } from "@nestjs/common";
import { EmailController } from "./Controllers/Email.controller";
import { EmailAIController } from "./Controllers/EmailAI.controller";
import { EmailCampaignController } from "./Controllers/EmailCampaign.controller";
import { EmailTemplateController } from "./Controllers/EmailTemplate.controller";
import { EmailTriggerController } from "./Controllers/EmailTrigger.controller";
import { EmailService } from "./Services/Email.service";
import { EmailAIService } from "./Services/EmailAI.service";
import { EmailCampaignService } from "./Services/EmailCampaign.service";
import { EmailImapService } from "./Services/EmailImap.service";
import { EmailValidationService } from "./Services/EmailValidation.service";
import { EmailTemplateService } from "./Services/EmailTemplate.service";
import { EncryptionService } from "@Service/Encryption.service";
import { PdfGeneratorService } from "@Service/PdfGenerator.service";
import { OutcomeTriggerService } from "@Service/OutcomeTrigger.service";
import { AgentOrchestratorModule } from "../AgentOrchestrator/agent-orchestrator.module";
import { AgentOutcomeListener } from "./Services/AgentOutcome.listener";

@Module({
  imports: [AgentOrchestratorModule],
  controllers: [
    EmailController,
    EmailAIController,
    EmailCampaignController,
    EmailTemplateController,
    EmailTriggerController,
  ],
  providers: [
    EmailService,
    EmailAIService,
    EmailCampaignService,
    EmailImapService,
    EmailValidationService,
    EmailTemplateService,
    EncryptionService,
    PdfGeneratorService,
    OutcomeTriggerService,
    AgentOutcomeListener,
  ],
  exports: [
    EmailService,
    EmailAIService,
    EmailCampaignService,
    EmailImapService,
    EmailValidationService,
    EmailTemplateService,
    PdfGeneratorService,
    OutcomeTriggerService,
  ],
})
export class EmailModule {}
