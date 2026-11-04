import axios from 'axios';
import {
  ConversationListResponse,
  ConversationDetailResponse,
  OmnichannelConversation,
  Customer360Response,
  OmnichannelStatus,
  OmnichannelLeadsResponse,
  LeadTimelineResponse,
  OmnichannelCommunicationItem,
} from '@/types/omnichannel';

const API_BASE = '/api/v1/omnichannel';
const ALT_API_BASE = '/api/omnichannel';

export interface ConversationFilterParams {
  channel?: 'all' | 'whatsapp' | 'email' | 'call';
  status?: 'all' | 'new' | 'open' | 'pending' | 'resolved';
  search?: string;
  assigned_to?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  limit?: number;
}

export interface LeadFilterParams {
  search?: string;
  channel?: 'all' | 'whatsapp' | 'email' | 'call';
  page?: number;
  limit?: number;
}

export const omnichannelService = {
  async getLeads(params?: LeadFilterParams): Promise<OmnichannelLeadsResponse> {
    const query = new URLSearchParams();
    if (params?.channel && params.channel !== 'all') query.append('channel', params.channel);
    if (params?.search) query.append('search', params.search);
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());

    try {
      const res = await axios.get(`${API_BASE}/leads?${query.toString()}`);
      return res.data;
    } catch {
      const res = await axios.get(`${ALT_API_BASE}/leads?${query.toString()}`);
      return res.data;
    }
  },

  async getLeadTimeline(leadId: string, channel?: string): Promise<LeadTimelineResponse> {
    const query = new URLSearchParams();
    if (channel && channel !== 'all') query.append('channel', channel);

    try {
      const res = await axios.get(`${API_BASE}/leads/${leadId}/timeline?${query.toString()}`);
      return res.data;
    } catch {
      const res = await axios.get(`${ALT_API_BASE}/leads/${leadId}/timeline?${query.toString()}`);
      return res.data;
    }
  },

  async sendLeadReply(
    leadId: string,
    reply: {
      channel: 'whatsapp' | 'email' | 'call';
      body: string;
      subject?: string;
      attachments?: Array<{ name: string; url: string; mimeType?: string; size?: number }>;
    }
  ): Promise<OmnichannelCommunicationItem> {
    try {
      const res = await axios.post(`${API_BASE}/leads/${leadId}/reply`, reply);
      return res.data;
    } catch {
      const res = await axios.post(`${ALT_API_BASE}/leads/${leadId}/reply`, reply);
      return res.data;
    }
  },

  async seedRam(): Promise<{ success: boolean; ramLeadId?: string }> {
    try {
      const res = await axios.post(`${API_BASE}/seed-ram`);
      return res.data;
    } catch {
      const res = await axios.post(`${ALT_API_BASE}/seed-ram`);
      return res.data;
    }
  },

  // ═════════════════════════════════════════════════════════════════════════
  // CUSTOMER-CENTRIC OMNICHANNEL 360° CLIENT METHODS
  // ═════════════════════════════════════════════════════════════════════════

  async getCustomerDirectory(params?: {
    search?: string;
    channel?: string;
    page?: number;
    limit?: number;
  }): Promise<import('@/types/omnichannel').Customer360ListResponse> {
    const query = new URLSearchParams();
    if (params?.channel && params.channel !== 'ALL' && params.channel !== 'all') {
      query.append('channel', params.channel);
    }
    if (params?.search) query.append('search', params.search);
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());

    try {
      const res = await axios.get(`${API_BASE}/customers?${query.toString()}`);
      return res.data;
    } catch {
      const res = await axios.get(`${ALT_API_BASE}/customers?${query.toString()}`);
      return res.data;
    }
  },

  async getCustomerProfile(
    customerId: string
  ): Promise<{ customer: import('@/types/omnichannel').OmnichannelCustomer; identities: any[] }> {
    try {
      const res = await axios.get(`${API_BASE}/customers/${customerId}`);
      return res.data;
    } catch {
      const res = await axios.get(`${ALT_API_BASE}/customers/${customerId}`);
      return res.data;
    }
  },

  async getCustomerTimeline360(
    customerId: string,
    filters?: {
      channel?: string;
      direction?: string;
      startDate?: string;
      endDate?: string;
      search?: string;
      sortOrder?: 'DESC' | 'ASC';
      page?: number;
      limit?: number;
    }
  ): Promise<import('@/types/omnichannel').Customer360TimelineResponse> {
    const query = new URLSearchParams();
    if (filters?.channel && filters.channel !== 'ALL') query.append('channel', filters.channel);
    if (filters?.direction && filters.direction !== 'ALL') query.append('direction', filters.direction);
    if (filters?.startDate) query.append('startDate', filters.startDate);
    if (filters?.endDate) query.append('endDate', filters.endDate);
    if (filters?.search) query.append('search', filters.search);
    if (filters?.sortOrder) query.append('sortOrder', filters.sortOrder);
    if (filters?.page) query.append('page', filters.page.toString());
    if (filters?.limit) query.append('limit', filters.limit.toString());

    try {
      const res = await axios.get(`${API_BASE}/customers/${customerId}/timeline?${query.toString()}`);
      return res.data;
    } catch {
      const res = await axios.get(`${ALT_API_BASE}/customers/${customerId}/timeline?${query.toString()}`);
      return res.data;
    }
  },

  async getCustomerIntelligenceReport(
    customerId: string
  ): Promise<import('@/types/omnichannel').CustomerIntelligenceReport> {
    try {
      const res = await axios.get(`${API_BASE}/customers/${customerId}/summary`);
      return res.data;
    } catch {
      const res = await axios.get(`${ALT_API_BASE}/customers/${customerId}/summary`);
      return res.data;
    }
  },

  async getEventDetail(eventId: string): Promise<any> {
    try {
      const res = await axios.get(`${API_BASE}/events/${eventId}`);
      return res.data;
    } catch {
      const res = await axios.get(`${ALT_API_BASE}/events/${eventId}`);
      return res.data;
    }
  },

  async sendCustomerReply(
    customerId: string,
    reply: {
      channel: 'whatsapp' | 'email' | 'call';
      body: string;
      subject?: string;
      attachments?: Array<{ name: string; url: string; mimeType?: string; size?: number }>;
    }
  ): Promise<any> {
    try {
      const res = await axios.post(`${API_BASE}/customers/${customerId}/reply`, reply);
      return res.data;
    } catch {
      const res = await axios.post(`${ALT_API_BASE}/customers/${customerId}/reply`, reply);
      return res.data;
    }
  },

  async linkCustomerIdentity(
    customerId: string,
    data: { identity_type: 'phone' | 'email'; value: string }
  ): Promise<any> {
    try {
      const res = await axios.post(`${API_BASE}/customers/${customerId}/link-identity`, data);
      return res.data;
    } catch {
      const res = await axios.post(`${ALT_API_BASE}/customers/${customerId}/link-identity`, data);
      return res.data;
    }
  },

  async getConversations(params?: ConversationFilterParams): Promise<ConversationListResponse> {
    const query = new URLSearchParams();
    if (params?.channel && params.channel !== 'all') query.append('channel', params.channel);
    if (params?.status && params.status !== 'all') query.append('status', params.status);
    if (params?.search) query.append('search', params.search);
    if (params?.assigned_to) query.append('assigned_to', params.assigned_to);
    if (params?.date_from) query.append('date_from', params.date_from);
    if (params?.date_to) query.append('date_to', params.date_to);
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());

    try {
      const res = await axios.get(`${API_BASE}/conversations?${query.toString()}`);
      return res.data;
    } catch {
      const res = await axios.get(`${ALT_API_BASE}/conversations?${query.toString()}`);
      return res.data;
    }
  },

  async getConversationDetail(id: string): Promise<ConversationDetailResponse> {
    try {
      const res = await axios.get(`${API_BASE}/conversations/${id}`);
      return res.data;
    } catch {
      const res = await axios.get(`${ALT_API_BASE}/conversations/${id}`);
      return res.data;
    }
  },

  async updateConversation(
    id: string,
    data: { status?: OmnichannelStatus; assigned_to?: string }
  ): Promise<OmnichannelConversation> {
    try {
      const res = await axios.patch(`${API_BASE}/conversations/${id}/status`, data);
      return res.data;
    } catch {
      const res = await axios.patch(`${ALT_API_BASE}/conversations/${id}/status`, data);
      return res.data;
    }
  },

  async sendReply(
    id: string,
    reply: {
      body: string;
      channel?: 'whatsapp' | 'email' | 'call';
      subject?: string;
      attachments?: Array<{ name: string; url: string; mimeType?: string; size?: number }>;
    }
  ): Promise<any> {
    try {
      const res = await axios.post(`${API_BASE}/conversations/${id}/reply`, reply);
      return res.data;
    } catch {
      const res = await axios.post(`${ALT_API_BASE}/conversations/${id}/reply`, reply);
      return res.data;
    }
  },

  async getCustomer360(customerId: string): Promise<Customer360Response> {
    try {
      const res = await axios.get(`${API_BASE}/customers/${customerId}/timeline`);
      return res.data;
    } catch {
      const res = await axios.get(`${ALT_API_BASE}/customers/${customerId}/timeline`);
      return res.data;
    }
  },

  async seedDemo(): Promise<{ success: boolean; seededCount?: number }> {
    try {
      const res = await axios.post(`${API_BASE}/seed-demo`);
      return res.data;
    } catch {
      const res = await axios.post(`${ALT_API_BASE}/seed-demo`);
      return res.data;
    }
  },

  subscribeToStream(onEvent: (event: any) => void, onError?: (err: any) => void): () => void {
    const sseUrl = `${API_BASE}/stream`;
    let eventSource: EventSource | null = null;

    try {
      eventSource = new EventSource(sseUrl);

      const eventNames = [
        'communication_added',
        'conversation_created',
        'conversation_updated',
        'message_received',
        'call_logged',
        'status_changed',
        'lead_updated',
      ];

      eventNames.forEach((evName) => {
        eventSource?.addEventListener(evName, (e: MessageEvent) => {
          try {
            const data = JSON.parse(e.data);
            onEvent({ type: evName, ...data });
          } catch {
            onEvent({ type: evName, raw: e.data });
          }
        });
      });

      eventSource.onmessage = (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          onEvent({ type: 'message', ...data });
        } catch {
          onEvent({ type: 'message', raw: e.data });
        }
      };

      eventSource.onerror = (err) => {
        onError?.(err);
      };
    } catch (e) {
      onError?.(e);
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  },
};

