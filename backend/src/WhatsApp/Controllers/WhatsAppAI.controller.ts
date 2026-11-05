import { Body, Controller, Get, Post, UsePipes } from "@nestjs/common";
import { strictPipes } from "@Helper/StrictValidation";
import { ApiTags } from "@nestjs/swagger";
import { JWTAuthController } from "@Controller/JWTAuth.controller";
import { CurrentUser, CurrentTenant } from "@Helper/Common.helper";
import { ResponseEnum } from "@Helper/Enum/ResponseEnum";
import { WhatsAppAIService } from "../Services/WhatsAppAI.service";
import { WhatsAppAIConfigModel } from "../Models/WhatsAppAIConfig.model";

@Controller({ path: "WhatsApp/AI", version: "1" })
@ApiTags("WhatsApp AI")
export class WhatsAppAIController extends JWTAuthController {
  constructor(private readonly aiService: WhatsAppAIService) {
    super();
  }

  @Get("Config")
  async getConfig(@CurrentTenant() tenantId: string) {
    const config = await this.aiService.getConfig(tenantId);
    // Never return the stored LLM key to the browser.
    // followup_scheduler_active lets the UI say honestly whether follow-ups can actually go out on this server
    return this.SendResponseData(config ? { ...config, api_key: undefined, has_api_key: !!config.api_key, followup_scheduler_active: process.env.WA_FOLLOWUP_SCHEDULER === "true" } : config);
  }

  @Post("Config")
  @UsePipes(...strictPipes())
  async saveConfig(@Body() body: WhatsAppAIConfigModel, @CurrentUser() userId: string, @CurrentTenant() tenantId: string) {
    const config = await this.aiService.saveConfig(body, userId as any, tenantId);
    return this.SendResponse(ResponseEnum.Success, ResponseEnum.Saved, { ...config, api_key: undefined, has_api_key: !!config.api_key });
  }
}
