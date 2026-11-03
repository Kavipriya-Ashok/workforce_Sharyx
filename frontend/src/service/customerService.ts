import axios from 'axios';
import {
  Customer,
  CustomerListResponse,
  CrmDeal,
  LeadConversionRule,
  DryRunTestRequest,
  DryRunTestResponse,
} from '@/types/customer';

const API_BASE = '/api/v1';

export const customerService = {
  async getCustomers(params?: {
    page?: number;
    limit?: number;
    search?: string;
    customer_status?: string;
    tier?: string;
  }): Promise<CustomerListResponse> {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.search) query.append('search', params.search);
    if (params?.customer_status && params.customer_status !== 'ALL') query.append('customer_status', params.customer_status);
    if (params?.tier && params.tier !== 'ALL') query.append('tier', params.tier);

    const res = await axios.get(`${API_BASE}/Customer/List?${query.toString()}`);
    return res.data?.AddtionalData || res.data;
  },

  async getCustomerById(id: string): Promise<Customer> {
    const res = await axios.get(`${API_BASE}/Customer/${id}`);
    return res.data?.AddtionalData || res.data;
  },

  async updateCustomer(id: string, data: Partial<Customer>): Promise<Customer> {
    const res = await axios.put(`${API_BASE}/Customer/Update/${id}`, data);
    return res.data?.AddtionalData || res.data;
  },

  async deleteCustomer(id: string): Promise<{ success: boolean }> {
    const res = await axios.delete(`${API_BASE}/Customer/Delete/${id}`);
    return res.data?.AddtionalData || res.data;
  },

  async getDeals(): Promise<CrmDeal[]> {
    const res = await axios.get(`${API_BASE}/Customer/Deals`);
    return res.data?.AddtionalData || res.data;
  },

  // ─── Automation Rules & Dry Run ───────────────────────────────────────────

  async getConversionRules(): Promise<LeadConversionRule[]> {
    const res = await axios.get(`${API_BASE}/Automation`);
    return res.data?.AddtionalData || res.data;
  },

  async dryRunTest(data: DryRunTestRequest): Promise<DryRunTestResponse> {
    const res = await axios.post(`${API_BASE}/Automation/DryRunTest`, data);
    return res.data?.AddtionalData || res.data;
  },

  async convertLeadToCustomer(leadId: string, options?: any): Promise<any> {
    const res = await axios.post(`${API_BASE}/Automation/ConvertLead/${leadId}`, options || {});
    return res.data?.AddtionalData || res.data;
  },

  async seedDefaultRules(): Promise<LeadConversionRule[]> {
    const res = await axios.post(`${API_BASE}/Automation/SeedRules`);
    return res.data?.AddtionalData || res.data;
  },
};
