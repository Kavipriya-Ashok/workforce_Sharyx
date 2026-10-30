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

    const res = await fetch(`${API_BASE}/Customer/List?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch customers');
    return res.json();
  },

  async getCustomerById(id: string): Promise<Customer> {
    const res = await fetch(`${API_BASE}/Customer/${id}`);
    if (!res.ok) throw new Error('Failed to fetch customer details');
    return res.json();
  },

  async updateCustomer(id: string, data: Partial<Customer>): Promise<Customer> {
    const res = await fetch(`${API_BASE}/Customer/Update/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update customer');
    return res.json();
  },

  async deleteCustomer(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/Customer/Delete/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete customer');
    return res.json();
  },

  async getDeals(): Promise<CrmDeal[]> {
    const res = await fetch(`${API_BASE}/Customer/Deals`);
    if (!res.ok) throw new Error('Failed to fetch CRM deals');
    return res.json();
  },

  // ─── Automation Rules & Dry Run ───────────────────────────────────────────

  async getConversionRules(): Promise<LeadConversionRule[]> {
    const res = await fetch(`${API_BASE}/Automation`);
    if (!res.ok) throw new Error('Failed to fetch conversion rules');
    return res.json();
  },

  async dryRunTest(data: DryRunTestRequest): Promise<DryRunTestResponse> {
    const res = await fetch(`${API_BASE}/Automation/DryRunTest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to perform dry-run test');
    return res.json();
  },

  async convertLeadToCustomer(leadId: string, options?: any): Promise<any> {
    const res = await fetch(`${API_BASE}/Automation/ConvertLead/${leadId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options || {}),
    });
    if (!res.ok) throw new Error('Failed to convert lead to customer');
    return res.json();
  },

  async seedDefaultRules(): Promise<LeadConversionRule[]> {
    const res = await fetch(`${API_BASE}/Automation/SeedRules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) throw new Error('Failed to seed rules');
    return res.json();
  },
};
