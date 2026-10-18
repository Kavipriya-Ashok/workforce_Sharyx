import { Body, Controller, Get, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { AuthBaseController } from "@Controller/AuthBase.controller";
import { CurrentUser } from "@Helper/Common.helper";
import { ResponseEnum } from "@Helper/Enum/ResponseEnum";
import { WhatsAppAIService } from "../Services/WhatsAppAI.service";
import { WhatsAppAIConfigModel } from "../Models/WhatsAppAIConfig.model";

@Controller({ path: "WhatsApp/AI", version: "1" })
@ApiTags("WhatsApp AI")
export class WhatsAppAIController extends AuthBaseController {
  constructor(private readonly aiService: WhatsAppAIService) {
    super();
  }

  @Get("Config")
  async getConfig() {
    const config = await this.aiService.getConfig();
    return this.SendResponseData(config);
  }

  @Post("Config")
  async saveConfig(@Body() body: WhatsAppAIConfigModel, @CurrentUser() userId: string) {
    const config = await this.aiService.saveConfig(body, userId);
    return this.SendResponse(ResponseEnum.Success, ResponseEnum.Saved, config);
  }
}
