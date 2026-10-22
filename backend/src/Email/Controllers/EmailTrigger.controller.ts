import { Body, Controller, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { AuthBaseController } from "@Controller/AuthBase.controller";
import { ResponseEnum } from "@Helper/Enum/ResponseEnum";
import { OutcomeTriggerService, TriggerContext } from "@Service/OutcomeTrigger.service";

@Controller({ path: "Email/Trigger", version: "1" })
@ApiTags("Email Outcome Trigger")
export class EmailTriggerController extends AuthBaseController {
  constructor(private readonly triggerService: OutcomeTriggerService) {
    super();
  }

  @Post("Execute")
  async executeTrigger(
    @Body()
    body: {
      channel: "whatsapp" | "email" | "both";
      event: string;
      context: TriggerContext;
    }
  ) {
    const result = await this.triggerService.executeTrigger(
      body.channel || "both",
      body.event,
      body.context
    );
    return this.SendResponse(ResponseEnum.Success, `Trigger executed`, result);
  }
}
