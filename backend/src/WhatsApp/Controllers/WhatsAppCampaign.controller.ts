import { Body, Controller, Delete, Get, Param, Patch, Post, Put } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { AuthBaseController } from "@Controller/AuthBase.controller";
import { CurrentUser } from "@Helper/Common.helper";
import { ResponseEnum } from "@Helper/Enum/ResponseEnum";
import { WhatsAppCampaignService } from "../Services/WhatsAppCampaign.service";
import { WhatsAppCampaignModel } from "../Models/WhatsAppCampaign.model";

@Controller({ path: "WhatsApp/Campaigns", version: "1" })
@ApiTags("WhatsApp Campaigns")
export class WhatsAppCampaignController extends AuthBaseController {
  constructor(private readonly campaignService: WhatsAppCampaignService) {
    super();
  }

  @Get()
  async listCampaigns() {
    const campaigns = await this.campaignService.listCampaigns();
    return this.SendResponseData(campaigns);
  }

  @Post()
  async createCampaignBase(@Body() body: WhatsAppCampaignModel, @CurrentUser() userId: string) {
    const campaign = await this.campaignService.createCampaign(body, userId);
    return this.SendResponse(ResponseEnum.Success, ResponseEnum.Created, campaign);
  }

  @Post("Create")
  async createCampaign(@Body() body: WhatsAppCampaignModel, @CurrentUser() userId: string) {
    const campaign = await this.campaignService.createCampaign(body, userId);
    return this.SendResponse(ResponseEnum.Success, ResponseEnum.Created, campaign);
  }

  @Put("Update/:id")
  async updateCampaign(
    @Param("id") id: string,
    @Body() body: Partial<WhatsAppCampaignModel>
  ) {
    const campaign = await this.campaignService.updateCampaign(id, body);
    return this.SendResponse(ResponseEnum.Success, ResponseEnum.Updated, campaign);
  }

  @Patch("Toggle/:id")
  async toggleCampaign(
    @Param("id") id: string,
    @Body("is_active") isActive: boolean
  ) {
    const campaign = await this.campaignService.toggleCampaign(id, isActive);
    return this.SendResponse(ResponseEnum.Success, ResponseEnum.Updated, campaign);
  }

  @Delete("Delete/:id")
  async deleteCampaign(@Param("id") id: string) {
    await this.campaignService.deleteCampaign(id);
    return this.SendResponse(ResponseEnum.Success, ResponseEnum.Deleted, { id });
  }
}
