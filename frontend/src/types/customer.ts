export type CustomerStatus = 'ACTIVE' | 'INACTIVE' | 'CHURNED';
export type CustomerTier = 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';

export interface CrmDeal {
  id: string;
  tenant_id?: string;
  title: string;
  lead_id?: string;
  customer_id?: string;
  deal_value: number;
  currency: string;
  stage: string;
  pipeline?: string;
  probability?: number;
  closed_at?: string;
  expected_close_date?: string;
  notes?: string;
  tags?: string[];
  created_on?: string;
}

export interface CustomerInteraction {
  id: string;
  customer_id: string;
  interaction_type: 'CONVERSION' | 'VOICE_CALL' | 'WHATSAPP' | 'EMAIL' | 'NOTE' | 'DEAL' | string;
  title: string;
  description?: string;
  performer_name?: string;
  metadata?: Record<string, any>;
  created_on?: string;
}

export interface Customer {
  id: string;
  tenant_id: string;
  name: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  company_name?: string;
  job_title?: string;
  customer_status: CustomerStatus | string;
  tier: CustomerTier | string;
  total_spend: number;
  currency: string;
  converted_from_lead_id?: string;
  conversion_date?: string;
  tags?: string[];
  custom_fields?: Record<string, any>;
  notes?: string;
  created_on?: string;
  updated_on?: string;
  interactions?: CustomerInteraction[];
  deals?: CrmDeal[];
  originalLead?: any;
}

export interface CustomerMetrics {
  totalCustomers: number;
  activeCustomers: number;
  totalRevenue: number;
  convertedFromLeads: number;
  autoConversionRate: number;
}

export interface CustomerListResponse {
  items: Customer[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  metrics: CustomerMetrics;
}

export interface LeadConversionRule {
  id: string;
  tenant_id?: string;
  name: string;
  description?: string;
  rule_type?: string;
  trigger_event: string;
  outcome_trigger: string;
  match_type: 'contains' | 'exact' | 'regex' | string;
  min_call_duration_seconds: number;
  require_goal_achieved: boolean;
  priority: number;
  is_active: boolean;
  action_move_lead_stage: string;
  action_create_crm_deal: boolean;
  action_crm_deal_stage: string;
  action_deal_value: number;
  action_convert_to_customer: boolean;
  target_customer_status: string;
  target_customer_tier: string;
  action_send_email: boolean;
  action_email_trigger_type?: string;
  action_send_whatsapp: boolean;
  action_whatsapp_trigger?: string;
  auto_tags?: string[];
  created_on?: string;
}

export interface DryRunTestRequest {
  outcome: string;
  duration_seconds?: number;
  score?: number;
  goal_achieved?: boolean;
}

export interface DryRunTestResponse {
  matched: boolean;
  matchedRule?: Partial<LeadConversionRule>;
  willConvertToCustomer?: boolean;
  targetStage?: string;
  actions?: {
    moveLeadStage: string;
    convertToCustomer: boolean;
    targetCustomerStatus: string;
    targetCustomerTier: string;
    createCrmDeal: boolean;
    crmDealStage: string;
    dealValue: number;
    sendWhatsApp: boolean;
    sendEmail: boolean;
    autoTags: string[];
  };
  reason?: string;
}
