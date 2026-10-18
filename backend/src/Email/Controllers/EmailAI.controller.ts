import { Body, Controller, Get, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { AuthBaseController } from "@Controller/AuthBase.controller";
import { CurrentUser } from "@Helper/Common.helper";
import { ResponseEnum } from "@Helper/Enum/ResponseEnum";
import { EmailAIService } from "../Services/EmailAI.service";
import { EmailAIConfigModel, GenerateEmailAIDraftModel } from "../Models/EmailAIConfig.model";

@Controller({ path: "Email/AI", version: "1" })
@ApiTags("Email AI")
export class EmailAIController extends AuthBaseController {
  constructor(private readonly emailAiService: EmailAIService) {
    super();
  }

  @Get("Config")
  async getConfig() {
    const config = await this.emailAiService.getConfig();
    return this.SendResponseData(config);
  }

  @Post("Config")
  async saveConfig(@Body() body: EmailAIConfigModel, @CurrentUser() userId: string) {
    const config = await this.emailAiService.saveConfig(body, userId);
    return this.SendResponse(ResponseEnum.Success, ResponseEnum.Saved, config);
  }

  @Post("Draft")
  async generateDraft(@Body() body: GenerateEmailAIDraftModel) {
    const draft = await this.emailAiService.generateDraft(body);
    return this.SendResponseData(draft);
  }
}
