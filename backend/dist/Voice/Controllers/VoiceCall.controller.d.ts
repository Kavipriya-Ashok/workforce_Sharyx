import { VoiceCallService } from "../Services/VoiceCall.service";
import { MakeVoiceCallDto } from "../Interfaces/VoiceTypes";
export declare class VoiceCallController {
    private readonly callService;
    constructor(callService: VoiceCallService);
    dispatch(body: MakeVoiceCallDto): Promise<{
        ok: boolean;
        data: import("../../Database/Table/Voice/VoiceCallLog.entity").VoiceCallLog;
    }>;
    getLogs(tenantId?: string, limit?: string): Promise<{
        ok: boolean;
        data: import("../../Database/Table/Voice/VoiceCallLog.entity").VoiceCallLog[];
    }>;
    getStats(tenantId?: string): Promise<{
        ok: boolean;
        data: {
            totalCalls: number;
            completedCalls: number;
            avgDurationSeconds: number;
            completionRate: number;
        };
    }>;
}
