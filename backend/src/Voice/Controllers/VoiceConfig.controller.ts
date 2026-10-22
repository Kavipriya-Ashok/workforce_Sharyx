import { Controller, Get, Post, Body, Query, Param } from "@nestjs/common";
import { VoiceConfigService, SaveVoiceConfigDto } from "../Services/VoiceConfig.service";
import { VoiceProviderType } from "@Database/Table/Voice/VoiceProviderConfig.entity";

@Controller({ path: "Voice/Config", version: "1" })
export class VoiceConfigController {
  constructor(private readonly configService: VoiceConfigService) {}

  @Get()
  async getConfigs(@Query("tenantId") tenantId?: string) {
    const data = await this.configService.getConfigs(tenantId || "default");
    return { ok: true, data };
  }

  @Post()
  async saveConfig(@Query("tenantId") tenantId: string | undefined, @Body() body: SaveVoiceConfigDto) {
    const data = await this.configService.saveConfig(tenantId || "default", body);
    return { ok: true, data };
  }

  @Post("activate/:provider")
  async activateProvider(
    @Query("tenantId") tenantId: string | undefined,
    @Param("provider") provider: VoiceProviderType
  ) {
    await this.configService.setActiveProvider(tenantId || "default", provider);
    return { ok: true, activeProvider: provider };
  }

  @Post("disconnect/:provider")
  async disconnectProvider(
    @Query("tenantId") tenantId: string | undefined,
    @Param("provider") provider: VoiceProviderType
  ) {
    await this.configService.disconnectProvider(tenantId || "default", provider);
    return { ok: true, disconnectedProvider: provider };
  }

  @Post("test")
  async testConnection(
    @Query("tenantId") tenantId: string | undefined,
    @Body() body: { provider: VoiceProviderType; apiKey?: string }
  ) {
    const result = await this.configService.testConnection(
      tenantId || "default",
      body.provider,
      body.apiKey
    );
    return { ok: result.ok, ...result };
  }
}
