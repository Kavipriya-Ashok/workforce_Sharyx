import { EncryptionService } from './Encryption.service';
import { Attachment } from 'nodemailer/lib/mailer';
interface SendMailData {
    to: string;
    subject: string;
    template: string;
    context: {};
    html: boolean;
    bcc?: string[];
    attachments?: Attachment[] | undefined;
}
export declare class MailerService {
    private readonly _EncryptionService;
    private readonly logger;
    constructor(_EncryptionService: EncryptionService);
    private Configuration;
    SendMail(_SendMailData: SendMailData): Promise<{
        status: boolean;
        message: any;
    }>;
}
export {};
