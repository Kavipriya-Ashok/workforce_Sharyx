import { BaseTable } from "../BaseTable";
export type VoiceProviderType = "vapi" | "retell" | "bland" | "saas_fallback";
export declare class VoiceProviderConfig extends BaseTable {
    tenant_id: string;
    provider: VoiceProviderType;
    api_key: string;
    phone_number_id: string;
    caller_id: string;
    base_url: string;
    metadata: Record<string, any>;
    is_active: boolean;
}
