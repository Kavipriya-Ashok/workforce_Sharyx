import { VoiceCallService } from "../Services/VoiceCall.service";
export declare class VoiceWebhookController {
    private readonly callService;
    constructor(callService: VoiceCallService);
    handleWebhook(provider: string, body: any): Promise<{
        ok: boolean;
        received: boolean;
        callId: string;
    }>;
}
