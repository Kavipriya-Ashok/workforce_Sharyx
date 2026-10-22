import { IVoiceProvider } from "../Interfaces/IVoiceProvider";
import { CreateVoiceAgentDto, UpdateVoiceAgentDto, MakeVoiceCallDto, ProviderCallResponse, NormalizedVoiceWebhookResult } from "../Interfaces/VoiceTypes";
import { VoiceProviderConfig } from "@Database/Table/Voice/VoiceProviderConfig.entity";
export declare class BlandProvider implements IVoiceProvider {
    readonly providerName = "bland";
    private readonly logger;
    private getApiKey;
    private getFromNumber;
    private getWebhookUrl;
    createAgent(dto: CreateVoiceAgentDto, config?: VoiceProviderConfig): Promise<{
        remoteAgentId: string;
        raw: any;
    }>;
    updateAgent(remoteAgentId: string, dto: UpdateVoiceAgentDto, config?: VoiceProviderConfig): Promise<any>;
    deleteAgent(remoteAgentId: string, config?: VoiceProviderConfig): Promise<boolean>;
    makeCall(remoteAgentId: string, dto: MakeVoiceCallDto, config?: VoiceProviderConfig): Promise<ProviderCallResponse>;
    normalizeWebhook(payload: any): NormalizedVoiceWebhookResult;
}
