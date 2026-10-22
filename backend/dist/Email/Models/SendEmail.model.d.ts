export declare class SendEmailModel {
    to: string;
    subject: string;
    html: string;
    lead_id?: string;
    bypassValidation?: boolean;
    attachments?: Array<{
        filename: string;
        content: Buffer | string;
        contentType?: string;
    }>;
}
