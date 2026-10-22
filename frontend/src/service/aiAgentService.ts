import axios from 'axios';
import { AiAgent, ConversationAgentState, AgentHandoffLog, AgentSimulationResult } from '@/types/aiAgent';

const API_BASE = '/api/v1/AiAgents';

// Ensure Authorization header is present
axios.interceptors.request.use((config) => {
  try {
    const user = localStorage.getItem('sharyx_user');
    if (user) {
      const parsed = JSON.parse(user);
      const token = parsed?.api_token || parsed?.token;
      if (token && !config.headers.Authorization) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
  } catch {}
  return config;
});

export class AiAgentService {
  public static async list(): Promise<AiAgent[]> {
    try {
      const res = await axios.get(API_BASE);
      const data = res.data?.AddtionalData || res.data?.data || res.data;
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  public static async update(id: string, payload: Partial<AiAgent>): Promise<AiAgent | null> {
    const res = await axios.put(`${API_BASE}/${id}`, payload);
    return res.data?.AddtionalData || res.data?.data || res.data;
  }

  public static async reset(id: string): Promise<AiAgent | null> {
    const res = await axios.post(`${API_BASE}/${id}/Reset`);
    return res.data?.AddtionalData || res.data?.data || res.data;
  }

  public static async listStates(channel?: string): Promise<ConversationAgentState[]> {
    try {
      const res = await axios.get(`${API_BASE}/Conversations`, { params: { channel } });
      const data = res.data?.AddtionalData || res.data?.data || res.data;
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  public static async getHandoffs(stateId: string): Promise<AgentHandoffLog[]> {
    try {
      const res = await axios.get(`${API_BASE}/Conversations/${stateId}/Handoffs`);
      const data = res.data?.AddtionalData || res.data?.data || res.data;
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  public static async setTakeover(stateId: string, takeover: boolean) {
    const res = await axios.post(`${API_BASE}/Conversations/${stateId}/Takeover`, { takeover });
    return res.data;
  }

  public static async assignAgent(stateId: string, agent_key: string) {
    const res = await axios.post(`${API_BASE}/Conversations/${stateId}/Assign`, { agent_key });
    return res.data;
  }

  public static async simulate(message: string, channel: 'whatsapp' | 'email' = 'whatsapp', sessionId: string = 'playground', name?: string): Promise<AgentSimulationResult> {
    const res = await axios.post(`${API_BASE}/Simulate`, {
      channel,
      session_id: sessionId,
      message,
      name,
    });
    return res.data?.AddtionalData || res.data?.data || res.data;
  }
}
