import { BadRequestException, Body, Controller, Get, Param, Post, Query, Headers } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { JWTAuthController } from "@Controller/JWTAuth.controller";
import { CurrentUser, CurrentTenant } from "@Helper/Common.helper";
import { ResponseEnum } from "@Helper/Enum/ResponseEnum";
import { EmailService } from "../Services/Email.service";
import { EmailAIService } from "../Services/EmailAI.service";
import { EmailImapService } from "../Services/EmailImap.service";
import { EmailAccountConfigModel } from "../Models/EmailAccountConfig.model";
import { SendEmailModel } from "../Models/SendEmail.model";

import { UseGuards, UsePipes } from "@nestjs/common";
import { strictPipes } from "@Helper/StrictValidation";
import { JwtAuthGuard } from "@Service/Auth/JwtAuthGuard.service";
import { TenantContextGuard } from "@Service/Auth/TenantContext.guard";
@UseGuards(JwtAuthGuard, TenantContextGuard)
@Controller({ path: "Email", version: "1" })
@ApiTags("Email Automation")
export class EmailController extends JWTAuthController {
  constructor(
    private readonly emailService: EmailService,
    private readonly emailAiService: EmailAIService,
    private readonly emailImapService: EmailImapService
  ) {
    super();
  }

  /** Safe shape only: flags + a hint, NEVER client_secret / smtp_password / access_token / refresh_token. */
  @Get("Config")
  async getConfig(@CurrentTenant() headerTenantId?: string) {
    const safe = await this.emailService.getSafeConfig(headerTenantId || "default");
    return this.SendResponseData(safe);
  }

  @Post("Config")
  @UsePipes(...strictPipes())
  async saveConfig(
    @Body() body: EmailAccountConfigModel,
    @CurrentUser() userId: string,
    @CurrentTenant() headerTenantId?: string
  ) {
    if (!headerTenantId || headerTenantId === "all") {
      throw new BadRequestException("Select a specific tenant to save its email settings.");
    }
    body.tenant_id = headerTenantId; // from the JWT, never from the body
    const saved = await this.emailService.saveConfig(body, userId);
    return this.SendResponse(ResponseEnum.Success, ResponseEnum.Saved, this.emailService.toSafeConfig(saved));
  }

  /**
   * Live handshake for the signed-in tenant: SMTP (sending) and IMAP (reading) are checked separately and both
   * results are saved to tenant_integration_status, on success AND on failure.
   */
  @Post("Test-Connection")
  @UsePipes(...strictPipes())
  async testConnection(
    @Body() body: EmailAccountConfigModel,
    @CurrentUser() userId: string,
    @CurrentTenant() headerTenantId?: string
  ) {
    const result = await this.emailService.testConnection(headerTenantId as string, userId, body);
    return this.SendResponse(ResponseEnum.Success, result.message, result);
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
    @CurrentTenant() headerTenantId?: string
  ) {
    if (!headerTenantId || headerTenantId === "all") {
      throw new BadRequestException("Select a specific tenant to connect a Google mailbox.");
    }
    const activeTenant = headerTenantId;
    const result = await this.emailService.connectGoogleAccount(body.code, body.redirectUri, userId, activeTenant);
    return this.SendResponse(ResponseEnum.Success, ResponseEnum.Saved, result);
  }

  @Get("OAuth/Status")
  async getOAuthStatus(@CurrentTenant() headerTenantId?: string) {
    const activeTenant = (headerTenantId && headerTenantId !== "all") ? headerTenantId : "default";
    const status = await this.emailService.getOAuthStatus(activeTenant);
    return this.SendResponseData(status);
  }

  @Post("OAuth/Disconnect")
  async disconnectGoogle(
    @CurrentUser() userId: string,
    @CurrentTenant() headerTenantId?: string
  ) {
    const activeTenant = (headerTenantId && headerTenantId !== "all") ? headerTenantId : "default";
    const result = await this.emailService.disconnectGoogleAccount(activeTenant, userId);
    return this.SendResponse(ResponseEnum.Success, ResponseEnum.Deleted, result);
  }

  // --- Lead AI Assistant & Direct Send Endpoints ---

  @Post("Lead/AiDraft")
  async generateLeadDraft(
    @Body() body: { lead_id: string; customPrompt?: string; intent?: string },
    @CurrentTenant() tenantId: string
  ) {
    const draft = await this.emailAiService.generateLeadFollowupDraft(
      body.lead_id,
      body.customPrompt,
      body.intent,
      tenantId
    );
    return this.SendResponseData(draft);
  }

  @Post("Lead/Send")
  async sendLeadEmail(
    @Body() body: { lead_id: string; to: string; subject: string; html: string; isAiDrafted?: boolean },
    @CurrentUser() userId: string,
    @CurrentTenant() tenantId: string
  ) {
    const sendDto: SendEmailModel = {
      to: body.to,
      subject: body.subject,
      html: body.html,
      lead_id: body.lead_id,
    };
    const result = await this.emailService.sendEmail(sendDto, userId, body.isAiDrafted ?? false, tenantId);
    return this.SendResponse(ResponseEnum.Success, ResponseEnum.Mail, result);
  }

  // --- General Email Sending & Inbox ---

  @Post("Validate")
  async validateEmail(@Body("email") email: string) {
    const result = await this.emailService.validateEmail(email);
    return this.SendResponseData(result);
  }

  @Post("Send")
  async sendEmail(@Body() body: SendEmailModel, @CurrentUser() userId: string, @CurrentTenant() tenantId: string) {
    const result = await this.emailService.sendEmail(body, userId, false, tenantId);
    return this.SendResponse(ResponseEnum.Success, ResponseEnum.Mail, result);
  }

  @Get("Inbox")
  async getInbox(@CurrentTenant() headerTenantId?: string) {
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
  async getThread(@Param("identifier") identifier: string, @CurrentTenant() tenantId: string) {
    const thread = await this.emailService.getThread(identifier, tenantId);
    return this.SendResponseData(thread);
  }
}
