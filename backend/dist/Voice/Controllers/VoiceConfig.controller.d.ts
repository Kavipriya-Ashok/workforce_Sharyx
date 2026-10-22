import { VoiceConfigService, SaveVoiceConfigDto } from "../Services/VoiceConfig.service";
import { VoiceProviderType } from "@Database/Table/Voice/VoiceProviderConfig.entity";
export declare class VoiceConfigController {
    private readonly configService;
    constructor(configService: VoiceConfigService);
    getConfigs(tenantId?: string): Promise<{
        ok: boolean;
        data: Record<VoiceProviderType, import("../Services/VoiceConfig.service").MaskedVoiceConfig>;
    }>;
    saveConfig(tenantId: string | undefined, body: SaveVoiceConfigDto): Promise<{
        ok: boolean;
        data: import("../Services/VoiceConfig.service").MaskedVoiceConfig;
    }>;
    activateProvider(tenantId: string | undefined, provider: VoiceProviderType): Promise<{
        ok: boolean;
        activeProvider: VoiceProviderType;
    }>;
    disconnectProvider(tenantId: string | undefined, provider: VoiceProviderType): Promise<{
        ok: boolean;
        disconnectedProvider: VoiceProviderType;
    }>;
    testConnection(tenantId: string | undefined, body: {
        provider: VoiceProviderType;
        apiKey?: string;
    }): Promise<{
        ok: boolean;
        message: string;
        latencyMs: number;
        details?: any;
    }>;
}
