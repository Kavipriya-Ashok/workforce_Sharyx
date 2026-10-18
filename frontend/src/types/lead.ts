export type LeadStatusType =
  | "NEW"
  | "CONTACTED"
  | "QUALIFIED"
  | "PROPOSAL"
  | "WON"
  | "LOST"
  | "UNQUALIFIED";

export type LeadSourceType =
  | "MANUAL"
  | "CSV_IMPORT"
  | "WEBHOOK"
  | "FORM"
  | "ZAPIER"
  | "FACEBOOK"
  | "AI_AGENT"
  | "INBOUND_CALL"
  | "WHATSAPP"
  | "EMAIL"
  | "OTHER";

export interface LeadActivity {
  id: string;
  lead_id: string;
  activity_type: string;
  title: string;
  description?: string;
  performer_name?: string;
  created_on: string;
  metadata?: Record<string, any>;
}

export interface Lead {
  id: string;
  first_name?: string;
  last_name?: string;
  name: string;
  email?: string;
  phone?: string;
  company_name?: string;
  job_title?: string;
  lead_status: LeadStatusType | string;
  source: LeadSourceType | string;
  score: number;
  deal_value: number;
  currency: string;
  notes?: string;
  tags?: string[];
  custom_fields?: Record<string, any>;
  assigned_to_id?: string;
  tenant_id: string;
  last_contacted_at?: string;
  is_candidate: boolean;
  status: boolean;
  created_on: string;
  updated_on?: string;
  activities?: LeadActivity[];
}

export interface LeadFilter {
  keyword?: string;
  status?: string;
  source?: string;
  take?: number;
  skip?: number;
  is_candidate?: boolean;
}

export interface LeadStats {
  totalLeads: number;
  newToday: number;
  qualifiedLeads: number;
  inProgressLeads: number;
  wonLeads: number;
  pipelineValue: number;
  conversionRate: number;
}
