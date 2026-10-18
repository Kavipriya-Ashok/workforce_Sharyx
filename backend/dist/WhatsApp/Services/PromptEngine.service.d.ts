export interface ConversationContext {
    tenantId: string;
    senderPhone: string;
    senderName: string;
    messageText: string;
    conversationHistory: Array<{
        role: "user" | "assistant";
        content: string;
    }>;
    leadInfo?: {
        name?: string;
        lead_status?: string;
        deal_value?: number | string;
        interested_service?: string;
    };
    tenantBusinessContext?: {
        companyName: string;
        servicesList?: string;
        address?: string;
        businessEmail?: string;
    };
    omnichannelLogs?: {
        lastCallSummary?: string;
        lastCallOutcome?: string;
        lastWhatsAppMsg?: string;
        lastEmailLog?: string;
    };
    activeAppointment?: {
        status?: string;
        dateTime?: string;
        meetingUrl?: string;
    };
    kbContext?: string;
    tools?: Array<{
        name: string;
        description: string;
        parameters?: any;
    }>;
    mediaContext?: string;
}
export interface ToolCallExecution {
    action: "execute_tool";
    toolName: string;
    inputs: Record<string, any>;
}
export declare class PromptEngineService {
    private readonly logger;
    private readonly defaultTools;
    buildSystemPrompt(ctx: ConversationContext, customPersona?: string): string;
    buildAutoContext(tenantId: string, senderPhone: string, senderName: string, messageText: string, conversationId?: string): Promise<ConversationContext>;
    generateReply(ctx: ConversationContext, aiConfig?: any): Promise<{
        replyText: string;
        toolCall?: ToolCallExecution;
    }>;
    private parseToolCall;
    getToolConfirmation(tool: ToolCallExecution, ctx?: ConversationContext): Promise<string>;
}
