import { Injectable, Logger } from "@nestjs/common";
import { IVoiceProvider } from "../Interfaces/IVoiceProvider";
import { VapiProvider } from "../Providers/Vapi.provider";
import { RetellProvider } from "../Providers/Retell.provider";
import { BlandProvider } from "../Providers/Bland.provider";
import { SaasFallbackProvider } from "../Providers/SaasFallback.provider";
import { VoiceProviderType } from "@Database/Table/Voice/VoiceProviderConfig.entity";

@Injectable()
export class VoiceFactoryService {
  private readonly logger = new Logger(VoiceFactoryService.name);

  constructor(
    private readonly vapi: VapiProvider,
    private readonly retell: RetellProvider,
    private readonly bland: BlandProvider,
    private readonly saasFallback: SaasFallbackProvider
  ) {}

  getProvider(providerName?: string): IVoiceProvider {
    const key = (providerName || "vapi").toLowerCase().trim() as VoiceProviderType;
    switch (key) {
      case "vapi":
        return this.vapi;
      case "retell":
        return this.retell;
      case "bland":
        return this.bland;
      case "saas_fallback":
        return this.saasFallback;
      default:
        this.logger.warn(`Unknown voice provider "${providerName}", defaulting to Vapi`);
        return this.vapi;
    }
  }

  getAllProviders(): { id: VoiceProviderType; name: string; description: string }[] {
    return [
      {
        id: "vapi",
        name: "Vapi.ai",
        description: "Ultra-low latency conversational AI with WebRTC & SIP telephony",
      },
      {
        id: "retell",
        name: "Retell AI",
        description: "High-naturalness conversational voice engine with built-in turn-taking",
      },
      {
        id: "bland",
        name: "Bland AI",
        description: "Scalable phone call infrastructure with fast prompt-driven conversational agents",
      },
      {
        id: "saas_fallback",
        name: "Sharyx SaaS Telephony",
        description: "Dedicated PBX trunk fallback for high-volume automated campaigns",
      },
    ];
  }
}
