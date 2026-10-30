import { VoiceAgentService } from "../Services/VoiceAgent.service";
import { VoiceFactoryService } from "../Services/VoiceFactory.service";
import { CreateVoiceAgentDto, UpdateVoiceAgentDto } from "../Interfaces/VoiceTypes";
export declare class VoiceAgentController {
    private readonly agentService;
    private readonly factory;
    constructor(agentService: VoiceAgentService, factory: VoiceFactoryService);
    list(tenantId?: string): Promise<{
        ok: boolean;
        data: import("../../Database/Table/Voice/VoiceAgent.entity").VoiceAgent[];
    }>;
    getProviders(): {
        ok: boolean;
        data: {
            id: import("../../Database/Table/Voice/VoiceProviderConfig.entity").VoiceProviderType;
            name: string;
            description: string;
        }[];
    };
    syncAll(tenantId?: string): Promise<{
        ok: boolean;
        count: number;
        data: import("../../Database/Table/Voice/VoiceAgent.entity").VoiceAgent[];
    }>;
    deployWorkforceTeam(tenantId?: string, body?: {
        provider?: string;
    }): Promise<{
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
        data: import("../../Database/Table/Voice/VoiceAgent.entity").VoiceAgent[];
    }>;
    deployToVapi(tenantId?: string): Promise<{
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
        data: import("../../Database/Table/Voice/VoiceAgent.entity").VoiceAgent[];
    }>;
    syncFromProvider(provider: string, tenantId?: string): Promise<{
        ok: boolean;
        count: number;
        data: import("../../Database/Table/Voice/VoiceAgent.entity").VoiceAgent[];
    }>;
    getCatalog(provider?: string, tenantId?: string): Promise<{
        ok: boolean;
        data: {
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
        }[];
    }>;
    enableCatalogAgent(key: string, body?: {
        provider?: string;
        tenantId?: string;
    }): Promise<{
        ok: boolean;
        agent: import("../../Database/Table/Voice/VoiceAgent.entity").VoiceAgent;
    }>;
    disableCatalogAgent(key: string, body?: {
        provider?: string;
        tenantId?: string;
    }): Promise<{
        ok: boolean;
        agent: import("../../Database/Table/Voice/VoiceAgent.entity").VoiceAgent;
        message?: undefined;
    } | {
        ok: boolean;
        message: string;
        agent?: undefined;
    }>;
    enableAllCatalogAgents(body?: {
        provider?: string;
        tenantId?: string;
    }): Promise<{
        ok: boolean;
        provider: string;
        results: any[];
    }>;
    disableAllCatalogAgents(body?: {
        provider?: string;
        tenantId?: string;
    }): Promise<{
        ok: boolean;
        provider: string;
        results: any[];
    }>;
    getOne(id: string, tenantId?: string): Promise<{
        ok: boolean;
        data: import("../../Database/Table/Voice/VoiceAgent.entity").VoiceAgent;
    }>;
    create(body: CreateVoiceAgentDto): Promise<{
        ok: boolean;
        data: import("../../Database/Table/Voice/VoiceAgent.entity").VoiceAgent;
    }>;
    update(id: string, body: UpdateVoiceAgentDto): Promise<{
        ok: boolean;
        data: import("../../Database/Table/Voice/VoiceAgent.entity").VoiceAgent;
    }>;
    remove(id: string, tenantId?: string): Promise<{
        ok: boolean;
        deleted: boolean;
    }>;
}
