export type AgentKey = "receptionist" | "sales" | "appointment" | "support" | "recruitment";
export interface DefaultAgentDef {
    agent_key: AgentKey;
    display_name: string;
    emoji: string;
    description: string;
    persona_prompt: string;
    knowledge: string;
    allowed_tools: string[];
    handoff_targets: string[];
    handoff_message: string;
    fallback_message: string;
    llm_provider?: string;
    llm_model?: string;
    temperature: number;
    sort_order: number;
}
export declare const AGENT_TOOL_DOCS: Record<string, string>;
export declare const DEFAULT_AGENTS: DefaultAgentDef[];
