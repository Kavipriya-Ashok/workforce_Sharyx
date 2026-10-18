import { BaseModel } from "@Model/Base.model";
export declare class EmailCampaignModel extends BaseModel {
    campaign_name: string;
    subject: string;
    html_template: string;
    recipients: string[];
}
