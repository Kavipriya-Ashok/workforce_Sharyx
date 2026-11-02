import { Controller, Get, Post, Put, Delete, Body, Param, Query, Headers } from "@nestjs/common";
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
  async list(
    @Query("tenantId") queryTenantId?: string,
    @Headers("x-tenant-id") headerTenantId?: string
  ) {
    const activeTenant = headerTenantId || queryTenantId || "default";
    const agents = await this.agentService.list(activeTenant);
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

  @Post("deploy-workforce-team")
  async deployWorkforceTeam(
    @Query("tenantId") tenantId?: string,
    @Body() body?: { provider?: string }
  ) {
    const result = await this.agentService.deployWorkforceTeam(
      tenantId || "default",
      body?.provider
    );
    return result;
  }

  @Post("deploy-to-vapi")
  async deployToVapi(@Query("tenantId") tenantId?: string) {
    const result = await this.agentService.deployWorkforceTeam(
      tenantId || "default",
      "vapi"
    );
    return result;
  }

  @Post("sync/:provider")
  async syncFromProvider(@Param("provider") provider: string, @Query("tenantId") tenantId?: string) {
    const agents = await this.agentService.syncFromProvider(provider || "vapi", tenantId || "default");
    return { ok: true, count: agents.length, data: agents };
  }

  @Get("catalog")
  async getCatalog(
    @Query("provider") provider?: string,
    @Query("tenantId") tenantId?: string
  ) {
    const data = await this.agentService.getCatalog(provider || "vapi", tenantId || "default");
    return { ok: true, data };
  }

  @Post("catalog/:key/enable")
  async enableCatalogAgent(
    @Param("key") key: string,
    @Body() body?: { provider?: string; tenantId?: string }
  ) {
    const result = await this.agentService.enableCatalogAgent(
      key,
      body?.provider || "vapi",
      body?.tenantId || "default"
    );
    return result;
  }

  @Post("catalog/:key/disable")
  async disableCatalogAgent(
    @Param("key") key: string,
    @Body() body?: { provider?: string; tenantId?: string }
  ) {
    const result = await this.agentService.disableCatalogAgent(
      key,
      body?.provider || "vapi",
      body?.tenantId || "default"
    );
    return result;
  }

  @Post("catalog/enable-all")
  async enableAllCatalogAgents(
    @Body() body?: { provider?: string; tenantId?: string }
  ) {
    const result = await this.agentService.enableAllCatalogAgents(
      body?.provider || "vapi",
      body?.tenantId || "default"
    );
    return result;
  }

  @Post("catalog/disable-all")
  async disableAllCatalogAgents(
    @Body() body?: { provider?: string; tenantId?: string }
  ) {
    const result = await this.agentService.disableAllCatalogAgents(
      body?.provider || "vapi",
      body?.tenantId || "default"
    );
    return result;
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
