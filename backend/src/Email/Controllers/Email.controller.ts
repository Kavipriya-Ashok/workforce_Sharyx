import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { AuthBaseController } from "@Controller/AuthBase.controller";
import { CurrentUser } from "@Helper/Common.helper";
import { ResponseEnum } from "@Helper/Enum/ResponseEnum";
import { EmailService } from "../Services/Email.service";
import { EmailAccountConfigModel } from "../Models/EmailAccountConfig.model";
import { SendEmailModel } from "../Models/SendEmail.model";

@Controller({ path: "Email", version: "1" })
@ApiTags("Email Automation")
export class EmailController extends AuthBaseController {
  constructor(private readonly emailService: EmailService) {
    super();
  }

  @Get("Config")
  async getConfig() {
    const config = await this.emailService.getConfig();
    return this.SendResponseData(config);
  }

  @Post("Config")
  async saveConfig(@Body() body: EmailAccountConfigModel, @CurrentUser() userId: string) {
    const result = await this.emailService.saveConfig(body, userId);
    return this.SendResponse(ResponseEnum.Success, ResponseEnum.Saved, result);
  }

  @Post("Send")
  async sendEmail(@Body() body: SendEmailModel, @CurrentUser() userId: string) {
    const result = await this.emailService.sendEmail(body, userId);
    return this.SendResponse(ResponseEnum.Success, ResponseEnum.Mail, result);
  }

  @Get("Inbox")
  async getInbox() {
    const logs = await this.emailService.getInboxLogs();
    return this.SendResponseData(logs);
  }

  @Get("Thread/:identifier")
  async getThread(@Param("identifier") identifier: string) {
    const thread = await this.emailService.getThread(identifier);
    return this.SendResponseData(thread);
  }
}
