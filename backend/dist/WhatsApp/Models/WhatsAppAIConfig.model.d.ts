import { BaseModel } from "@Model/Base.model";
export declare class WhatsAppAIConfigModel extends BaseModel {
    tenant_id: string;
    is_ai_enabled: boolean;
    ai_mode: string;
    system_prompt?: string;
    welcome_message?: string;
    fallback_message?: string;
    llm_provider?: string;
    llm_model?: string;
    api_key?: string;
    auto_followup_enabled?: boolean;
    followup_delay_minutes?: number;
    followup_message?: string;
    stop_words?: string[];
}
