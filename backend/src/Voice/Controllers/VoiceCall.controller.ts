import { Controller, Get, Post, Body, Query } from "@nestjs/common";
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
  async getLogs(@Query("tenantId") tenantId?: string, @Query("limit") limit?: string) {
    const logs = await this.callService.getCallLogs(
      tenantId || "default",
      limit ? parseInt(limit, 10) : 50
    );
    return { ok: true, data: logs };
  }

  @Get("stats")
  async getStats(@Query("tenantId") tenantId?: string) {
    const stats = await this.callService.getCallStats(tenantId || "default");
    return { ok: true, data: stats };
  }
}
