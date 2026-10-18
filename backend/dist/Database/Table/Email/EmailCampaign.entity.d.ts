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
}
