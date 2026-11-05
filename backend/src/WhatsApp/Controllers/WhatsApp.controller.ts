import { UsePipes } from "@nestjs/common";
import { strictPipes } from "@Helper/StrictValidation";
import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { JWTAuthController } from "@Controller/JWTAuth.controller";
import { CurrentTenant, CurrentUser } from "@Helper/Common.helper";
import { ResponseEnum } from "@Helper/Enum/ResponseEnum";
import { WhatsAppService } from "../Services/WhatsApp.service";
import { SendWhatsAppMessageModel } from "../Models/SendWhatsAppMessage.model";
import { WhatsAppConfigModel } from "../Models/WhatsAppConfig.model";

/**
 * Every endpoint is JWT-protected and pinned to the caller's tenant (from the token).
 * Credentials are stored per tenant and are NEVER returned to the browser.
 */
@Controller({ path: "WhatsApp", version: "1" })
@ApiTags("WhatsApp")
export class WhatsAppController extends JWTAuthController {
  constructor(private readonly whatsAppService: WhatsAppService) {
    super();
  }

  @Get("Config")
  async getConfig(@CurrentTenant() tenantId: string | null) {
    const config = await this.whatsAppService.getSafeConfig(tenantId as string);
    return this.SendResponseData(config);
  }

  @Post("Config")
  @UsePipes(...strictPipes())
  async saveConfig(@Body() body: WhatsAppConfigModel, @CurrentUser() userId: string, @CurrentTenant() tenantId: string | null) {
    const saved = await this.whatsAppService.saveConfig(body, userId as any, tenantId as string);
    return this.SendResponse(ResponseEnum.Success, ResponseEnum.Saved, this.whatsAppService.toSafeConfig(saved));
  }

  @Post("Test-Connection")
  @UsePipes(...strictPipes())
  async testConnection(@Body() body: WhatsAppConfigModel, @CurrentUser() userId: string, @CurrentTenant() tenantId: string | null) {
    const result = await this.whatsAppService.testConnection(body, userId as any, tenantId as string);
    return this.SendResponse(ResponseEnum.Success, "WhatsApp connection test successful", result);
  }

  @Post("Disconnect")
  async disconnect(@CurrentUser() userId: string, @CurrentTenant() tenantId: string | null) {
    const result = await this.whatsAppService.disconnect(tenantId as string, userId as any);
    return this.SendResponse(ResponseEnum.Success, "WhatsApp disconnected", result);
  }

  @Post("Send")
  async sendMessage(@Body() body: SendWhatsAppMessageModel, @CurrentUser() userId: string, @CurrentTenant() tenantId: string | null) {
    const result = await this.whatsAppService.sendMessage(body, userId as any, false, tenantId as string);
    return this.SendResponse(ResponseEnum.Success, "Message sent successfully", result);
  }

  @Get("Conversations")
  async getConversations(@CurrentTenant() tenantId: string | null) {
    const conversations = await this.whatsAppService.getConversations(tenantId);
    return this.SendResponseData(conversations);
  }

  @Get("Messages/:conversationId")
  async getMessages(@Param("conversationId") conversationId: string, @CurrentTenant() tenantId: string | null) {
    const messages = await this.whatsAppService.getMessagesByConversation(conversationId, tenantId);
    return this.SendResponseData(messages);
  }

  @Patch("Conversations/:id/status")
  async updateConversationStatus(
    @Param("id") id: string,
    @Body("status") status: string,
    @CurrentTenant() tenantId: string | null
  ) {
    const result = await this.whatsAppService.setConversationStatus(id, status, tenantId);
    return this.SendResponse(ResponseEnum.Success, ResponseEnum.Updated, result);
  }
}
