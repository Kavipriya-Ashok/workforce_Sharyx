import { VoiceAgent } from "@Database/Table/Voice/VoiceAgent.entity";
import { VoiceFactoryService } from "./VoiceFactory.service";
import { CreateVoiceAgentDto, UpdateVoiceAgentDto } from "../Interfaces/VoiceTypes";
export declare class VoiceAgentService {
    private readonly factory;
    private readonly logger;
    constructor(factory: VoiceFactoryService);
    list(tenantId?: string): Promise<VoiceAgent[]>;
    syncFromProvider(providerName?: string, tenantId?: string): Promise<VoiceAgent[]>;
    getOne(id: string, tenantId?: string): Promise<VoiceAgent>;
    create(dto: CreateVoiceAgentDto, tenantId?: string): Promise<VoiceAgent>;
    update(id: string, dto: UpdateVoiceAgentDto, tenantId?: string): Promise<VoiceAgent>;
    remove(id: string, tenantId?: string): Promise<boolean>;
    private seedDefaults;
}
