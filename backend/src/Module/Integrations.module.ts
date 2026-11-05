import { Module } from '@nestjs/common';
import { WhatsAppModule } from '../WhatsApp/whatsapp.module';
import { EmailModule } from '../Email/email.module';
import { VoiceModule } from '../Voice/voice.module';
import { IntegrationsController, ProfileController } from '../Controller/Integrations/Integrations.controller';
import { IntegrationsService } from '../Service/Integrations/Integrations.service';
import { ProfileService } from '../Service/Onboarding/Profile.service';

/** Unified integration status (R1-R5), Test/Disconnect actions and the company Profile endpoints. */
@Module({
  imports: [WhatsAppModule, EmailModule, VoiceModule],
  controllers: [IntegrationsController, ProfileController],
  providers: [IntegrationsService, ProfileService],
  exports: [IntegrationsService],
})
export class IntegrationsModule {}
