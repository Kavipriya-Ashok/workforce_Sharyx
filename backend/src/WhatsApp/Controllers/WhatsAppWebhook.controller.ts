import { Body, Controller, Get, HttpCode, HttpStatus, Query, Res, Post, VERSION_NEUTRAL, Logger } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Response } from "express";
import { WhatsAppWebhookService } from "../Services/WhatsAppWebhook.service";

@Controller({
  path: [
    "WhatsApp/Webhook",
    "webhook/whatsapp",
    "api/webhook/whatsapp",
    "api/whatsapp/webhook",
    "webhook",
  ],
  version: ["1", VERSION_NEUTRAL],
})
@ApiTags("WhatsApp Webhook")
export class WhatsAppWebhookController {
  private readonly logger = new Logger("WhatsAppWebhook");

  constructor(private readonly webhookService: WhatsAppWebhookService) {}

  // Meta Webhook Verification Handshake
  @Get()
  async verifyWebhook(
    @Query("hub.mode") mode: string,
    @Query("hub.verify_token") token: string,
    @Query("hub.challenge") challenge: string,
    @Res() res: Response
  ) {
    this.logger.log(`[HANDSHAKE] Meta Webhook verification requested: mode=${mode}, token=${token}`);
    const verified = await this.webhookService.verifyHandshake(mode, token, challenge);
    if (verified) {
      this.logger.log(`✅ [HANDSHAKE] Meta Webhook successfully verified!`);
      return res.status(HttpStatus.OK).send(verified);
    }
    this.logger.warn(`❌ [HANDSHAKE] Meta Webhook verification failed. Expected token mismatch.`);
    return res.status(HttpStatus.FORBIDDEN).send("Verification failed");
  }

  // Meta Inbound Message Ingestion
  @Post()
  @HttpCode(HttpStatus.OK)
  async handleIncomingMessage(@Body() body: any) {
    this.logger.log(`📥 [WEBHOOK HIT] Incoming event from Meta received!`);
    // Process asynchronously and immediately return 200 OK to Meta
    this.webhookService.processIncomingWebhook(body);
    return "EVENT_RECEIVED";
  }
}
