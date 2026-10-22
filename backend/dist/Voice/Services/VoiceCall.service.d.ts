import { EventEmitter2 } from "@nestjs/event-emitter";
import { VoiceCallLog } from "@Database/Table/Voice/VoiceCallLog.entity";
import { VoiceFactoryService } from "./VoiceFactory.service";
import { MakeVoiceCallDto, NormalizedVoiceWebhookResult } from "../Interfaces/VoiceTypes";
export declare class VoiceCallService {
    private readonly factory;
    private readonly events;
    private readonly logger;
    constructor(factory: VoiceFactoryService, events: EventEmitter2);
    handleVoiceCallRequest(event: {
        tenantId: string;
        phone: string;
        customerName?: string;
        reason?: string;
        leadId?: string;
    }): Promise<void>;
    private interpolatePrompt;
    dispatchCall(dto: MakeVoiceCallDto): Promise<VoiceCallLog>;
    handleWebhook(providerName: string, payload: any): Promise<NormalizedVoiceWebhookResult>;
    private forwardWebhookToExternal;
    getCallLogs(tenantId?: string, limit?: number): Promise<VoiceCallLog[]>;
    getCallStats(tenantId?: string): Promise<{
        totalCalls: number;
        completedCalls: number;
        avgDurationSeconds: number;
        completionRate: number;
    }>;
}
