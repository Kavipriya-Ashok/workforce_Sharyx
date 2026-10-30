import { EventEmitter2 } from "@nestjs/event-emitter";
import { WhatsAppAIService } from "./WhatsAppAI.service";
import { WhatsAppService } from "./WhatsApp.service";
export declare class WhatsAppWebhookService {
    private readonly whatsAppService;
    private readonly aiService;
    private readonly events;
    private readonly logger;
    private static readonly processedMetaIds;
    constructor(whatsAppService: WhatsAppService, aiService: WhatsAppAIService, events: EventEmitter2);
    verifyHandshake(mode: string, token: string, challenge: string): Promise<string | null>;
    processIncomingWebhook(body: any): Promise<{
        status: string;
        error?: undefined;
    } | {
        status: string;
        error: any;
    }>;
}
