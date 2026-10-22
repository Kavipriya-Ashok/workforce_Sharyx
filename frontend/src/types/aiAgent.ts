export interface AiAgent {
  id: string;
  tenant_id: string;
  agent_key: 'receptionist' | 'sales' | 'appointment' | 'support' | 'recruitment';
  display_name: string;
  emoji: string;
  description: string;
  persona_prompt: string;
  knowledge?: string;
  allowed_tools: string[];
  handoff_targets: string[];
  channels: string[];
  announce_handoff: boolean;
  handoff_message?: string;
  fallback_message?: string;
  llm_provider?: string;
  llm_model?: string;
  temperature: number;
  sort_order: number;
  is_active: boolean;
}

export interface ConversationAgentState {
  id: string;
  tenant_id: string;
  channel: 'whatsapp' | 'email';
  conversation_ref: string;
  customer_phone?: string;
  customer_email?: string;
  customer_name?: string;
  lead_id?: string;
  active_agent: string;
  previous_agent?: string;
  handoff_count: number;
  handoff_brief?: string;
  collected_slots?: Record<string, any>;
  human_takeover: boolean;
  turn_count: number;
  last_activity_at?: string;
}

export interface AgentHandoffLog {
  id: string;
  state_id: string;
  channel: string;
  from_agent?: string;
  to_agent: string;
  reason?: string;
  trigger_message?: string;
  created_on: string;
}

export interface AgentSimulationResult {
  reply: string | null;
  agentKey: string;
  agentName: string;
  handoffs: Array<{ from: string; to: string; reason: string }>;
  humanTakeover: boolean;
  stateId?: string;
  usedLlm: boolean;
}
