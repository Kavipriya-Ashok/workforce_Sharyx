import { EventEmitter2 } from "@nestjs/event-emitter";
import { VoiceCallLog } from "@Database/Table/Voice/VoiceCallLog.entity";
import { VoiceFactoryService } from "./VoiceFactory.service";
import { MakeVoiceCallDto, NormalizedVoiceWebhookResult } from "../Interfaces/VoiceTypes";
export declare class VoiceCallService {
    private readonly factory;
    private readonly events;
    private readonly logger;
    private recentCallDispatches;
    constructor(factory: VoiceFactoryService, events: EventEmitter2);
    handleVoiceCallRequest(event: {
        tenantId: string;
        phone: string;
        customerName?: string;
        reason?: string;
        leadId?: string;
        agentId?: string;
        agentKey?: string;
        scheduledType?: "demo" | "interview" | string;
        meetingSlot?: string;
        meetUrl?: string;
        firstMessage?: string;
        customVariables?: Record<string, any>;
    }): Promise<void>;
    private interpolatePrompt;
    dispatchCall(dto: MakeVoiceCallDto): Promise<VoiceCallLog>;
    handleWebhook(providerName: string, payload: any): Promise<NormalizedVoiceWebhookResult>;
    private forwardWebhookToExternal;
    getCallLogs(tenantId?: string, limit?: number, agentId?: string, skipSync?: boolean): Promise<VoiceCallLog[]>;
    getCallLogsLegacy(tenantId?: string, limit?: number): Promise<VoiceCallLog[]>;
    syncCallLogsFromVapi(tenantId?: string): Promise<number>;
    syncCallLogsFromSaas(tenantId?: string): Promise<number>;
    getCallStats(tenantId?: string): Promise<{
        totalCalls: number;
        completedCalls: number;
        avgDurationSeconds: number;
        completionRate: number;
    }>;
}
