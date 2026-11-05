import { VoiceAgent } from "@Database/Table/Voice/VoiceAgent.entity";
import { VoiceFactoryService } from "./VoiceFactory.service";
import { CreateVoiceAgentDto, UpdateVoiceAgentDto } from "../Interfaces/VoiceTypes";
export declare class VoiceAgentService {
    private readonly factory;
    private readonly logger;
    constructor(factory: VoiceFactoryService);
    list(tenantId: string): Promise<VoiceAgent[]>;
    syncFromProvider(providerName?: string, tenantId?: string): Promise<VoiceAgent[]>;
    getOne(id: string, tenantId?: string): Promise<VoiceAgent>;
    create(dto: CreateVoiceAgentDto, tenantId?: string): Promise<VoiceAgent>;
    update(id: string, dto: UpdateVoiceAgentDto, tenantId?: string): Promise<VoiceAgent>;
    remove(id: string, tenantId?: string): Promise<boolean>;
    static readonly WORKFORCE_5_VOICE_TEMPLATES: {
        key: string;
        name: string;
        role: string;
        system_prompt: string;
        first_message: string;
        voice_id_vapi: string;
        voice_id_saas: string;
        llm_model: string;
        temperature: number;
        allowed_tools: string[];
    }[];
    getCatalog(providerType?: string, tenantId?: string): Promise<{
        key: string;
        name: string;
        role: string;
        system_prompt: string;
        first_message: string;
        voice_id: string;
        voice_provider: string;
        llm_model: string;
        temperature: number;
        allowed_tools: string[];
        provider: string;
        is_enabled: boolean;
        agent_id: string;
        remote_agent_id: string;
        last_sync_error: string;
        status: string;
    }[]>;
    enableCatalogAgent(key: string, providerType?: string, tenantId?: string): Promise<{
        ok: boolean;
        agent: VoiceAgent;
    }>;
    disableCatalogAgent(key: string, providerType?: string, tenantId?: string): Promise<{
        ok: boolean;
        agent: VoiceAgent;
        message?: undefined;
    } | {
        ok: boolean;
        message: string;
        agent?: undefined;
    }>;
    enableAllCatalogAgents(providerType?: string, tenantId?: string): Promise<{
        ok: boolean;
        provider: string;
        results: any[];
    }>;
    disableAllCatalogAgents(providerType?: string, tenantId?: string): Promise<{
        ok: boolean;
        provider: string;
        results: any[];
    }>;
    deployWorkforceTeam(tenantId?: string, requestedProvider?: string): Promise<{
        ok: boolean;
        provider: string;
        providerLabel: string;
        configuredApi: {
            provider: string;
            providerLabel: string;
            apiKeyMasked: string;
            baseUrl: string;
            callerId: string;
            sttEngine: string;
            ttsEngine: string;
            llmEngine: string;
        };
        deployedCount: number;
        data: VoiceAgent[];
    }>;
    private seedDefaults;
}
