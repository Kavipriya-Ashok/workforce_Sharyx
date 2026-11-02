import axios from 'axios';

export type VoiceProviderType = 'vapi' | 'retell' | 'bland' | 'saas_fallback';

export interface MaskedVoiceConfig {
  provider: VoiceProviderType;
  has_key: boolean;
  masked_key?: string;
  api_key?: string;
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
  template_key?: string;
  is_enabled?: boolean;
  last_sync_error?: string;
  created_on: string;
}

export interface CatalogAgentDto {
  key: string;
  name: string;
  role: string;
  system_prompt: string;
  first_message: string;
  voice_id: string;
  voice_provider: string;
  llm_model: string;
  temperature: number;
  allowed_tools: string[];
  provider: VoiceProviderType;
  is_enabled: boolean;
  agent_id: string | null;
  remote_agent_id: string | null;
  last_sync_error: string | null;
  status: 'enabled' | 'disabled' | 'not_created';
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
  lead_id?: string;
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

function getActiveTenantId(explicitTenantId?: string): string {
  if (explicitTenantId && explicitTenantId !== 'default') return explicitTenantId;
  try {
    const stored = localStorage.getItem('sharyx_active_tenant_id');
    if (stored && stored !== 'all') return stored;
  } catch {}
  return '646b4abe-e6de-401b-ba33-46884bf3f6e6';
}

export class VoiceService {
  // Provider Configs
  public static async getConfigs(tenantId?: string): Promise<Record<VoiceProviderType, MaskedVoiceConfig>> {
    try {
      const activeTenant = getActiveTenantId(tenantId);
      const res = await axios.get('/api/v1/Voice/Config', { params: { tenantId: activeTenant } });
      return res.data?.data || {};
    } catch {
      return {} as any;
    }
  }

  public static async saveConfig(payload: SaveVoiceConfigPayload, tenantId?: string): Promise<any> {
    const activeTenant = getActiveTenantId(tenantId);
    const res = await axios.post('/api/v1/Voice/Config', payload, { params: { tenantId: activeTenant } });
    return res.data?.data;
  }

  public static async activateProvider(provider: VoiceProviderType, tenantId?: string): Promise<any> {
    const activeTenant = getActiveTenantId(tenantId);
    const res = await axios.post(`/api/v1/Voice/Config/activate/${provider}`, {}, { params: { tenantId: activeTenant } });
    return res.data;
  }

  public static async disconnectProvider(provider: VoiceProviderType, tenantId?: string): Promise<any> {
    const activeTenant = getActiveTenantId(tenantId);
    const res = await axios.post(`/api/v1/Voice/Config/disconnect/${provider}`, {}, { params: { tenantId: activeTenant } });
    return res.data;
  }

  public static async testConnection(provider: VoiceProviderType, apiKey?: string, tenantId?: string): Promise<{ ok: boolean; message: string; latencyMs: number }> {
    const activeTenant = getActiveTenantId(tenantId);
    const res = await axios.post('/api/v1/Voice/Config/test', { provider, apiKey }, { params: { tenantId: activeTenant } });
    return res.data;
  }

  // Voice Agents
  public static async listAgents(tenantId?: string): Promise<VoiceAgentDto[]> {
    try {
      const activeTenant = getActiveTenantId(tenantId);
      const res = await axios.get('/api/v1/Voice/Agents', { params: { tenantId: activeTenant } });
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

  public static async deployWorkforceTeam(tenantId: string = 'default', provider?: string): Promise<any> {
    const res = await axios.post('/api/v1/Voice/Agents/deploy-workforce-team', { provider }, { params: { tenantId } });
    return res.data;
  }

  public static async deployToVapi(tenantId: string = 'default'): Promise<any> {
    const res = await axios.post('/api/v1/Voice/Agents/deploy-to-vapi', {}, { params: { tenantId } });
    return res.data;
  }

  // 5 Default Agents Catalog
  public static async getCatalog(provider: VoiceProviderType = 'vapi', tenantId: string = 'default'): Promise<CatalogAgentDto[]> {
    try {
      const res = await axios.get('/api/v1/Voice/Agents/catalog', { params: { provider, tenantId } });
      return Array.isArray(res.data?.data) ? res.data.data : [];
    } catch {
      return [];
    }
  }

  public static async enableCatalogAgent(key: string, provider: VoiceProviderType = 'vapi', tenantId: string = 'default'): Promise<any> {
    const res = await axios.post(`/api/v1/Voice/Agents/catalog/${key}/enable`, { provider, tenantId });
    return res.data;
  }

  public static async disableCatalogAgent(key: string, provider: VoiceProviderType = 'vapi', tenantId: string = 'default'): Promise<any> {
    const res = await axios.post(`/api/v1/Voice/Agents/catalog/${key}/disable`, { provider, tenantId });
    return res.data;
  }

  public static async enableAllCatalogAgents(provider: VoiceProviderType = 'vapi', tenantId: string = 'default'): Promise<any> {
    const res = await axios.post('/api/v1/Voice/Agents/catalog/enable-all', { provider, tenantId });
    return res.data;
  }

  public static async disableAllCatalogAgents(provider: VoiceProviderType = 'vapi', tenantId: string = 'default'): Promise<any> {
    const res = await axios.post('/api/v1/Voice/Agents/catalog/disable-all', { provider, tenantId });
    return res.data;
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

  public static async getCallLogs(
    tenantId?: string,
    limit: number = 50,
    agentId?: string,
    skipSync: boolean = false
  ): Promise<VoiceCallLogItem[]> {
    try {
      const activeTenant = getActiveTenantId(tenantId);
      const res = await axios.get('/api/v1/Voice/Calls/logs', {
        params: { tenantId: activeTenant, limit, agentId: agentId || undefined, skipSync: skipSync ? 'true' : undefined },
      });
      return Array.isArray(res.data?.data) ? res.data.data : [];
    } catch {
      return [];
    }
  }

  public static async getCallStats(tenantId?: string): Promise<VoiceStats> {
    try {
      const activeTenant = getActiveTenantId(tenantId);
      const res = await axios.get('/api/v1/Voice/Calls/stats', { params: { tenantId: activeTenant } });
      return res.data?.data || { totalCalls: 0, completedCalls: 0, avgDurationSeconds: 0, completionRate: 0 };
    } catch {
      return { totalCalls: 0, completedCalls: 0, avgDurationSeconds: 0, completionRate: 0 };
    }
  }

  /** Pull call history from Sharyx SaaS (fallback-voice.sharyx.ai) and sync to local DB */
  public static async syncCallLogsFromSaas(tenantId: string = 'default'): Promise<{ synced: number; message: string }> {
    const res = await axios.post('/api/v1/Voice/Calls/sync-saas', {}, { params: { tenantId } });
    return { synced: res.data?.synced || 0, message: res.data?.message || 'Synced' };
  }

  /** Pull call history directly from Vapi API (api.vapi.ai/call) and sync to local DB */
  public static async syncCallLogsFromVapi(tenantId: string = 'default'): Promise<{ synced: number; message: string }> {
    const res = await axios.post('/api/v1/Voice/Calls/sync-vapi', {}, { params: { tenantId } });
    return { synced: res.data?.synced || 0, message: res.data?.message || 'Synced' };
  }
}

