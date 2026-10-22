import { VoiceProviderType } from "@Database/Table/Voice/VoiceProviderConfig.entity";
import { CallStatus } from "@Database/Table/Voice/VoiceCallLog.entity";

export interface CreateVoiceAgentDto {
  name: string;
  provider: VoiceProviderType;
  system_prompt: string;
  first_message?: string;
  voice_id?: string;
  voice_provider?: string;
  llm_model?: string;
  temperature?: number;
  language?: string;
  allowed_tools?: string[];
  transfer_agent_id?: string;
  transfer_phone_number?: string;
  tenantId?: string;
}

export interface UpdateVoiceAgentDto extends Partial<CreateVoiceAgentDto> {
  remote_agent_id?: string;
}

export interface MakeVoiceCallDto {
  agent_id: string;
  phone_number: string;
  customer_name?: string;
  lead_id?: string;
  tenantId?: string;
  custom_variables?: Record<string, any>;
}

export interface ProviderCallResponse {
  callId: string;
  status: CallStatus;
  raw?: any;
}

export interface NormalizedVoiceWebhookResult {
  providerCallId: string;
  status: CallStatus;
  durationSeconds?: number;
  transcript?: string;
  recordingUrl?: string;
  summary?: string;
  outcome?: string;
  extractedSlots?: Record<string, any>;
  raw?: any;
}
