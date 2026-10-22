import { Module } from "@nestjs/common";
import { VapiProvider } from "./Providers/Vapi.provider";
import { RetellProvider } from "./Providers/Retell.provider";
import { BlandProvider } from "./Providers/Bland.provider";
import { SaasFallbackProvider } from "./Providers/SaasFallback.provider";
import { VoiceFactoryService } from "./Services/VoiceFactory.service";
import { VoiceAgentService } from "./Services/VoiceAgent.service";
import { VoiceCallService } from "./Services/VoiceCall.service";
import { VoiceConfigService } from "./Services/VoiceConfig.service";
import { VoiceAgentController } from "./Controllers/VoiceAgent.controller";
import { VoiceCallController } from "./Controllers/VoiceCall.controller";
import { VoiceConfigController } from "./Controllers/VoiceConfig.controller";
import { VoiceWebhookController } from "./Controllers/VoiceWebhook.controller";

@Module({
  controllers: [
    VoiceAgentController,
    VoiceCallController,
    VoiceConfigController,
    VoiceWebhookController,
  ],
  providers: [
    VapiProvider,
    RetellProvider,
    BlandProvider,
    SaasFallbackProvider,
    VoiceFactoryService,
    VoiceAgentService,
    VoiceCallService,
    VoiceConfigService,
  ],
  exports: [VoiceAgentService, VoiceCallService, VoiceFactoryService, VoiceConfigService],
})
export class VoiceModule {}
