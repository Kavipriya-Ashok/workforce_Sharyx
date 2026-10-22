import { AuthBaseController } from "@Controller/AuthBase.controller";
import { ResponseEnum } from "@Helper/Enum/ResponseEnum";
import { AiAgentService } from "../Services/AiAgent.service";
import { AgentOrchestratorService } from "../Services/AgentOrchestrator.service";
export declare class AiAgentController extends AuthBaseController {
    private readonly agentService;
    private readonly orchestrator;
    constructor(agentService: AiAgentService, orchestrator: AgentOrchestratorService);
    list(): Promise<any>;
    update(id: string, body: any, userId: string): Promise<{
        Type: ResponseEnum;
        Message: string;
        AddtionalData: any;
    } | {
        Type: ResponseEnum;
        Message: string;
        AddtionalData?: undefined;
    }>;
    reset(id: string): Promise<{
        Type: ResponseEnum;
        Message: string;
        AddtionalData: any;
    } | {
        Type: ResponseEnum;
        Message: string;
        AddtionalData?: undefined;
    }>;
    states(channel?: string): Promise<any>;
    handoffs(id: string): Promise<any>;
    takeover(id: string, body: {
        takeover: boolean;
    }): Promise<{
        Type: ResponseEnum;
        Message: string;
        AddtionalData: any;
    } | {
        Type: ResponseEnum;
        Message: string;
        AddtionalData?: undefined;
    }>;
    assign(id: string, body: {
        agent_key: string;
    }): Promise<{
        Type: ResponseEnum;
        Message: string;
        AddtionalData: any;
    } | {
        Type: ResponseEnum;
        Message: string;
        AddtionalData?: undefined;
    }>;
    simulate(body: {
        channel?: "whatsapp" | "email";
        session_id?: string;
        message: string;
        name?: string;
    }): Promise<any>;
}
