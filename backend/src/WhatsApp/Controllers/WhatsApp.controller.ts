import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { AuthBaseController } from "@Controller/AuthBase.controller";
import { CurrentUser } from "@Helper/Common.helper";
import { ResponseEnum } from "@Helper/Enum/ResponseEnum";
import { WhatsAppService } from "../Services/WhatsApp.service";
import { SendWhatsAppMessageModel } from "../Models/SendWhatsAppMessage.model";
import { WhatsAppConfigModel } from "../Models/WhatsAppConfig.model";

@Controller({ path: "WhatsApp", version: "1" })
@ApiTags("WhatsApp")
export class WhatsAppController extends AuthBaseController {
  constructor(private readonly whatsAppService: WhatsAppService) {
    super();
  }

  @Get("Config")
  async getConfig() {
    const config = await this.whatsAppService.getConfig();
    return this.SendResponseData(config);
  }

  @Post("Config")
  async saveConfig(@Body() body: WhatsAppConfigModel, @CurrentUser() userId: string) {
    const result = await this.whatsAppService.saveConfig(body, userId);
    return this.SendResponse(ResponseEnum.Success, ResponseEnum.Saved, result);
  }

  @Post("Test-Connection")
  async testConnection(@Body() body: WhatsAppConfigModel, @CurrentUser() userId: string) {
    const result = await this.whatsAppService.testConnection(body, userId);
    return this.SendResponse(ResponseEnum.Success, "WhatsApp connection test successful", result);
  }

  @Post("Send")
  async sendMessage(@Body() body: SendWhatsAppMessageModel, @CurrentUser() userId: string) {
    const result = await this.whatsAppService.sendMessage(body, userId);
    return this.SendResponse(ResponseEnum.Success, "Message sent successfully", result);
  }

  @Get("Conversations")
  async getConversations() {
    const conversations = await this.whatsAppService.getConversations();
    return this.SendResponseData(conversations);
  }

  @Get("Messages/:conversationId")
  async getMessages(@Param("conversationId") conversationId: string) {
    const messages = await this.whatsAppService.getMessagesByConversation(conversationId);
    return this.SendResponseData(messages);
  }
}
