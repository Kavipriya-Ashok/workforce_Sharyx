import { WhatsAppAIConfig } from "@Database/Table/WhatsApp/WhatsAppAIConfig.entity";
import { WhatsAppAIConfigModel } from "../Models/WhatsAppAIConfig.model";
import { PromptEngineService } from "./PromptEngine.service";
import { AgentOrchestratorService } from "../../AgentOrchestrator/Services/AgentOrchestrator.service";
export interface WhatsAppAiReply {
    reply: string | null;
    announcement?: string | null;
}
export declare class WhatsAppAIService {
    private readonly promptEngineService;
    private readonly orchestrator;
    private readonly logger;
    constructor(promptEngineService: PromptEngineService, orchestrator: AgentOrchestratorService);
    getConfig(tenantId: string): Promise<WhatsAppAIConfig | null>;
    saveConfig(data: WhatsAppAIConfigModel, userId: string | undefined, tenantId: string): Promise<WhatsAppAIConfig>;
    generateResponse(customerMessage: string, customerPhone: string, tenantId?: string, conversationId?: string, extras?: {
        customerName?: string;
        leadId?: string;
    }): Promise<WhatsAppAiReply | string | null>;
    renderFirstMessage(config: WhatsAppAIConfig | null, vars: {
        name?: string | null;
        company?: string | null;
    }): string;
    renderFollowup(config: WhatsAppAIConfig | null, vars: {
        name?: string | null;
        company?: string | null;
    }): string;
    isStopWord(config: WhatsAppAIConfig | null, text: string): boolean;
    isStartWord(text: string): boolean;
    companyName(tenantId: string): Promise<string>;
}
