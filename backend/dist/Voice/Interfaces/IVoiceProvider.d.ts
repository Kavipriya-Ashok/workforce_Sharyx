import { CreateVoiceAgentDto, UpdateVoiceAgentDto, MakeVoiceCallDto, ProviderCallResponse, NormalizedVoiceWebhookResult } from "./VoiceTypes";
import { VoiceProviderConfig } from "@Database/Table/Voice/VoiceProviderConfig.entity";
export interface IVoiceProvider {
    readonly providerName: string;
    createAgent(dto: CreateVoiceAgentDto, config?: VoiceProviderConfig): Promise<{
        remoteAgentId: string;
        raw: any;
    }>;
    updateAgent(remoteAgentId: string, dto: UpdateVoiceAgentDto, config?: VoiceProviderConfig): Promise<any>;
    deleteAgent(remoteAgentId: string, config?: VoiceProviderConfig): Promise<boolean>;
    makeCall(remoteAgentId: string, dto: MakeVoiceCallDto, config?: VoiceProviderConfig): Promise<ProviderCallResponse>;
    normalizeWebhook(payload: any): NormalizedVoiceWebhookResult;
    listRemoteAgents?(config?: VoiceProviderConfig): Promise<any[]>;
}
