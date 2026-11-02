import { Body, Controller, Get, Param, Post, Query, Headers } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { AuthBaseController } from "@Controller/AuthBase.controller";
import { CurrentUser } from "@Helper/Common.helper";
import { ResponseEnum } from "@Helper/Enum/ResponseEnum";
import { EmailService } from "../Services/Email.service";
import { EmailAIService } from "../Services/EmailAI.service";
import { EmailImapService } from "../Services/EmailImap.service";
import { EmailAccountConfigModel } from "../Models/EmailAccountConfig.model";
import { SendEmailModel } from "../Models/SendEmail.model";

@Controller({ path: "Email", version: "1" })
@ApiTags("Email Automation")
export class EmailController extends AuthBaseController {
  constructor(
    private readonly emailService: EmailService,
    private readonly emailAiService: EmailAIService,
    private readonly emailImapService: EmailImapService
  ) {
    super();
  }

  @Get("Config")
  async getConfig(@Headers("x-tenant-id") headerTenantId?: string) {
    const config = await this.emailService.getConfig(headerTenantId || "default");
    return this.SendResponseData(config);
  }

  @Post("Config")
  async saveConfig(
    @Body() body: EmailAccountConfigModel,
    @CurrentUser() userId: string,
    @Headers("x-tenant-id") headerTenantId?: string
  ) {
    if (headerTenantId && headerTenantId !== "all") {
      body.tenant_id = headerTenantId;
    }
    const result = await this.emailService.saveConfig(body, userId);
    return this.SendResponse(ResponseEnum.Success, ResponseEnum.Saved, result);
  }

  @Post("Test-Connection")
  async testConnection(@Body() body: EmailAccountConfigModel) {
    const result = await this.emailService.testConnection(body);
    return this.SendResponse(ResponseEnum.Success, "Email connection verified successfully", result);
  }

  // --- Google OAuth 2.0 Integration Endpoints ---

  @Get("OAuth/AuthUrl")
  getGoogleAuthUrl(@Query("redirectUri") redirectUri?: string) {
    const res = this.emailService.getGoogleAuthUrl(redirectUri);
    return this.SendResponseData(res);
  }

  @Post("OAuth/Connect")
  async connectGoogle(
    @Body() body: { code: string; redirectUri?: string },
    @CurrentUser() userId: string,
    @Headers("x-tenant-id") headerTenantId?: string
  ) {
    const activeTenant = (headerTenantId && headerTenantId !== "all") ? headerTenantId : "646b4abe-e6de-401b-ba33-46884bf3f6e6";
    const result = await this.emailService.connectGoogleAccount(body.code, body.redirectUri, userId, activeTenant);
    return this.SendResponse(ResponseEnum.Success, ResponseEnum.Saved, result);
  }

  @Get("OAuth/Status")
  async getOAuthStatus(@Headers("x-tenant-id") headerTenantId?: string) {
    const activeTenant = (headerTenantId && headerTenantId !== "all") ? headerTenantId : "default";
    const status = await this.emailService.getOAuthStatus(activeTenant);
    return this.SendResponseData(status);
  }

  @Post("OAuth/Disconnect")
  async disconnectGoogle(
    @CurrentUser() userId: string,
    @Headers("x-tenant-id") headerTenantId?: string
  ) {
    const activeTenant = (headerTenantId && headerTenantId !== "all") ? headerTenantId : "default";
    const result = await this.emailService.disconnectGoogleAccount(activeTenant, userId);
    return this.SendResponse(ResponseEnum.Success, ResponseEnum.Deleted, result);
  }

  // --- Lead AI Assistant & Direct Send Endpoints ---

  @Post("Lead/AiDraft")
  async generateLeadDraft(
    @Body() body: { lead_id: string; customPrompt?: string; intent?: string }
  ) {
    const draft = await this.emailAiService.generateLeadFollowupDraft(
      body.lead_id,
      body.customPrompt,
      body.intent
    );
    return this.SendResponseData(draft);
  }

  @Post("Lead/Send")
  async sendLeadEmail(
    @Body() body: { lead_id: string; to: string; subject: string; html: string; isAiDrafted?: boolean },
    @CurrentUser() userId: string
  ) {
    const sendDto: SendEmailModel = {
      to: body.to,
      subject: body.subject,
      html: body.html,
      lead_id: body.lead_id,
    };
    const result = await this.emailService.sendEmail(sendDto, userId, body.isAiDrafted ?? false);
    return this.SendResponse(ResponseEnum.Success, ResponseEnum.Mail, result);
  }

  // --- General Email Sending & Inbox ---

  @Post("Validate")
  async validateEmail(@Body("email") email: string) {
    const result = await this.emailService.validateEmail(email);
    return this.SendResponseData(result);
  }

  @Post("Send")
  async sendEmail(@Body() body: SendEmailModel, @CurrentUser() userId: string) {
    const result = await this.emailService.sendEmail(body, userId);
    return this.SendResponse(ResponseEnum.Success, ResponseEnum.Mail, result);
  }

  @Get("Inbox")
  async getInbox(@Headers("x-tenant-id") headerTenantId?: string) {
    const activeTenant = (headerTenantId && headerTenantId !== "all") ? headerTenantId : "default";
    const logs = await this.emailService.getInboxLogs(activeTenant);
    return this.SendResponseData(logs);
  }

  @Post("Sync")
  async syncInbox() {
    const result = await this.emailImapService.pollInbox();
    return this.SendResponseData(result);
  }

  @Get("Thread/:identifier")
  async getThread(@Param("identifier") identifier: string) {
    const thread = await this.emailService.getThread(identifier);
    return this.SendResponseData(thread);
  }
}
