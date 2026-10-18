import { BaseTable } from "../BaseTable";
export declare class EmailAIConfig extends BaseTable {
    tenant_id: string;
    auto_reply_enabled: boolean;
    system_prompt: string;
    tone: string;
    llm_provider: string;
    llm_model: string;
}
