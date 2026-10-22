export interface LlmConfig {
    provider?: string;
    model?: string;
    apiKey?: string;
    temperature?: number;
}
export interface LlmMessage {
    role: "user" | "assistant";
    content: string;
}
export declare class AgentLlmService {
    private readonly logger;
    private resolve;
    isAvailable(cfg?: LlmConfig): boolean;
    completeJson<T = any>(systemPrompt: string, history: LlmMessage[], userMessage: string, cfg?: LlmConfig): Promise<T | null>;
    private parse;
}
