import {
  CreateVoiceAgentDto,
  UpdateVoiceAgentDto,
  MakeVoiceCallDto,
  ProviderCallResponse,
  NormalizedVoiceWebhookResult,
} from "./VoiceTypes";
import { VoiceProviderConfig } from "@Database/Table/Voice/VoiceProviderConfig.entity";

export interface IVoiceProvider {
  readonly providerName: string;

  /**
   * Create an agent on the provider platform (Vapi, Retell, SaaS Fallback)
   */
  createAgent(
    dto: CreateVoiceAgentDto,
    config?: VoiceProviderConfig
  ): Promise<{ remoteAgentId: string; raw: any }>;

  /**
   * Update an agent on the provider platform
   */
  updateAgent(
    remoteAgentId: string,
    dto: UpdateVoiceAgentDto,
    config?: VoiceProviderConfig
  ): Promise<any>;

  /**
   * Delete an agent on the provider platform
   */
  deleteAgent(
    remoteAgentId: string,
    config?: VoiceProviderConfig
  ): Promise<boolean>;

  /**
   * Trigger an outbound telephony call to customer's phone
   */
  makeCall(
    remoteAgentId: string,
    dto: MakeVoiceCallDto,
    config?: VoiceProviderConfig
  ): Promise<ProviderCallResponse>;

  /**
   * Parse vendor-specific webhook payload into normalized format
   */
  normalizeWebhook(payload: any): NormalizedVoiceWebhookResult;

  /**
   * Fetch assistants/agents directly from the remote platform
   */
  listRemoteAgents?(config?: VoiceProviderConfig): Promise<any[]>;
}
