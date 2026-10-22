import { BaseTable } from "../BaseTable";
export declare class WhatsAppCampaign extends BaseTable {
    tenant_id: string;
    name: string;
    description: string;
    trigger_event: string;
    template_name: string;
    delay_minutes: number;
    is_active: boolean;
    total_recipients: number;
    sent_count: number;
    delivered_count: number;
    read_count: number;
    campaign_status: string;
    scheduled_at: Date;
    outcome_filter: string;
    attach_pdf: boolean;
    pdf_template_type: string;
    pdf_title: string;
}
