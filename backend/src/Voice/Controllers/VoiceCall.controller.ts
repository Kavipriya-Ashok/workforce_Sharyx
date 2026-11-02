import { Controller, Get, Post, Body, Query, Res } from "@nestjs/common";
import { VoiceCallService } from "../Services/VoiceCall.service";
import { MakeVoiceCallDto } from "../Interfaces/VoiceTypes";

@Controller({ path: "Voice/Calls", version: "1" })
export class VoiceCallController {
  constructor(private readonly callService: VoiceCallService) {}

  @Post("dispatch")
  async dispatch(@Body() body: MakeVoiceCallDto) {
    const callLog = await this.callService.dispatchCall(body);
    return { ok: true, data: callLog };
  }

  @Get("logs")
  async getLogs(
    @Query("tenantId") tenantId?: string,
    @Query("limit") limit?: string,
    @Query("agentId") agentId?: string,
    @Query("skipSync") skipSync?: string
  ) {
    const logs = await this.callService.getCallLogs(
      tenantId || "default",
      limit ? parseInt(limit, 10) : 50,
      agentId || undefined,
      skipSync === "true"
    );
    return { ok: true, data: logs };
  }

  @Get("stats")
  async getStats(@Query("tenantId") tenantId?: string) {
    const stats = await this.callService.getCallStats(tenantId || "default");
    return { ok: true, data: stats };
  }

  /**
   * Manually sync call logs from SaaS platform — pulls from fallback-voice.sharyx.ai/api/call/list
   * and upserts them into local VoiceCallLog table.
   */
  @Post("sync-saas")
  async syncFromSaas(@Query("tenantId") tenantId?: string) {
    const synced = await this.callService.syncCallLogsFromSaas(tenantId || "default");
    return { ok: true, synced, message: `Synced ${synced} call logs from Sharyx SaaS platform` };
  }

  /**
   * Manually sync call logs from Vapi platform — pulls from api.vapi.ai/call
   * and upserts them into local VoiceCallLog table with recordings, durations and transcripts.
   */
  /**
   * Stream / proxy call audio recording so the browser can play it without Cloudflare R2 CORS/forbidden blocks.
   */
  @Get("audio")
  async streamAudio(
    @Query("callId") callId: string,
    @Query("providerCallId") providerCallId: string,
    @Query("tenantId") tenantId?: string,
    @Res() res?: any
  ) {
    return await this.callService.streamCallAudio(callId, providerCallId, tenantId || "default", res);
  }

  @Post("sync-vapi")
  async syncFromVapi(@Query("tenantId") tenantId?: string) {
    const synced = await this.callService.syncCallLogsFromVapi(tenantId || "default");
    return { ok: true, synced, message: `Synced ${synced} call logs from Vapi platform` };
  }
}

