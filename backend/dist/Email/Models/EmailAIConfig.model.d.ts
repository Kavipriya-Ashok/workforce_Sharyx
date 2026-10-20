import { BaseModel } from "@Model/Base.model";
export declare class EmailAIConfigModel extends BaseModel {
    tenant_id: string;
    auto_reply_enabled: boolean;
    system_prompt?: string;
    tone: string;
    llm_provider?: string;
    llm_model?: string;
}
export declare class GenerateEmailAIDraftModel {
    from_email?: string;
    subject?: string;
    incoming_body?: string;
    lead_name?: string;
    conversation_history?: Array<{
        direction: string;
        body: string;
    }>;
    has_phone?: boolean;
    phone_number?: string;
    company_name?: string;
}
