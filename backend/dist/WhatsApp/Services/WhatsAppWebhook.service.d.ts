import { WhatsAppAIService } from "./WhatsAppAI.service";
import { WhatsAppService } from "./WhatsApp.service";
export declare class WhatsAppWebhookService {
    private readonly whatsAppService;
    private readonly aiService;
    private readonly logger;
    constructor(whatsAppService: WhatsAppService, aiService: WhatsAppAIService);
    verifyHandshake(mode: string, token: string, challenge: string): Promise<string | null>;
    processIncomingWebhook(body: any): Promise<{
        status: string;
        error?: undefined;
    } | {
        status: string;
        error: any;
    }>;
}
