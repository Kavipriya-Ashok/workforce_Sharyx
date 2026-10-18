import { OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { EncryptionService } from "@Service/Encryption.service";
import { EmailAIService } from "./EmailAI.service";
import { EmailService } from "./Email.service";
export declare class EmailImapService implements OnModuleInit, OnModuleDestroy {
    private readonly encryptionService;
    private readonly emailService;
    private readonly aiService;
    private readonly logger;
    private timer;
    private isPolling;
    constructor(encryptionService: EncryptionService, emailService: EmailService, aiService: EmailAIService);
    onModuleInit(): void;
    onModuleDestroy(): void;
    pollInbox(): Promise<void>;
}
