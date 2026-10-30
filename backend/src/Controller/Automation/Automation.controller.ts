import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  VERSION_NEUTRAL,
  Req,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { RuleEngineService, DryRunPayload } from "@Service/Automation/RuleEngine.service";

@Controller({
  path: ["Automation", "api/Automation", "api/v1/Automation"],
  version: ["1", VERSION_NEUTRAL],
})
@ApiTags("Lead to Customer Conversion Automation")
export class AutomationController {
  constructor(private readonly ruleEngineService: RuleEngineService) {}

  @Get()
  async getRules(@Query("tenant_id") tenantId?: string) {
    return await this.ruleEngineService.getRules(tenantId || "default");
  }

  @Post()
  async createRule(@Body() body: any, @Req() req: any) {
    const userId = req.user?.id || "system";
    return await this.ruleEngineService.createRule(body, userId);
  }

  @Post("DryRunTest")
  async dryRunTest(@Body() body: DryRunPayload) {
    return await this.ruleEngineService.dryRunTest(body);
  }

  @Post("ConvertLead/:id")
  async convertLead(@Param("id") id: string, @Body() body: any) {
    return await this.ruleEngineService.convertLeadToCustomer(id, body);
  }

  @Post("SeedRules")
  async seedRules(@Query("tenant_id") tenantId?: string) {
    return await this.ruleEngineService.seedDefaultRules(tenantId || "default");
  }

  @Get(":id")
  async getRuleById(@Param("id") id: string) {
    return await this.ruleEngineService.getRuleById(id);
  }

  @Put(":id")
  async updateRule(@Param("id") id: string, @Body() body: any, @Req() req: any) {
    const userId = req.user?.id || "system";
    return await this.ruleEngineService.updateRule(id, body, userId);
  }

  @Delete(":id")
  async deleteRule(@Param("id") id: string) {
    return await this.ruleEngineService.deleteRule(id);
  }
}
