export type OmnichannelChannel = 'whatsapp' | 'email' | 'call' | 'meeting' | 'interview';
export type OmnichannelStatus = 'new' | 'open' | 'pending' | 'resolved';

export interface OmnichannelCustomer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  company_name?: string;
  customer_status?: string;
  tier?: string;
  created_at?: string;
  created_on?: string;
}

export interface OmnichannelConversation {
  id: string;
  tenant_id: string;
  customer_id: string | null;
  customer?: OmnichannelCustomer;
  channel: OmnichannelChannel;
  status: OmnichannelStatus;
  conversation_status?: OmnichannelStatus;
  summary: string | null;
  last_activity_at: string;
  assigned_to: string | null;
  provider_thread_id?: string | null;
  created_on?: string;
  updated_on?: string;
}

export interface OmnichannelMessage {
  id: string;
  conversation_id: string;
  direction: 'in' | 'out';
  body: string;
  attachments?: Array<{ name: string; url: string; mimeType?: string; size?: number }>;
  subject?: string | null;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  sender_info?: string;
  provider_message_id?: string | null;
}

export interface OmnichannelCall {
  id: string;
  conversation_id: string;
  direction: 'inbound' | 'outbound';
  duration: number; // in seconds
  recording_url?: string | null;
  transcript?: string | null;
  ai_summary?: string | null;
  outcome?: string | null;
  started_at: string;
  ended_at?: string | null;
  created_at?: string;
  telephony_provider?: string;
}

export interface OmnichannelActivityLog {
  id: string;
  customer_id: string | null;
  conversation_id: string | null;
  type: string;
  detail: string;
  timestamp: string;
}

export interface ConversationDetailResponse {
  conversation: OmnichannelConversation;
  messages: OmnichannelMessage[];
  calls: OmnichannelCall[];
  activities: OmnichannelActivityLog[];
}

export interface ConversationListResponse {
  items: OmnichannelConversation[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface TimelineJourneyItem {
  id: string;
  channel: 'whatsapp' | 'email' | 'call' | 'activity';
  type: string;
  direction?: 'in' | 'out' | 'inbound' | 'outbound';
  timestamp: string;
  title: string;
  body?: string;
  subject?: string;
  duration?: number;
  recording_url?: string | null;
  transcript?: string | null;
  ai_summary?: string | null;
  outcome?: string | null;
  attachments?: any[];
  conversation_id?: string;
}

export interface Customer360Response {
  customer: OmnichannelCustomer;
  summary: {
    totalConversations: number;
    totalMessages: number;
    totalCalls: number;
    whatsappCount: number;
    emailCount: number;
    callCount: number;
  };
  conversations: OmnichannelConversation[];
  timeline: TimelineJourneyItem[];
  activities: OmnichannelActivityLog[];
}

export interface OmnichannelLeadItem {
  id: string;
  name: string;
  phone: string;
  email: string;
  status: string;
  company_name: string;
  last_channel: OmnichannelChannel | null;
  last_description: string;
  last_activity_at: string;
  communication_counts: {
    whatsapp: number;
    email: number;
    call: number;
    meeting?: number;
    interview?: number;
    total: number;
  };
  created_at?: string;
}

export interface OmnichannelLeadsResponse {
  items: OmnichannelLeadItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface OmnichannelCommunicationItem {
  id: string;
  lead_id: string;
  channel: OmnichannelChannel;
  direction: 'inbound' | 'outbound';
  description: string;
  content: {
    body?: string;
    subject?: string;
    from?: string;
    to?: string;
    transcript?: string;
    ai_summary?: string;
    outcome?: string;
    attachments?: Array<{ name: string; url: string; mimeType?: string; size?: number }>;
    thread_replies?: Array<{ sender: string; body: string; timestamp: string }>;
    [key: string]: any;
  };
  duration?: number | null;
  recording_url?: string | null;
  occurred_at: string;
  status: string;
}

export interface OmnichannelDealInsights {
  conversation_status: string;
  conversation_ended_summary: string;
  detected_intent: string;
  intent_confidence: number;
  sentiment: 'HIGH_INTENT' | 'POSITIVE' | 'NEUTRAL' | 'CONCERN';
  next_step: {
    action: string;
    due_time: string;
    reason: string;
    recommended_channel: OmnichannelChannel;
    suggested_reply: string;
  };
  resolution_guide: {
    topic: string;
    how_to_resolve: string;
    why_reason: string;
    action_type: string;
  };
}

export interface LeadTimelineResponse {
  lead: {
    id: string;
    name: string;
    phone: string;
    email: string;
    status: string;
    company_name: string;
    created_at?: string;
  };
  stats: {
    total: number;
    whatsapp: number;
    email: number;
    call: number;
    meeting?: number;
    interview?: number;
  };
  timeline: OmnichannelCommunicationItem[];
  insights?: OmnichannelDealInsights;
}

// ═══════════════════════════════════════════════════════════════════════════
// CUSTOMER-CENTRIC OMNICHANNEL 360° TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type UniversalEventType = 'WHATSAPP' | 'EMAIL' | 'CALL' | 'MEETING' | 'INTERVIEW';
export type UniversalEventDirection = 'inbound' | 'outbound' | 'internal';

export interface UniversalTimelineEvent {
  id: string;
  customer_id: string;
  event_type: UniversalEventType;
  direction: UniversalEventDirection;
  source_module: 'whatsapp' | 'email' | 'voice' | 'calendar' | 'recruitment';
  source_record_id: string;
  event_timestamp: string;
  title: string;
  description: string;
  summary: string;
  status: string;
  metadata: Record<string, any>;
}

export interface Customer360Item {
  id: string;
  name: string;
  phone: string;
  email: string;
  company_name: string;
  customer_status: string;
  tier: string;
  total_spend: number;
  last_channel: 'whatsapp' | 'email' | 'call' | 'meeting' | 'interview' | null;
  last_interaction: string;
  last_activity_at: string;
  counts: {
    whatsapp: number;
    email: number;
    call: number;
    meeting: number;
    interview: number;
    total: number;
  };
}

export interface Customer360ListResponse {
  items: Customer360Item[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface Customer360TimelineResponse {
  customer: {
    id: string;
    name: string;
    phone: string;
    email: string;
    company_name: string;
    customer_status: string;
    tier: string;
    total_spend: number;
    created_at?: string;
  };
  counts: {
    total: number;
    whatsapp: number;
    email: number;
    call: number;
    meeting: number;
    interview: number;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  events: UniversalTimelineEvent[];
}

export interface CustomerIntelligenceReport {
  customerId: string;
  customerName: string;
  journeyOverview: string;
  channelSummaries: {
    whatsapp?: string;
    email?: string;
    call?: string;
    meeting?: string;
    interview?: string;
  };
  verifiedFacts: Array<{
    fact: string;
    sourceModule: string;
    sourceId: string;
    timestamp: string;
  }>;
  objections: Array<{
    objection: string;
    resolutionStrategy: string;
    sourceModule: string;
  }>;
  customerInterests: string[];
  purchaseIntentScore: number;
  sentiment: 'HIGH_INTENT' | 'POSITIVE' | 'NEUTRAL' | 'CONCERNED';
  leadTemperature: 'HOT' | 'WARM' | 'COLD';
  nextRecommendedAction: {
    action: string;
    dueTime: string;
    reason: string;
    recommendedChannel: 'whatsapp' | 'email' | 'call';
    suggestedReply: string;
  };
}

