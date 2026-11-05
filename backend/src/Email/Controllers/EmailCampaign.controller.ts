import { Body, Controller, Get, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { JWTAuthController } from "@Controller/JWTAuth.controller";
import { CurrentUser, CurrentTenant } from "@Helper/Common.helper";
import { ResponseEnum } from "@Helper/Enum/ResponseEnum";
import { EmailCampaignService } from "../Services/EmailCampaign.service";
import { EmailCampaignModel } from "../Models/EmailCampaign.model";

import { UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "@Service/Auth/JwtAuthGuard.service";
import { TenantContextGuard } from "@Service/Auth/TenantContext.guard";
@UseGuards(JwtAuthGuard, TenantContextGuard)
@Controller({ path: "Email/Campaign", version: "1" })
@ApiTags("Email Campaign")
export class EmailCampaignController extends JWTAuthController {
  constructor(private readonly campaignService: EmailCampaignService) {
    super();
  }

  @Get()
  async listCampaigns(@CurrentTenant() tenantId: string) {
    const campaigns = await this.campaignService.listCampaigns(tenantId);
    return this.SendResponseData(campaigns);
  }

  @Post()
  async createCampaign(@Body() body: EmailCampaignModel, @CurrentUser() userId: string, @CurrentTenant() tenantId: string) {
    const campaign = await this.campaignService.createCampaign(body, userId, tenantId);
    return this.SendResponse(ResponseEnum.Success, ResponseEnum.Created, campaign);
  }
}
