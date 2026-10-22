import { Controller, Post, Param, Body, HttpCode, HttpStatus } from "@nestjs/common";
import { VoiceCallService } from "../Services/VoiceCall.service";

@Controller({ path: "Voice/Webhook", version: "1" })
export class VoiceWebhookController {
  constructor(private readonly callService: VoiceCallService) {}

  @Post(":provider")
  @HttpCode(HttpStatus.OK)
  async handleWebhook(@Param("provider") provider: string, @Body() body: any) {
    const result = await this.callService.handleWebhook(provider, body);
    return { ok: true, received: true, callId: result.providerCallId };
  }
}
