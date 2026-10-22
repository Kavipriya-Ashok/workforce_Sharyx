import axios from 'axios';

export type VoiceProviderType = 'vapi' | 'retell' | 'bland' | 'saas_fallback';

export interface MaskedVoiceConfig {
  provider: VoiceProviderType;
  has_key: boolean;
  masked_key?: string;
  phone_number_id?: string;
  caller_id?: string;
  base_url?: string;
  webhook_forward_url?: string;
  is_active: boolean;
  metadata?: Record<string, any>;
  updated_on?: string;
}

export interface SaveVoiceConfigPayload {
  provider: VoiceProviderType;
  api_key?: string;
  phone_number_id?: string;
  caller_id?: string;
  base_url?: string;
  webhook_forward_url?: string;
  is_active?: boolean;
}

export interface VoiceAgentDto {
  id: string;
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
  status: boolean;
  transfer_agent_id?: string;
  transfer_phone_number?: string;
  created_on: string;
}

export interface CreateVoiceAgentPayload {
  name: string;
  provider: VoiceProviderType;
  system_prompt: string;
  first_message?: string;
  voice_id?: string;
  voice_provider?: string;
  llm_model?: string;
  temperature?: number;
  language?: string;
  tenantId?: string;
  transfer_agent_id?: string;
  transfer_phone_number?: string;
}

export interface MakeVoiceCallPayload {
  agent_id: string;
  phone_number: string;
  customer_name?: string;
  tenantId?: string;
  custom_variables?: Record<string, any>;
}

export interface VoiceCallLogItem {
  id: string;
  tenant_id: string;
  agent_id: string;
  agent_name: string;
  provider: VoiceProviderType;
  provider_call_id: string;
  customer_phone: string;
  customer_name: string;
  direction: 'inbound' | 'outbound';
  call_status: string;
  duration_seconds: number;
  transcript?: string;
  recording_url?: string;
  summary?: string;
  call_outcome?: string;
  extracted_slots?: Record<string, any>;
  created_on: string;
}

export interface VoiceStats {
  totalCalls: number;
  completedCalls: number;
  avgDurationSeconds: number;
  completionRate: number;
}

export class VoiceService {
  // Provider Configs
  public static async getConfigs(tenantId: string = 'default'): Promise<Record<VoiceProviderType, MaskedVoiceConfig>> {
    try {
      const res = await axios.get('/api/v1/Voice/Config', { params: { tenantId } });
      return res.data?.data || {};
    } catch {
      return {} as any;
    }
  }

  public static async saveConfig(payload: SaveVoiceConfigPayload, tenantId: string = 'default'): Promise<any> {
    const res = await axios.post('/api/v1/Voice/Config', payload, { params: { tenantId } });
    return res.data?.data;
  }

  public static async activateProvider(provider: VoiceProviderType, tenantId: string = 'default'): Promise<any> {
    const res = await axios.post(`/api/v1/Voice/Config/activate/${provider}`, {}, { params: { tenantId } });
    return res.data;
  }

  public static async disconnectProvider(provider: VoiceProviderType, tenantId: string = 'default'): Promise<any> {
    const res = await axios.post(`/api/v1/Voice/Config/disconnect/${provider}`, {}, { params: { tenantId } });
    return res.data;
  }

  public static async testConnection(provider: VoiceProviderType, apiKey?: string, tenantId: string = 'default'): Promise<{ ok: boolean; message: string; latencyMs: number }> {
    const res = await axios.post('/api/v1/Voice/Config/test', { provider, apiKey }, { params: { tenantId } });
    return res.data;
  }

  // Voice Agents
  public static async listAgents(tenantId: string = 'default'): Promise<VoiceAgentDto[]> {
    try {
      const res = await axios.get('/api/v1/Voice/Agents', { params: { tenantId } });
      return Array.isArray(res.data?.data) ? res.data.data : [];
    } catch {
      return [];
    }
  }

  public static async createAgent(payload: CreateVoiceAgentPayload): Promise<VoiceAgentDto> {
    const res = await axios.post('/api/v1/Voice/Agents', payload);
    return res.data?.data;
  }

  public static async updateAgent(id: string, payload: Partial<CreateVoiceAgentPayload>): Promise<VoiceAgentDto> {
    const res = await axios.put(`/api/v1/Voice/Agents/${id}`, payload);
    return res.data?.data;
  }

  public static async deleteAgent(id: string, tenantId: string = 'default'): Promise<boolean> {
    const res = await axios.delete(`/api/v1/Voice/Agents/${id}`, { params: { tenantId } });
    return Boolean(res.data?.deleted);
  }

  public static async syncAgents(provider: string = 'vapi', tenantId: string = 'default'): Promise<VoiceAgentDto[]> {
    const res = await axios.post(`/api/v1/Voice/Agents/sync/${provider}`, {}, { params: { tenantId } });
    return Array.isArray(res.data?.data) ? res.data.data : [];
  }

  public static async syncAllAgents(tenantId: string = 'default'): Promise<VoiceAgentDto[]> {
    const res = await axios.post('/api/v1/Voice/Agents/sync-all', {}, { params: { tenantId } });
    return Array.isArray(res.data?.data) ? res.data.data : [];
  }

  public static async getProvidersList(): Promise<{ id: VoiceProviderType; name: string; description: string }[]> {
    try {
      const res = await axios.get('/api/v1/Voice/Agents/providers');
      return Array.isArray(res.data?.data) ? res.data.data : [];
    } catch {
      return [];
    }
  }

  // Calls & Logs
  public static async dispatchCall(payload: MakeVoiceCallPayload): Promise<VoiceCallLogItem> {
    const res = await axios.post('/api/v1/Voice/Calls/dispatch', payload);
    if (res.data?.Type === 'Error' || (res.data?.ok === false && res.data?.Message)) {
      throw new Error(res.data.Message || res.data.message || 'Call dispatch failed');
    }
    const data = res.data?.data || res.data;
    if (!data) {
      throw new Error('Call dispatch did not return call details');
    }
    return data;
  }

  public static async getCallLogs(tenantId: string = 'default', limit: number = 50): Promise<VoiceCallLogItem[]> {
    try {
      const res = await axios.get('/api/v1/Voice/Calls/logs', { params: { tenantId, limit } });
      return Array.isArray(res.data?.data) ? res.data.data : [];
    } catch {
      return [];
    }
  }

  public static async getCallStats(tenantId: string = 'default'): Promise<VoiceStats> {
    try {
      const res = await axios.get('/api/v1/Voice/Calls/stats', { params: { tenantId } });
      return res.data?.data || { totalCalls: 0, completedCalls: 0, avgDurationSeconds: 0, completionRate: 0 };
    } catch {
      return { totalCalls: 0, completedCalls: 0, avgDurationSeconds: 0, completionRate: 0 };
    }
  }
}
