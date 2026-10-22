import { WhatsAppAIConfig } from "@Database/Table/WhatsApp/WhatsAppAIConfig.entity";
import { WhatsAppAIConfigModel } from "../Models/WhatsAppAIConfig.model";
import { PromptEngineService } from "./PromptEngine.service";
import { AgentOrchestratorService } from "../../AgentOrchestrator/Services/AgentOrchestrator.service";
export declare class WhatsAppAIService {
    private readonly promptEngineService;
    private readonly orchestrator;
    private readonly logger;
    constructor(promptEngineService: PromptEngineService, orchestrator: AgentOrchestratorService);
    getConfig(tenantId?: string): Promise<WhatsAppAIConfig | null>;
    saveConfig(data: WhatsAppAIConfigModel, userId?: string): Promise<WhatsAppAIConfig>;
    generateResponse(customerMessage: string, customerPhone: string, tenantId?: string, conversationId?: string, extras?: {
        customerName?: string;
        leadId?: string;
    }): Promise<string | null>;
}
