import { Body, Controller, Get, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { AuthBaseController } from "@Controller/AuthBase.controller";
import { CurrentUser } from "@Helper/Common.helper";
import { ResponseEnum } from "@Helper/Enum/ResponseEnum";
import { EmailCampaignService } from "../Services/EmailCampaign.service";
import { EmailCampaignModel } from "../Models/EmailCampaign.model";

@Controller({ path: "Email/Campaign", version: "1" })
@ApiTags("Email Campaign")
export class EmailCampaignController extends AuthBaseController {
  constructor(private readonly campaignService: EmailCampaignService) {
    super();
  }

  @Get()
  async listCampaigns() {
    const campaigns = await this.campaignService.listCampaigns();
    return this.SendResponseData(campaigns);
  }

  @Post()
  async createCampaign(@Body() body: EmailCampaignModel, @CurrentUser() userId: string) {
    const campaign = await this.campaignService.createCampaign(body, userId);
    return this.SendResponse(ResponseEnum.Success, ResponseEnum.Created, campaign);
  }
}
