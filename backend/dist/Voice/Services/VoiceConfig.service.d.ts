import { VoiceProviderType } from "@Database/Table/Voice/VoiceProviderConfig.entity";
export interface SaveVoiceConfigDto {
    provider: VoiceProviderType;
    api_key?: string;
    phone_number_id?: string;
    caller_id?: string;
    base_url?: string;
    webhook_forward_url?: string;
    is_active?: boolean;
    metadata?: Record<string, any>;
}
export interface MaskedVoiceConfig {
    provider: VoiceProviderType;
    has_key: boolean;
    masked_key?: string;
    phone_number_id?: string;
    caller_id?: string;
    base_url?: string;
    webhook_forward_url?: string;
    is_active: boolean;
    metadata?: Record<string, any>;
    updated_on?: Date;
}
export declare class VoiceConfigService {
    private readonly logger;
    private maskKey;
    getConfigs(tenantId?: string): Promise<Record<VoiceProviderType, MaskedVoiceConfig>>;
    saveConfig(tenantId: string, dto: SaveVoiceConfigDto): Promise<MaskedVoiceConfig>;
    setActiveProvider(tenantId: string, provider: VoiceProviderType): Promise<void>;
    disconnectProvider(tenantId: string, provider: VoiceProviderType): Promise<void>;
    testConnection(tenantId: string, provider: VoiceProviderType, candidateKey?: string): Promise<{
        ok: boolean;
        message: string;
        latencyMs: number;
        details?: any;
    }>;
}
