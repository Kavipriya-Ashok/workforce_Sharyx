import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Customer } from "../Database/Table/Customer/customer";
import { lead } from "../Database/Table/Lead/lead";
import { OmnichannelConversation } from "../Database/Table/Omnichannel/OmnichannelConversation.entity";
import { OmnichannelMessage } from "../Database/Table/Omnichannel/OmnichannelMessage.entity";
import { OmnichannelCall } from "../Database/Table/Omnichannel/OmnichannelCall.entity";
import { OmnichannelActivityLog } from "../Database/Table/Omnichannel/OmnichannelActivityLog.entity";
import { OmnichannelCommunication } from "../Database/Table/Omnichannel/OmnichannelCommunication.entity";
import { CustomerIdentityMapping } from "../Database/Table/Omnichannel/CustomerIdentityMapping.entity";
import { OmnichannelEvent } from "../Database/Table/Omnichannel/OmnichannelEvent.entity";
import { WhatsAppConversation } from "../Database/Table/WhatsApp/WhatsAppConversation.entity";
import { WhatsAppMessage } from "../Database/Table/WhatsApp/WhatsAppMessage.entity";
import { EmailLog } from "../Database/Table/Email/EmailLog.entity";
import { VoiceCallLog } from "../Database/Table/Voice/VoiceCallLog.entity";
import { lead_activity } from "../Database/Table/Lead/lead_activity";

import { OmnichannelController } from "./Controllers/Omnichannel.controller";
import { OmnichannelWebhookController } from "./Controllers/OmnichannelWebhook.controller";
import { OmnichannelService } from "./Services/Omnichannel.service";
import { OmnichannelIngestionService } from "./Services/OmnichannelIngestion.service";
import { OmnichannelSummarizerService } from "./Services/OmnichannelSummarizer.service";
import { OmnichannelRealtimeService } from "./Services/OmnichannelRealtime.service";
import { CustomerIdentityResolutionService } from "./Services/CustomerIdentityResolution.service";
import { OmnichannelTimelineService } from "./Services/OmnichannelTimeline.service";
import { OmnichannelCustomerIntelligenceService } from "./Services/OmnichannelCustomerIntelligence.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Customer,
      lead,
      OmnichannelConversation,
      OmnichannelMessage,
      OmnichannelCall,
      OmnichannelActivityLog,
      OmnichannelCommunication,
      CustomerIdentityMapping,
      OmnichannelEvent,
      WhatsAppConversation,
      WhatsAppMessage,
      EmailLog,
      VoiceCallLog,
      lead_activity,
    ]),
  ],
  controllers: [OmnichannelController, OmnichannelWebhookController],
  providers: [
    OmnichannelService,
    OmnichannelIngestionService,
    OmnichannelSummarizerService,
    OmnichannelRealtimeService,
    CustomerIdentityResolutionService,
    OmnichannelTimelineService,
    OmnichannelCustomerIntelligenceService,
  ],
  exports: [
    OmnichannelService,
    OmnichannelIngestionService,
    OmnichannelSummarizerService,
    OmnichannelRealtimeService,
    CustomerIdentityResolutionService,
    OmnichannelTimelineService,
    OmnichannelCustomerIntelligenceService,
  ],
})
export class OmnichannelModule {}

