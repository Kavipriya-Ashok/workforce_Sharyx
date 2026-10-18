import { BaseModel } from "@Model/Base.model";
export declare class WhatsAppCampaignModel extends BaseModel {
    name: string;
    template_name: string;
    description?: string;
    trigger_event?: string;
    delay_minutes?: number;
    is_active?: boolean;
    recipients?: string[];
    scheduled_at?: Date;
}
