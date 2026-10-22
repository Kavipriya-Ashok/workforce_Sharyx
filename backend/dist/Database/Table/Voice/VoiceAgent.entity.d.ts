import { BaseTable } from "../BaseTable";
import { VoiceProviderType } from "./VoiceProviderConfig.entity";
export declare class VoiceAgent extends BaseTable {
    tenant_id: string;
    name: string;
    provider: VoiceProviderType;
    remote_agent_id: string;
    system_prompt: string;
    first_message: string;
    voice_id: string;
    voice_provider: string;
    llm_model: string;
    temperature: number;
    language: string;
    allowed_tools: string[];
    transfer_agent_id: string;
    transfer_phone_number: string;
    raw_provider_response: Record<string, any>;
}
