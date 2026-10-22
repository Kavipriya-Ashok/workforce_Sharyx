import { IVoiceProvider } from "../Interfaces/IVoiceProvider";
import { VapiProvider } from "../Providers/Vapi.provider";
import { RetellProvider } from "../Providers/Retell.provider";
import { BlandProvider } from "../Providers/Bland.provider";
import { SaasFallbackProvider } from "../Providers/SaasFallback.provider";
import { VoiceProviderType } from "@Database/Table/Voice/VoiceProviderConfig.entity";
export declare class VoiceFactoryService {
    private readonly vapi;
    private readonly retell;
    private readonly bland;
    private readonly saasFallback;
    private readonly logger;
    constructor(vapi: VapiProvider, retell: RetellProvider, bland: BlandProvider, saasFallback: SaasFallbackProvider);
    getProvider(providerName?: string): IVoiceProvider;
    getAllProviders(): {
        id: VoiceProviderType;
        name: string;
        description: string;
    }[];
}
