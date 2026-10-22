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
    syncFromProvider(provider: string, tenantId?: string): Promise<{
        ok: boolean;
        count: number;
        data: import("../../Database/Table/Voice/VoiceAgent.entity").VoiceAgent[];
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
