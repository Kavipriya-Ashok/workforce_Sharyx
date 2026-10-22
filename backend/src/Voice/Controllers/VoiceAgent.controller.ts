import { Controller, Get, Post, Put, Delete, Body, Param, Query } from "@nestjs/common";
import { VoiceAgentService } from "../Services/VoiceAgent.service";
import { VoiceFactoryService } from "../Services/VoiceFactory.service";
import { CreateVoiceAgentDto, UpdateVoiceAgentDto } from "../Interfaces/VoiceTypes";

@Controller({ path: "Voice/Agents", version: "1" })
export class VoiceAgentController {
  constructor(
    private readonly agentService: VoiceAgentService,
    private readonly factory: VoiceFactoryService
  ) {}

  @Get()
  async list(@Query("tenantId") tenantId?: string) {
    const agents = await this.agentService.list(tenantId || "default");
    return { ok: true, data: agents };
  }

  @Get("providers")
  getProviders() {
    return { ok: true, data: this.factory.getAllProviders() };
  }

  @Post("sync-all")
  async syncAll(@Query("tenantId") tenantId?: string) {
    const agents = await this.agentService.list(tenantId || "default");
    return { ok: true, count: agents.length, data: agents };
  }

  @Post("sync/:provider")
  async syncFromProvider(@Param("provider") provider: string, @Query("tenantId") tenantId?: string) {
    const agents = await this.agentService.syncFromProvider(provider || "vapi", tenantId || "default");
    return { ok: true, count: agents.length, data: agents };
  }

  @Get(":id")
  async getOne(@Param("id") id: string, @Query("tenantId") tenantId?: string) {
    const agent = await this.agentService.getOne(id, tenantId || "default");
    return { ok: true, data: agent };
  }

  @Post()
  async create(@Body() body: CreateVoiceAgentDto) {
    const agent = await this.agentService.create(body, body.tenantId || "default");
    return { ok: true, data: agent };
  }

  @Put(":id")
  async update(@Param("id") id: string, @Body() body: UpdateVoiceAgentDto) {
    const agent = await this.agentService.update(id, body, body.tenantId || "default");
    return { ok: true, data: agent };
  }

  @Delete(":id")
  async remove(@Param("id") id: string, @Query("tenantId") tenantId?: string) {
    const deleted = await this.agentService.remove(id, tenantId || "default");
    return { ok: true, deleted };
  }
}
