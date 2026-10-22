import { BaseTable } from "../BaseTable";
export declare class AiAgent extends BaseTable {
    tenant_id: string;
    agent_key: string;
    display_name: string;
    emoji: string;
    description: string;
    persona_prompt: string;
    knowledge: string;
    allowed_tools: string[];
    handoff_targets: string[];
    channels: string[];
    announce_handoff: boolean;
    handoff_message: string;
    fallback_message: string;
    llm_provider: string;
    llm_model: string;
    temperature: number;
    sort_order: number;
    is_active: boolean;
}
