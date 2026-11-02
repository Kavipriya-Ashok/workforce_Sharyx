import { EventEmitter2 } from "@nestjs/event-emitter";
import { VoiceCallLog } from "@Database/Table/Voice/VoiceCallLog.entity";
import { VoiceFactoryService } from "./VoiceFactory.service";
import { MakeVoiceCallDto, NormalizedVoiceWebhookResult } from "../Interfaces/VoiceTypes";
import { AgentLlmService } from "../../AgentOrchestrator/Services/AgentLlm.service";
export declare class VoiceCallService {
    private readonly factory;
    private readonly events;
    private readonly llm;
    private readonly logger;
    private recentCallDispatches;
    constructor(factory: VoiceFactoryService, events: EventEmitter2, llm: AgentLlmService);
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
    generateSpokenCallSummary(params: {
        customerName: string;
        agentName: string;
        role?: string;
        slot?: string;
        meetUrl?: string;
        chatSummary?: string;
        emailSummary?: string;
        isInterview: boolean;
        language?: string;
    }): Promise<{
        spokenFirstSentence: string;
        inCallTalkingPoints: string[];
    } | null>;
    private interpolatePrompt;
    dispatchCall(dto: MakeVoiceCallDto): Promise<VoiceCallLog>;
    private lastVapiSyncTime;
    private pollVapiCallCompletion;
    private analyzeCallTranscript;
    handleWebhook(providerName: string, payload: any): Promise<NormalizedVoiceWebhookResult>;
    private syncCallOutcomeToLeadAndTriggerAutomation;
    private forwardWebhookToExternal;
    getCallLogs(tenantId?: string, limit?: number, agentId?: string, skipSync?: boolean): Promise<VoiceCallLog[]>;
    getCallLogsLegacy(tenantId?: string, limit?: number): Promise<VoiceCallLog[]>;
    syncCallLogsFromVapi(tenantId?: string, force?: boolean): Promise<number>;
    syncCallLogsFromSaas(tenantId?: string): Promise<number>;
    streamCallAudio(callId?: string, providerCallId?: string, tenantId?: string, res?: any): Promise<any>;
    getCallStats(tenantId?: string): Promise<{
        totalCalls: number;
        completedCalls: number;
        avgDurationSeconds: number;
        completionRate: number;
    }>;
}
