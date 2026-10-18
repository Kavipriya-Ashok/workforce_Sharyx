export interface WhatsAppMessage {
  id: string;
  conversation_id: string;
  sender_phone: string;
  recipient_phone: string;
  direction: 'inbound' | 'outbound';
  message_type: 'text' | 'template' | 'image' | 'document';
  message_text: string;
  template_name?: string;
  meta_message_id?: string;
  delivery_status: 'sent' | 'delivered' | 'read' | 'failed';
  is_ai_generated: boolean;
  created_on: string;
}

export interface WhatsAppConversation {
  id: string;
  customer_phone: string;
  customer_name?: string;
  lead_id?: string;
  conversation_status: 'open' | 'closed' | 'waiting_human';
  last_message_text?: string;
  last_message_at: string;
  unread_count: number;
}

export interface WhatsAppConfig {
  id?: string;
  tenant_id?: string;
  phone_number: string;
  phone_number_id: string;
  waba_id?: string;
  access_token: string;
  verify_token?: string;
  provider?: 'meta_cloud' | 'qr_gateway' | 'custom_gateway' | 'twilio';
  api_url?: string;
  api_key?: string;
  is_connected?: boolean;
}

export interface WhatsAppAIConfig {
  id?: string;
  tenant_id?: string;
  is_ai_enabled: boolean;
  ai_mode: 'fully_automated' | 'hybrid' | 'manual';
  system_prompt?: string;
  welcome_message?: string;
  fallback_message?: string;
  llm_provider?: string;
  llm_model?: string;
  api_key?: string;
  auto_followup_enabled?: boolean;
  followup_delay_minutes?: number;
  followup_message?: string;
  stop_words?: string[];
}

export interface WhatsAppCampaign {
  id: string;
  tenant_id?: string;
  name: string;
  description?: string;
  trigger_event?: string;
  template_name: string;
  delay_minutes?: number;
  is_active?: boolean;
  total_recipients?: number;
  sent_count?: number;
  delivered_count?: number;
  read_count?: number;
  campaign_status?: 'draft' | 'active' | 'paused' | 'scheduled' | 'running' | 'completed' | 'failed';
  scheduled_at?: string;
  created_on?: string;
  updated_on?: string;
}

export interface WhatsAppTemplate {
  id?: string;
  tenant_id?: string;
  name: string;
  category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION' | string;
  language: string;
  header_text?: string;
  body_text?: string;
  footer_text?: string;
  buttons?: any[];
  approval_status?: 'APPROVED' | 'PENDING' | 'REJECTED' | string;
  is_active?: boolean;
  created_on?: string;
  updated_on?: string;
  components?: Array<{
    type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
    text?: string;
    format?: string;
  }>;
}
