import { BaseTable } from "../BaseTable";
import { VoiceProviderType } from "./VoiceProviderConfig.entity";
export type CallStatus = "initiated" | "ringing" | "in-progress" | "completed" | "failed" | "busy" | "no-answer" | "cancelled";
export declare class VoiceCallLog extends BaseTable {
    tenant_id: string;
    agent_id: string;
    agent_name: string;
    provider: VoiceProviderType;
    provider_call_id: string;
    customer_phone: string;
    customer_name: string;
    lead_id: string;
    direction: "inbound" | "outbound";
    call_status: CallStatus;
    duration_seconds: number;
    transcript: string;
    recording_url: string;
    summary: string;
    call_outcome: string;
    extracted_slots: Record<string, any>;
    raw_webhook_payload: Record<string, any>;
}
