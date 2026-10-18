import { Module } from "@nestjs/common";
import { EmailController } from "./Controllers/Email.controller";
import { EmailAIController } from "./Controllers/EmailAI.controller";
import { EmailCampaignController } from "./Controllers/EmailCampaign.controller";
import { EmailService } from "./Services/Email.service";
import { EmailAIService } from "./Services/EmailAI.service";
import { EmailCampaignService } from "./Services/EmailCampaign.service";
import { EmailImapService } from "./Services/EmailImap.service";
import { EncryptionService } from "@Service/Encryption.service";

@Module({
  controllers: [
    EmailController,
    EmailAIController,
    EmailCampaignController,
  ],
  providers: [
    EmailService,
    EmailAIService,
    EmailCampaignService,
    EmailImapService,
    EncryptionService,
  ],
  exports: [
    EmailService,
    EmailAIService,
    EmailCampaignService,
    EmailImapService,
  ],
})
export class EmailModule {}
