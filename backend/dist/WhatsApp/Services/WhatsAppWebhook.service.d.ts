import { EventEmitter2 } from "@nestjs/event-emitter";
import { WhatsAppAIService } from "./WhatsAppAI.service";
import { WhatsAppService } from "./WhatsApp.service";
export declare class WhatsAppWebhookService {
    private readonly whatsAppService;
    private readonly aiService;
    private readonly events;
    private readonly logger;
    private static readonly processedMetaIds;
    private static readonly phoneQueues;
    constructor(whatsAppService: WhatsAppService, aiService: WhatsAppAIService, events: EventEmitter2);
    verifyHandshake(mode: string, token: string, challenge: string): Promise<string | null>;
    processIncomingWebhook(body: any): Promise<{
        status: string;
        error: any;
    } | {
        status: string;
    }>;
    private processSingleCandidateMessage;
}
