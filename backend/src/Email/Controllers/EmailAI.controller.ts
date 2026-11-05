import { Body, Controller, Get, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { JWTAuthController } from "@Controller/JWTAuth.controller";
import { CurrentUser, CurrentTenant } from "@Helper/Common.helper";
import { ResponseEnum } from "@Helper/Enum/ResponseEnum";
import { EmailAIService } from "../Services/EmailAI.service";
import { EmailAIConfigModel, GenerateEmailAIDraftModel } from "../Models/EmailAIConfig.model";

import { UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "@Service/Auth/JwtAuthGuard.service";
import { TenantContextGuard } from "@Service/Auth/TenantContext.guard";
@UseGuards(JwtAuthGuard, TenantContextGuard)
@Controller({ path: "Email/AI", version: "1" })
@ApiTags("Email AI")
export class EmailAIController extends JWTAuthController {
  constructor(private readonly emailAiService: EmailAIService) {
    super();
  }

  @Get("Config")
  async getConfig(@CurrentTenant() tenantId: string) {
    const config = await this.emailAiService.getConfig(tenantId);
    // Never return the stored LLM key to the browser.
    return this.SendResponseData(config ? { ...config, api_key: undefined, has_api_key: !!config.api_key } : config);
  }

  @Post("Config")
  async saveConfig(@Body() body: EmailAIConfigModel, @CurrentUser() userId: string, @CurrentTenant() tenantId: string) {
    const config = await this.emailAiService.saveConfig(body, userId, tenantId);
    return this.SendResponse(ResponseEnum.Success, ResponseEnum.Saved, { ...config, api_key: undefined, has_api_key: !!config.api_key });
  }

  @Post("Draft")
  async generateDraft(@Body() body: GenerateEmailAIDraftModel, @CurrentTenant() tenantId: string) {
    const draft = await this.emailAiService.generateDraft(body, tenantId);
    return this.SendResponseData(draft);
  }
}
