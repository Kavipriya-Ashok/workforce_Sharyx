import { BaseModel } from "@Model/Base.model";
export declare class WhatsAppConfigModel extends BaseModel {
    tenant_id: string;
    phone_number: string;
    phone_number_id: string;
    waba_id?: string;
    access_token: string;
    verify_token?: string;
    provider?: string;
    api_url?: string;
    api_key?: string;
    is_connected?: boolean;
}
