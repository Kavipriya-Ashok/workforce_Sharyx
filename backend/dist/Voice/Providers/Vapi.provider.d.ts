import { IVoiceProvider } from "../Interfaces/IVoiceProvider";
import { CreateVoiceAgentDto, UpdateVoiceAgentDto, MakeVoiceCallDto, ProviderCallResponse, NormalizedVoiceWebhookResult } from "../Interfaces/VoiceTypes";
import { VoiceProviderConfig } from "@Database/Table/Voice/VoiceProviderConfig.entity";
export declare class VapiProvider implements IVoiceProvider {
    readonly providerName = "vapi";
    private readonly logger;
    private getApiKey;
    private getPhoneNumberId;
    private getWebhookUrl;
    createAgent(dto: CreateVoiceAgentDto, config?: VoiceProviderConfig): Promise<{
        remoteAgentId: string;
        raw: any;
    }>;
    listRemoteAgents(config?: VoiceProviderConfig): Promise<any[]>;
    updateAgent(remoteAgentId: string, dto: UpdateVoiceAgentDto, config?: VoiceProviderConfig): Promise<any>;
    deleteAgent(remoteAgentId: string, config?: VoiceProviderConfig): Promise<boolean>;
    makeCall(remoteAgentId: string, dto: MakeVoiceCallDto, config?: VoiceProviderConfig): Promise<ProviderCallResponse>;
    normalizeWebhook(payload: any): NormalizedVoiceWebhookResult;
}
