import { Body, Controller, Get, Param, Post, Put, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { AuthBaseController } from "@Controller/AuthBase.controller";
import { CurrentUser } from "@Helper/Common.helper";
import { ResponseEnum } from "@Helper/Enum/ResponseEnum";
import { AiAgentService } from "../Services/AiAgent.service";
import { AgentOrchestratorService } from "../Services/AgentOrchestrator.service";

@Controller({ path: "AiAgents", version: "1" })
@ApiTags("AI Multi-Agent")
export class AiAgentController extends AuthBaseController {
  constructor(
    private readonly agentService: AiAgentService,
    private readonly orchestrator: AgentOrchestratorService
  ) {
    super();
  }

  @Get()
  async list() {
    return this.SendResponseData(await this.agentService.list("default"));
  }

  @Put(":id")
  async update(@Param("id") id: string, @Body() body: any, @CurrentUser() userId: string) {
    const agent = await this.agentService.update(id, body, userId);
    return this.SendResponse(ResponseEnum.Success, ResponseEnum.Saved, agent);
  }

  @Post(":id/Reset")
  async reset(@Param("id") id: string) {
    const agent = await this.agentService.resetToDefault(id);
    return this.SendResponse(ResponseEnum.Success, ResponseEnum.Saved, agent);
  }

  @Get("Conversations")
  async states(@Query("channel") channel?: string) {
    return this.SendResponseData(await this.agentService.listStates("default", channel));
  }

  @Get("Conversations/:id/Handoffs")
  async handoffs(@Param("id") id: string) {
    return this.SendResponseData(await this.agentService.getHandoffs(id));
  }

  @Post("Conversations/:id/Takeover")
  async takeover(@Param("id") id: string, @Body() body: { takeover: boolean }) {
    const s = await this.agentService.setHumanTakeover(id, body?.takeover ?? true);
    return this.SendResponse(ResponseEnum.Success, ResponseEnum.Saved, s);
  }

  @Post("Conversations/:id/Assign")
  async assign(@Param("id") id: string, @Body() body: { agent_key: string }) {
    const s = await this.agentService.forceAgent(id, body.agent_key);
    return this.SendResponse(ResponseEnum.Success, ResponseEnum.Saved, s);
  }

  /** Playground: simulate a customer message without sending anything to WhatsApp/Email. */
  @Post("Simulate")
  async simulate(@Body() body: { channel?: "whatsapp" | "email"; session_id?: string; message: string; name?: string }) {
    const channel = body.channel || "whatsapp";
    const sessionId = body.session_id || "playground";
    const result = await this.orchestrator.handle({
      channel,
      tenantId: "default",
      conversationRef: `sim_${channel}_${sessionId}`,
      message: body.message,
      name: body.name || "Playground User",
      history: undefined,
    });
    return this.SendResponseData(result);
  }
}
