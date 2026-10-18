import { BaseTable } from "../BaseTable";
export declare class EmailLog extends BaseTable {
    tenant_id: string;
    lead_id: string;
    from_email: string;
    to_email: string;
    subject: string;
    body_text: string;
    body_html: string;
    direction: string;
    delivery_status: string;
    is_ai_drafted: boolean;
    message_id: string;
}
