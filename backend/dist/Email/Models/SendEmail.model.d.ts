export declare class SendEmailModel {
    to: string;
    subject: string;
    html: string;
    lead_id?: string;
    bypassValidation?: boolean;
    threadId?: string;
    inReplyTo?: string;
    attachments?: Array<{
        filename: string;
        content: Buffer | string;
        contentType?: string;
    }>;
}
