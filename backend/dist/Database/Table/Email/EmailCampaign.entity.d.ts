import { BaseTable } from "../BaseTable";
export declare class EmailCampaign extends BaseTable {
    tenant_id: string;
    campaign_name: string;
    subject: string;
    html_template: string;
    recipients_count: number;
    sent_count: number;
    opened_count: number;
    campaign_status: string;
    trigger_event: string;
    is_active: boolean;
    delay_seconds: number;
    outcome_filter: string;
    recipient_type: string;
    attach_pdf: boolean;
    pdf_template_type: string;
    pdf_title: string;
}
