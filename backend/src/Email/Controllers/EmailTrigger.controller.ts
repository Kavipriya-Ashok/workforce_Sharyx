import { Body, Controller, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { JWTAuthController } from "@Controller/JWTAuth.controller";
import { ResponseEnum } from "@Helper/Enum/ResponseEnum";
import { OutcomeTriggerService, TriggerContext } from "@Service/OutcomeTrigger.service";

import { UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "@Service/Auth/JwtAuthGuard.service";
import { TenantContextGuard } from "@Service/Auth/TenantContext.guard";
@UseGuards(JwtAuthGuard, TenantContextGuard)
@Controller({ path: "Email/Trigger", version: "1" })
@ApiTags("Email Outcome Trigger")
export class EmailTriggerController extends JWTAuthController {
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
