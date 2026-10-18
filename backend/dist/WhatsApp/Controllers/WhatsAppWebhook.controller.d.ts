import { Response } from "express";
import { WhatsAppWebhookService } from "../Services/WhatsAppWebhook.service";
export declare class WhatsAppWebhookController {
    private readonly webhookService;
    private readonly logger;
    constructor(webhookService: WhatsAppWebhookService);
    verifyWebhook(mode: string, token: string, challenge: string, res: Response): Promise<Response<any, Record<string, any>>>;
    handleIncomingMessage(body: any): Promise<string>;
}
