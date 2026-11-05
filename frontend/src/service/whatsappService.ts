import axios from 'axios';
import {
  WhatsAppConfig,
  WhatsAppAIConfig,
  WhatsAppConversation,
  WhatsAppMessage,
  WhatsAppCampaign,
  WhatsAppTemplate,
} from '@/types/whatsapp';

const API_BASE = '/api/v1/WhatsApp';

// Automatically inject JWT Token if logged in
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
  } catch {
    // ignore
  }
  return config;
});

export class WhatsAppService {
  // Templates
  public static async getTemplates(): Promise<WhatsAppTemplate[]> {
    try {
      const res = await axios.get(`${API_BASE}/Templates`);
      const payload = res.data?.AddtionalData || res.data;
      if (Array.isArray(payload)) return payload;
      if (Array.isArray(payload?.data)) return payload.data;
      return [];
    } catch {
      return [];
    }
  }

  public static async syncMetaTemplates(): Promise<WhatsAppTemplate[]> {
    const res = await axios.post(`${API_BASE}/Templates/SyncMeta`);
    return res.data?.AddtionalData || res.data;
  }

  public static async createTemplate(data: Partial<WhatsAppTemplate>): Promise<WhatsAppTemplate> {
    const res = await axios.post(`${API_BASE}/Templates/Create`, data);
    return res.data?.AddtionalData || res.data;
  }

  public static async updateTemplate(id: string, data: Partial<WhatsAppTemplate>): Promise<WhatsAppTemplate> {
    const res = await axios.put(`${API_BASE}/Templates/Update/${id}`, data);
    return res.data?.AddtionalData || res.data;
  }

  public static async deleteTemplate(id: string): Promise<any> {
    const res = await axios.delete(`${API_BASE}/Templates/Delete/${id}`);
    return res.data;
  }

  // Campaigns
  public static async getCampaigns(): Promise<WhatsAppCampaign[]> {
    try {
      const res = await axios.get(`${API_BASE}/Campaigns`);
      const payload = res.data?.AddtionalData || res.data;
      if (Array.isArray(payload)) return payload;
      if (Array.isArray(payload?.data)) return payload.data;
      return [];
    } catch {
      return [];
    }
  }

  public static async createCampaign(data: Partial<WhatsAppCampaign>): Promise<WhatsAppCampaign> {
    const res = await axios.post(`${API_BASE}/Campaigns/Create`, data);
    return res.data?.AddtionalData || res.data;
  }

  public static async updateCampaign(id: string, data: Partial<WhatsAppCampaign>): Promise<WhatsAppCampaign> {
    const res = await axios.put(`${API_BASE}/Campaigns/Update/${id}`, data);
    return res.data?.AddtionalData || res.data;
  }

  public static async toggleCampaign(id: string, is_active: boolean): Promise<WhatsAppCampaign> {
    const res = await axios.patch(`${API_BASE}/Campaigns/Toggle/${id}`, { is_active });
    return res.data?.AddtionalData || res.data;
  }

  public static async deleteCampaign(id: string): Promise<any> {
    const res = await axios.delete(`${API_BASE}/Campaigns/Delete/${id}`);
    return res.data;
  }

  public static async updateConversationStatus(id: string, status: string): Promise<any> {
    const res = await axios.patch(`${API_BASE}/Conversations/${id}/status`, { status });
    return res.data?.AddtionalData || res.data;
  }
}

// Backward-compatible export
export const whatsappService = {
  ...WhatsAppService,

  // Config
  getConfig: async (): Promise<WhatsAppConfig | null> => {
    try {
      const res = await axios.get(`${API_BASE}/Config`);
      return res.data?.AddtionalData || res.data;
    } catch {
      return null;
    }
  },

  saveConfig: async (config: WhatsAppConfig) => {
    const res = await axios.post(`${API_BASE}/Config`, config);
    return res.data;
  },

  disconnect: async () => {
    const res = await axios.post(`${API_BASE}/Disconnect`);
    return res.data?.AddtionalData || res.data;
  },

  testConnection: async (config: WhatsAppConfig) => {
    try {
      const res = await axios.post(`${API_BASE}/Test-Connection`, config);
      return res.data?.AddtionalData || res.data;
    } catch (err: any) {
      const errorMsg = err?.response?.data?.message || err.message;
      throw new Error(errorMsg);
    }
  },

  // Conversations & Messages
  getConversations: async (): Promise<WhatsAppConversation[]> => {
    try {
      const res = await axios.get(`${API_BASE}/Conversations`);
      const payload = res.data?.AddtionalData || res.data;
      if (Array.isArray(payload)) return payload;
      if (Array.isArray(payload?.data)) return payload.data;
      return [];
    } catch {
      return [];
    }
  },

  getMessages: async (conversationId: string): Promise<WhatsAppMessage[]> => {
    try {
      const res = await axios.get(`${API_BASE}/Messages/${conversationId}`);
      const payload = res.data?.AddtionalData || res.data;
      if (Array.isArray(payload)) return payload;
      if (Array.isArray(payload?.data)) return payload.data;
      return [];
    } catch {
      return [];
    }
  },

  sendMessage: async (data: {
    to: string;
    text: string;
    message_type?: string;
    template_name?: string;
    conversation_id?: string;
  }) => {
    const res = await axios.post(`${API_BASE}/Send`, data);
    return res.data;
  },

  // AI Brain Config
  getAIConfig: async (): Promise<WhatsAppAIConfig | null> => {
    try {
      const res = await axios.get(`${API_BASE}/AI/Config`);
      return res.data?.AddtionalData || res.data;
    } catch {
      return null;
    }
  },

  saveAIConfig: async (config: WhatsAppAIConfig) => {
    const res = await axios.post(`${API_BASE}/AI/Config`, config);
    return res.data;
  },

  getCampaigns: WhatsAppService.getCampaigns,
  createCampaign: WhatsAppService.createCampaign,
  getTemplates: WhatsAppService.getTemplates,
  createTemplate: WhatsAppService.createTemplate,
  syncMetaTemplates: WhatsAppService.syncMetaTemplates,
  updateConversationStatus: WhatsAppService.updateConversationStatus,
};
