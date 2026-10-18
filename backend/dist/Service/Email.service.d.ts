import { MailerService } from './Mailer.service';
import { CommonService } from './Common.service';
export declare class EmailService {
    private readonly _MailerService;
    private readonly _CommonService;
    constructor(_MailerService: MailerService, _CommonService: CommonService);
    ForgotPassword(EmailId: string, ResetOTP: number, EncryptedUserId: string): Promise<{
        status: boolean;
        message: any;
    }>;
}
