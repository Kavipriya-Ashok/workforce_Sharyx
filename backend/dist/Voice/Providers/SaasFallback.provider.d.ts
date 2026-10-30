import { IVoiceProvider } from "../Interfaces/IVoiceProvider";
import { CreateVoiceAgentDto, UpdateVoiceAgentDto, MakeVoiceCallDto, ProviderCallResponse, NormalizedVoiceWebhookResult } from "../Interfaces/VoiceTypes";
import { VoiceProviderConfig } from "@Database/Table/Voice/VoiceProviderConfig.entity";
export declare class SaasFallbackProvider implements IVoiceProvider {
    readonly providerName = "saas_fallback";
    private readonly logger;
    private tokenCache;
    private getBaseUrl;
    private getApiKey;
    private normalizeDestinationPhone;
    resolveCallerId(baseUrl: string, token: string | null, tenantId: string, destPhone: string, config?: VoiceProviderConfig): Promise<string>;
    getAuthToken(config?: VoiceProviderConfig): Promise<string | null>;
    listRemoteAgents(config?: VoiceProviderConfig): Promise<any[]>;
    private decodeJwt;
    createAgent(dto: CreateVoiceAgentDto, config?: VoiceProviderConfig): Promise<{
        remoteAgentId: string;
        raw: any;
    }>;
    updateAgent(remoteAgentId: string, dto: UpdateVoiceAgentDto, config?: VoiceProviderConfig): Promise<any>;
    deleteAgent(remoteAgentId: string, config?: VoiceProviderConfig): Promise<boolean>;
    makeCall(remoteAgentId: string, dto: MakeVoiceCallDto, config?: VoiceProviderConfig): Promise<ProviderCallResponse>;
    normalizeWebhook(payload: any): NormalizedVoiceWebhookResult;
}
