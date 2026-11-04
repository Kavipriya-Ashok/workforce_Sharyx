import { Body, Controller, HttpCode, HttpStatus, Post, Headers, Logger, VERSION_NEUTRAL } from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { OmnichannelIngestionService } from "../Services/OmnichannelIngestion.service";
import {
  WhatsAppIncomingWebhookDto,
  EmailIncomingWebhookDto,
  CallIncomingWebhookDto,
} from "../Dto/Omnichannel.dto";

@Controller({
  path: [
    "omnichannel/webhook",
    "Omnichannel/Webhook",
    "omnichannel/webhooks",
    "Omnichannel/Webhooks",
  ],
  version: ["1", VERSION_NEUTRAL],
})
@ApiTags("Omnichannel Webhooks")
export class OmnichannelWebhookController {
  private readonly logger = new Logger(OmnichannelWebhookController.name);

  constructor(private readonly ingestionService: OmnichannelIngestionService) {}

  @Post("whatsapp")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Ingest incoming WhatsApp message webhook" })
  async handleWhatsAppWebhook(
    @Body() body: any,
    @Headers("x-tenant-id") tenantHeader?: string
  ) {
    const tenantId = tenantHeader || body.tenant_id || "default";
    this.logger.log(`[WEBHOOK: WHATSAPP] Incoming payload received for tenant: ${tenantId}`);

    // Normalize standard payload format or raw webhook format
    const dto: WhatsAppIncomingWebhookDto = {
      provider_message_id: body.provider_message_id || body.id || body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.id,
      from_phone:
        body.from_phone ||
        body.from ||
        body.phone ||
        body.entry?.[0]?.changes?.[0]?.value?.contacts?.[0]?.wa_id ||
        body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.from ||
        "+919876543210",
      customer_name:
        body.customer_name ||
        body.name ||
        body.entry?.[0]?.changes?.[0]?.value?.contacts?.[0]?.profile?.name ||
        undefined,
      body:
        body.body ||
        body.text?.body ||
        body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.text?.body ||
        "Hello from customer via WhatsApp",
      attachments: body.attachments || [],
      timestamp: body.timestamp || new Date().toISOString(),
      metadata: body,
    };

    return await this.ingestionService.ingestWhatsAppMessage(dto, tenantId);
  }

  @Post("email")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Ingest incoming Email webhook" })
  async handleEmailWebhook(
    @Body() body: any,
    @Headers("x-tenant-id") tenantHeader?: string
  ) {
    const tenantId = tenantHeader || body.tenant_id || "default";
    this.logger.log(`[WEBHOOK: EMAIL] Incoming payload received for tenant: ${tenantId}`);

    const dto: EmailIncomingWebhookDto = {
      provider_message_id: body.provider_message_id || body.message_id || body.id,
      from_email: body.from_email || body.from || body.sender || "client@example.com",
      customer_name: body.customer_name || body.name || body.from_name,
      to_email: body.to_email || body.to,
      subject: body.subject || "(No Subject)",
      body: body.body || body.text || body.html || "",
      attachments: body.attachments || [],
      thread_id: body.thread_id || body.in_reply_to,
      timestamp: body.timestamp || new Date().toISOString(),
      metadata: body,
    };

    return await this.ingestionService.ingestEmailMessage(dto, tenantId);
  }

  @Post("call")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Ingest telephony / Vapi / voice call event webhook" })
  async handleCallWebhook(
    @Body() body: any,
    @Headers("x-tenant-id") tenantHeader?: string
  ) {
    const tenantId = tenantHeader || body.tenant_id || "default";
    this.logger.log(`[WEBHOOK: CALL] Incoming call event received for tenant: ${tenantId}`);

    const dto: CallIncomingWebhookDto = {
      provider_call_id: body.provider_call_id || body.call_id || body.id || body.message?.call?.id,
      phone_number:
        body.phone_number ||
        body.phone ||
        body.customer_number ||
        body.message?.customer?.number ||
        "+919876543210",
      customer_name: body.customer_name || body.customer?.name || body.message?.customer?.name,
      direction: body.direction === "outbound" ? "outbound" : "inbound",
      duration: Number(body.duration || body.message?.duration || body.call?.duration || 0),
      recording_url: body.recording_url || body.recordingUrl || body.message?.recordingUrl,
      transcript: body.transcript || body.message?.transcript || body.call?.transcript,
      ai_summary: body.ai_summary || body.summary || body.message?.summary || body.call?.summary,
      outcome: body.outcome || body.status || body.message?.endedReason || "completed",
      started_at: body.started_at || body.startedAt || body.message?.startedAt,
      ended_at: body.ended_at || body.endedAt || body.message?.endedAt,
      telephony_provider: body.telephony_provider || body.provider || "vapi",
      metadata: body,
    };

    return await this.ingestionService.ingestCallEvent(dto, tenantId);
  }
}

