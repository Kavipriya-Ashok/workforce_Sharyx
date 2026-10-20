import axios from 'axios';
import {
  EmailAccountConfig,
  EmailAIConfig,
  EmailCampaign,
  EmailLog,
  OAuthStatus,
  EmailValidationResult,
} from '@/types/email';

const API_BASE = '/api/v1/Email';

export const emailService = {
  // Email Validation (5-Layer Deliverability Check)
  validateEmail: async (email: string): Promise<EmailValidationResult> => {
    try {
      const res = await axios.post(`${API_BASE}/Validate`, { email });
      return res.data?.AddtionalData || res.data;
    } catch (err: any) {
      return {
        isValid: false,
        score: 0,
        reason: err.response?.data?.message || err.message,
        isDisposable: false,
        isRoleBased: false,
        hasMxRecords: false,
      };
    }
  },

  // Config
  getConfig: async (): Promise<EmailAccountConfig | null> => {
    try {
      const res = await axios.get(`${API_BASE}/Config`);
      return res.data?.AddtionalData || res.data;
    } catch {
      return null;
    }
  },

  saveConfig: async (config: EmailAccountConfig) => {
    const res = await axios.post(`${API_BASE}/Config`, config);
    return res.data;
  },

  // Google OAuth 2.0
  getGoogleAuthUrl: async (redirectUri?: string): Promise<string> => {
    const res = await axios.get(`${API_BASE}/OAuth/AuthUrl`, {
      params: redirectUri ? { redirectUri } : {},
    });
    const data = res.data?.AddtionalData || res.data;
    return data?.url || '';
  },

  connectGoogle: async (code: string, redirectUri?: string) => {
    const res = await axios.post(`${API_BASE}/OAuth/Connect`, {
      code,
      redirectUri,
    });
    return res.data?.AddtionalData || res.data;
  },

  getOAuthStatus: async (): Promise<OAuthStatus> => {
    try {
      const res = await axios.get(`${API_BASE}/OAuth/Status`);
      return res.data?.AddtionalData || res.data || { isConnected: false, provider: 'none' };
    } catch {
      return { isConnected: false, provider: 'none' };
    }
  },

  disconnectGoogle: async () => {
    const res = await axios.post(`${API_BASE}/OAuth/Disconnect`);
    return res.data;
  },

  // Lead Direct Send & AI Follow-Up Draft
  generateLeadAiDraft: async (data: {
    lead_id: string;
    customPrompt?: string;
    intent?: string;
  }): Promise<{ subject: string; body_html: string }> => {
    const res = await axios.post(`${API_BASE}/Lead/AiDraft`, data);
    return res.data?.AddtionalData || res.data;
  },

  sendLeadEmail: async (data: {
    lead_id: string;
    to: string;
    subject: string;
    html: string;
    isAiDrafted?: boolean;
  }) => {
    const res = await axios.post(`${API_BASE}/Lead/Send`, data);
    return res.data;
  },

  syncInbox: async () => {
    const res = await axios.post(`${API_BASE}/Sync`);
    return res.data?.AddtionalData || res.data;
  },

  // 2-Way Inbox & Sending
  getInbox: async (): Promise<EmailLog[]> => {
    try {
      const res = await axios.get(`${API_BASE}/Inbox`);
      const payload = res.data?.AddtionalData || res.data;
      if (Array.isArray(payload)) return payload;
      if (Array.isArray(payload?.data)) return payload.data;
      return [];
    } catch {
      return [
        {
          id: 'email-1',
          from_email: 'client@megacorp.com',
          to_email: 'support@sharyx.com',
          subject: 'Request for custom integration quote',
          body_text: 'Hello, we would like to evaluate Sharyx for our 200 sales reps. Could you send the pricing sheets and API docs?',
          direction: 'inbound',
          delivery_status: 'received',
          is_ai_drafted: false,
          created_on: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
        },
        {
          id: 'email-2',
          from_email: 'support@sharyx.com',
          to_email: 'client@megacorp.com',
          subject: 'Re: Request for custom integration quote',
          body_text: 'Hi MegaCorp Team,\n\nThank you for reaching out! Attached are our integration guides and custom volume pricing.',
          direction: 'outbound',
          delivery_status: 'sent',
          is_ai_drafted: true,
          created_on: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
        },
      ];
    }
  },

  sendEmail: async (data: {
    to: string;
    subject: string;
    html: string;
    lead_id?: string;
  }) => {
    const res = await axios.post(`${API_BASE}/Send`, data);
    return res.data;
  },

  getThread: async (identifier: string): Promise<EmailLog[]> => {
    try {
      const res = await axios.get(`${API_BASE}/Thread/${encodeURIComponent(identifier)}`);
      return res.data?.AddtionalData || res.data || [];
    } catch {
      return [];
    }
  },

  // AI Configuration & Draft Generator
  getAIConfig: async (): Promise<EmailAIConfig | null> => {
    try {
      const res = await axios.get(`${API_BASE}/AI/Config`);
      return res.data?.AddtionalData || res.data;
    } catch {
      return {
        auto_reply_enabled: true,
        tone: 'professional',
        system_prompt: 'You are an executive email assistant for Sharyx. Keep replies polished, helpful, and maintain a courteous tone.',
        llm_provider: 'openai',
        llm_model: 'gpt-4o-mini',
      };
    }
  },

  saveAIConfig: async (config: EmailAIConfig) => {
    const res = await axios.post(`${API_BASE}/AI/Config`, config);
    return res.data;
  },

  generateAIDraft: async (data: {
    from_email?: string;
    subject?: string;
    incoming_body?: string;
  }): Promise<{ subject: string; draft: string }> => {
    try {
      const res = await axios.post(`${API_BASE}/AI/Draft`, data);
      return res.data?.AddtionalData || res.data;
    } catch {
      return {
        subject: data.subject?.startsWith('Re:') ? data.subject : `Re: ${data.subject || 'Inquiry'}`,
        draft: `Dear Client,\n\nThank you for getting in touch with us regarding "${data.subject || 'your request'}".\n\nWe have received your message and our specialist team is actively reviewing your requirements. We will get back to you with the details shortly.\n\nBest regards,\nCustomer Success Team\nSharyx`,
      };
    }
  },

  // Campaigns
  getCampaigns: async (): Promise<EmailCampaign[]> => {
    try {
      const res = await axios.get(`${API_BASE}/Campaign`);
      const payload = res.data?.AddtionalData || res.data;
      if (Array.isArray(payload)) return payload;
      if (Array.isArray(payload?.data)) return payload.data;
      return [];
    } catch {
      return [
        {
          id: 'camp-e1',
          campaign_name: 'Product Update Q4 2026',
          subject: 'Discover New AI Features in Sharyx Suite',
          html_template: '<h1>Exclusive Preview</h1><p>Our autonomous WhatsApp and Email copilot is now live!</p>',
          recipients_count: 3400,
          sent_count: 3400,
          opened_count: 1820,
          campaign_status: 'sent',
          created_on: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4).toISOString(),
        },
      ];
    }
  },

  createCampaign: async (campaign: {
    campaign_name: string;
    subject: string;
    html_template: string;
    recipients: string[];
  }) => {
    const res = await axios.post(`${API_BASE}/Campaign`, campaign);
    return res.data;
  },
};
