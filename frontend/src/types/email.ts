export interface EmailLog {
  id: string;
  lead_id?: string;
  from_email: string;
  to_email: string;
  subject: string;
  body_text?: string;
  body_html?: string;
  direction: 'inbound' | 'outbound';
  delivery_status: 'sent' | 'received' | 'failed';
  is_ai_drafted: boolean;
  message_id?: string;
  created_on: string;
}

export interface EmailAccountConfig {
  id?: string;
  provider?: 'google-email' | 'smtp';
  display_name?: string;
  email_address: string;
  client_id?: string;
  smtp_host?: string;
  smtp_port?: number;
  smtp_user?: string;
  smtp_password?: string;
  imap_host?: string;
  imap_port?: number;
  use_ssl?: boolean;
  is_active?: boolean;
}

export interface OAuthStatus {
  isConnected: boolean;
  provider: 'google-email' | 'smtp' | 'none';
  email_address?: string;
  display_name?: string;
  token_expires_at?: string;
}

export interface EmailValidationResult {
  isValid: boolean;
  score: number;
  reason?: string;
  isDisposable: boolean;
  isRoleBased: boolean;
  hasMxRecords: boolean;
  mxHost?: string;
}

export interface EmailAIConfig {
  id?: string;
  auto_reply_enabled: boolean;
  system_prompt?: string;
  tone: 'professional' | 'friendly' | 'persuasive';
  llm_provider?: string;
  llm_model?: string;
}

export interface EmailCampaign {
  id: string;
  campaign_name: string;
  subject: string;
  html_template: string;
  recipients_count: number;
  sent_count: number;
  opened_count: number;
  campaign_status: 'draft' | 'scheduled' | 'sending' | 'sent';
  created_on: string;
}
