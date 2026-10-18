import axios from "axios";
import { Lead, LeadFilter, LeadStats } from "@/types/lead";

const API_BASE = "/api/v1/Lead";

// Inject JWT auth token from localStorage
axios.interceptors.request.use((config) => {
  try {
    const user = localStorage.getItem("sharyx_user");
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

export class LeadService {
  public static async getLeads(
    filter: LeadFilter
  ): Promise<{ items: Lead[]; total: number; take: number; skip: number }> {
    const params = new URLSearchParams();
    if (filter.keyword) params.append("keyword", filter.keyword);
    if (filter.status && filter.status !== "ALL") params.append("status", filter.status);
    if (filter.source && filter.source !== "ALL") params.append("source", filter.source);
    if (filter.take) params.append("take", String(filter.take));
    if (filter.skip !== undefined) params.append("skip", String(filter.skip));
    if (filter.is_candidate !== undefined) params.append("is_candidate", String(filter.is_candidate));

    const res = await axios.get(`${API_BASE}/List?${params.toString()}`);
    return res.data?.AddtionalData || res.data || { items: [], total: 0 };
  }

  public static async getStats(is_candidate?: boolean): Promise<LeadStats> {
    const query = is_candidate !== undefined ? `?is_candidate=${is_candidate}` : "";
    const res = await axios.get(`${API_BASE}/Stats${query}`);
    return (
      res.data?.AddtionalData ||
      res.data || {
        totalLeads: 0,
        newToday: 0,
        qualifiedLeads: 0,
        inProgressLeads: 0,
        wonLeads: 0,
        pipelineValue: 0,
        conversionRate: 0,
      }
    );
  }

  public static async getLeadById(id: string): Promise<Lead> {
    const res = await axios.get(`${API_BASE}/ById/${id}`);
    return res.data?.AddtionalData || res.data;
  }

  public static async createLead(data: Partial<Lead>): Promise<any> {
    const res = await axios.post(`${API_BASE}/Insert`, data);
    return res.data?.AddtionalData || res.data;
  }

  public static async updateLead(id: string, data: Partial<Lead>): Promise<any> {
    const res = await axios.put(`${API_BASE}/Update/${id}`, data);
    return res.data?.AddtionalData || res.data;
  }

  public static async updateLeadStatus(id: string, lead_status: string): Promise<any> {
    const res = await axios.patch(`${API_BASE}/UpdateStatus/${id}`, { lead_status });
    return res.data?.AddtionalData || res.data;
  }

  public static async deleteLead(id: string): Promise<any> {
    const res = await axios.delete(`${API_BASE}/Delete/${id}`);
    return res.data?.AddtionalData || res.data;
  }

  public static async checkDuplicatePhone(
    phone: string,
    excludeId?: string
  ): Promise<{ is_duplicate: boolean; existing_lead?: any }> {
    if (!phone || phone.trim().length < 8) return { is_duplicate: false };
    const params = new URLSearchParams({ phone });
    if (excludeId) params.append("exclude_id", excludeId);
    const res = await axios.get(`${API_BASE}/CheckDuplicate?${params.toString()}`);
    return res.data?.AddtionalData || res.data || { is_duplicate: false };
  }

  public static async bulkDelete(ids: string[]): Promise<any> {
    const res = await axios.post(`${API_BASE}/BulkDelete`, { ids });
    return res.data?.AddtionalData || res.data;
  }

  public static async bulkUpdateStatus(ids: string[], lead_status: string): Promise<any> {
    const res = await axios.post(`${API_BASE}/BulkUpdateStatus`, { ids, lead_status });
    return res.data?.AddtionalData || res.data;
  }

  public static async addActivity(
    lead_id: string,
    title: string,
    description?: string,
    activity_type = "NOTE"
  ): Promise<any> {
    const res = await axios.post(`${API_BASE}/Activity`, {
      lead_id,
      title,
      description,
      activity_type,
    });
    return res.data?.AddtionalData || res.data;
  }

  public static async importLeads(payload: {
    rows: any[];
    duplicate_strategy?: string;
    source?: string;
  }): Promise<any> {
    const res = await axios.post(`${API_BASE}/Import`, payload);
    return res.data?.AddtionalData || res.data;
  }

  public static async approveCandidateInterview(
    id: string,
    data: {
      mode: "ONLINE" | "OFFICE";
      interview_date?: string;
      interview_time?: string;
      gmeet_link?: string;
    }
  ): Promise<any> {
    const res = await axios.post(`${API_BASE}/ApproveInterview/${id}`, data);
    return res.data?.AddtionalData || res.data;
  }
}
