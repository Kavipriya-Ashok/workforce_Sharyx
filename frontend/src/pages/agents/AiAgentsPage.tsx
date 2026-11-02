import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AiAgent, ConversationAgentState, AgentHandoffLog } from '@/types/aiAgent';
import { AiAgentService } from '@/service/aiAgentService';
import { VoiceService, VoiceAgentDto, VoiceCallLogItem } from '@/service/voiceService';
import { formatDistanceToNow } from 'date-fns';
import {
  Users,
  Bot,
  Sparkles,
  ArrowRightLeft,
  Calendar,
  Briefcase,
  HelpCircle,
  Headphones,
  Send,
  RefreshCw,
  UserCheck,
  ShieldAlert,
  Play,
  RotateCcw,
  CheckCircle2,
  Clock,
  ExternalLink,
  MessageSquare,
  Mail,
  Zap,
  ChevronRight,
  Cpu,
  Brain,
  GraduationCap,
  Save,
  Eye,
  EyeOff,
  ArrowRight,
  Shield,
  Wrench,
  Hash,
  Layers,
  PhoneCall,
  Pencil,
  ArrowLeft,
  Sliders,
  FileText,
  SlidersHorizontal,
  Workflow,
  Check,
  Volume2,
  ArrowDownLeft,
  ArrowUpRight,
  Copy,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { toast } from 'sonner';

// All available tools for the multi-select
const ALL_TOOLS = [
  { key: 'capture_contact', label: 'Capture Contact', icon: '📇', desc: 'Save name, email, phone, company' },
  { key: 'dispatch_voice_call', label: 'Dispatch Voice Call', icon: '📞', desc: 'Trigger outbound AI voice telephone call' },
  { key: 'send_brochure', label: 'Send Brochure', icon: '📄', desc: 'Share product brochure / catalog' },
  { key: 'qualify_lead', label: 'Qualify Lead (BANT)', icon: '🎯', desc: 'Budget, authority, need, timeline scoring' },
  { key: 'notify_sales_team', label: 'Notify Sales Team', icon: '🔥', desc: 'Alert a human sales rep' },
  { key: 'book_appointment', label: 'Book Appointment', icon: '📅', desc: 'Book demo / interview with Google Meet' },
  { key: 'cancel_appointment', label: 'Cancel Appointment', icon: '❌', desc: 'Cancel existing appointment' },
  { key: 'create_ticket', label: 'Create Ticket', icon: '🎫', desc: 'Log support issue with priority' },
  { key: 'transfer_to_human', label: 'Transfer to Human', icon: '👨‍💼', desc: 'Pause AI and hand to live agent' },
];

const ALL_AGENT_KEYS = ['receptionist', 'sales', 'appointment', 'support', 'recruitment'];

const AGENT_META: Record<string, { icon: string; gradient: string; color: string; borderColor: string; bgColor: string }> = {
  receptionist: { icon: '🛎️', gradient: 'from-amber-100 to-orange-100', color: 'text-amber-800', borderColor: 'border-amber-300', bgColor: 'bg-amber-50' },
  sales:        { icon: '💼', gradient: 'from-emerald-100 to-green-100', color: 'text-emerald-800', borderColor: 'border-emerald-300', bgColor: 'bg-emerald-50' },
  appointment:  { icon: '📅', gradient: 'from-cyan-100 to-sky-100', color: 'text-cyan-800', borderColor: 'border-cyan-300', bgColor: 'bg-cyan-50' },
  support:      { icon: '🛟', gradient: 'from-violet-100 to-purple-100', color: 'text-violet-800', borderColor: 'border-violet-300', bgColor: 'bg-violet-50' },
  recruitment:  { icon: '🎓', gradient: 'from-rose-100 to-pink-100', color: 'text-rose-800', borderColor: 'border-rose-300', bgColor: 'bg-rose-50' },
};

export interface AiAgentsPageProps {
  selectedAgentKey?: string | null;
  onSelectAgent?: (key: string | null) => void;
  onNavigateVoice?: () => void;
}

const LLM_PROVIDERS = [
  { id: 'openai', name: 'OpenAI', icon: '🤖', badge: 'Popular', defaultModel: 'gpt-4o-mini' },
  { id: 'gemini', name: 'Google Gemini', icon: '✨', badge: 'Fast & Rich', defaultModel: 'gemini-2.5-flash' },
  { id: 'anthropic', name: 'Anthropic Claude', icon: '🧠', badge: 'High Logic', defaultModel: 'claude-3-5-sonnet' },
  { id: 'groq', name: 'Groq Cloud', icon: '⚡', badge: 'Ultra-Fast', defaultModel: 'llama-3.3-70b-versatile' },
];

const MODELS_BY_PROVIDER: Record<string, { value: string; label: string; desc: string }[]> = {
  openai: [
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini', desc: 'Fast, cost-efficient, great for chat' },
    { value: 'gpt-4o', label: 'GPT-4o', desc: 'Flagship omni model, top intelligence' },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo', desc: 'High capability legacy reasoning' },
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo', desc: 'Lightweight rapid responses' },
  ],
  gemini: [
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', desc: 'Ultra-fast sub-second responses' },
    { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', desc: 'Deep logic & knowledge extraction' },
    { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash', desc: 'Fast with 1M context window' },
    { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro', desc: 'Complex reasoning & synthesis' },
  ],
  anthropic: [
    { value: 'claude-3-5-sonnet', label: 'Claude 3.5 Sonnet', desc: 'State-of-the-art dialogue & nuance' },
    { value: 'claude-3-opus', label: 'Claude 3 Opus', desc: 'Top tier comprehension' },
    { value: 'claude-3-haiku', label: 'Claude 3 Haiku', desc: 'Fast & lightweight' },
  ],
  groq: [
    { value: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B', desc: '300+ tok/s high accuracy open model' },
    { value: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B', desc: 'Sub-second conversational turns' },
    { value: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B', desc: 'MoE with 32k context' },
  ],
};

const PROMPT_SNIPPETS = [
  { label: '+ Lead Capture Rule', text: '\n- Always capture customer Name, Email, and Phone before handing off or closing.' },
  { label: '+ Sales Call Handoff', text: '\n- If the customer explicitly requests to speak with a sales agent or asks for a phone call, trigger dispatch_voice_call to connect them with our Sales Agent.' },
  { label: '+ Candidate Care', text: '\n- Answer candidate and job inquiry questions warmly using the Recruitment domain knowledge. Never mistake job questions for sales.' },
  { label: '+ Strict Guardrail', text: '\n- Strictly answer ONLY based on the Domain Knowledge provided. Never invent features or prices.' },
  { label: '+ Concise Tone', text: '\n- Keep answers warm, professional, and concise (under 2-3 sentences when possible).' },
];

export const AiAgentsPage: React.FC<AiAgentsPageProps> = ({ selectedAgentKey, onSelectAgent, onNavigateVoice }) => {
  const [agents, setAgents] = useState<AiAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editingAgent, setEditingAgent] = useState<AiAgent | null>(null);
  const [saving, setSaving] = useState(false);
  const [handoffsDialogOpen, setHandoffsDialogOpen] = useState(false);
  const [statesDialogOpen, setStatesDialogOpen] = useState(false);
  const [states, setStates] = useState<ConversationAgentState[]>([]);
  const [stateHandoffs, setStateHandoffs] = useState<AgentHandoffLog[]>([]);
  const [selectedState, setSelectedState] = useState<ConversationAgentState | null>(null);

  // Voice Telephony & Vapi Integration
  const [voiceAgents, setVoiceAgents] = useState<VoiceAgentDto[]>([]);
  const [agentCallLogs, setAgentCallLogs] = useState<VoiceCallLogItem[]>([]);
  const [loadingVoiceLogs, setLoadingVoiceLogs] = useState(false);
  const [testCallModalOpen, setTestCallModalOpen] = useState(false);
  const [testCallPhone, setTestCallPhone] = useState('');
  const [dispatchingTestCall, setDispatchingTestCall] = useState(false);
  const [expandedCallTranscriptId, setExpandedCallTranscriptId] = useState<string | null>(null);

  const loadVoiceAgents = async () => {
    try {
      const vas = await VoiceService.listAgents();
      setVoiceAgents(vas);
    } catch {
      // non-fatal
    }
  };

  const loadAgentCallLogs = async (agentKey: string, matchingVoiceId?: string) => {
    setLoadingVoiceLogs(true);
    try {
      const logs = await VoiceService.getCallLogs(undefined, 30, matchingVoiceId || agentKey, true);
      setAgentCallLogs(Array.isArray(logs) ? logs : []);
    } catch {
      setAgentCallLogs([]);
    } finally {
      setLoadingVoiceLogs(false);
    }
  };

  const loadAgents = async () => {
    setLoading(true);
    try {
      const data = await AiAgentService.list();
      setAgents(data);
    } catch {
      toast.error('Failed to load agents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAgents();
    loadVoiceAgents();
  }, []);

  // Sync state when selectedAgentKey changes
  useEffect(() => {
    setIsEditing(false);
    if (!agents.length) return;
    if (selectedAgentKey) {
      const match =
        agents.find(
          (a) =>
            a.agent_key === selectedAgentKey ||
            a.id === selectedAgentKey ||
            a.display_name.toLowerCase() === selectedAgentKey.toLowerCase()
        ) ||
        (() => {
          const va = voiceAgents.find(
            (v) => v.id === selectedAgentKey || v.template_key === selectedAgentKey || v.name === selectedAgentKey
          );
          if (va) {
            return {
              id: va.id,
              tenant_id: 'default',
              agent_key: va.template_key || va.id,
              display_name: va.name,
              role_title: 'Voice Telephony Specialist',
              description: va.system_prompt?.slice(0, 100) || 'Configured Vapi Assistant',
              persona_prompt: va.system_prompt || '',
              knowledge: '',
              allowed_tools: typeof va.allowed_tools === 'string' ? (va.allowed_tools as any).split(' ') : (va.allowed_tools || []),
              handoff_targets: [],
              handoff_message: va.first_message || '',
              llm_provider: va.provider || 'vapi',
              llm_model: va.llm_model || 'gpt-4o-mini',
              temperature: va.temperature ?? 0.4,
              is_active: va.status !== false,
              channels: ['voice'],
              emoji: '🤖',
            } as unknown as AiAgent;
          }
          return null;
        })();

      if (match) {
        setEditingAgent({ ...match });
      }

      const matchingVoiceAgent = voiceAgents.find(
        (va) =>
          va.id === selectedAgentKey ||
          va.template_key === selectedAgentKey ||
          va.name.toLowerCase().includes(selectedAgentKey.toLowerCase()) ||
          (selectedAgentKey === 'sales' && /sales|alex/i.test(va.name)) ||
          (selectedAgentKey === 'recruitment' && /recrui|maya|sarah/i.test(va.name)) ||
          (selectedAgentKey === 'appointment' && /appoint|rachel/i.test(va.name)) ||
          (selectedAgentKey === 'receptionist' && /reception/i.test(va.name)) ||
          (selectedAgentKey === 'support' && /support/i.test(va.name))
      );
      loadAgentCallLogs(selectedAgentKey, matchingVoiceAgent?.id);
    } else {
      setEditingAgent(null);
      setAgentCallLogs([]);
    }
  }, [selectedAgentKey, agents, voiceAgents]);

  const handleSave = async () => {
    if (!editingAgent) return;
    setSaving(true);
    try {
      const updated = await AiAgentService.update(editingAgent.id, editingAgent);
      toast.success(`${editingAgent.display_name} configuration updated successfully!`);
      setIsEditing(false);
      await loadAgents();
      if (updated) {
        setEditingAgent({ ...updated });
      }
    } catch {
      toast.error('Failed to save agent configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async (agent: AiAgent) => {
    try {
      const reset = await AiAgentService.reset(agent.id);
      toast.success(`${agent.display_name} reset to defaults!`);
      setIsEditing(false);
      await loadAgents();
      if (reset) {
        setEditingAgent({ ...reset });
      }
    } catch {
      toast.error('Failed to reset');
    }
  };

  const toggleTool = (tool: string) => {
    if (!editingAgent) return;
    const tools = [...(editingAgent.allowed_tools || [])];
    if (tools.includes(tool)) {
      setEditingAgent({ ...editingAgent, allowed_tools: tools.filter((t) => t !== tool) });
    } else {
      setEditingAgent({ ...editingAgent, allowed_tools: [...tools, tool] });
    }
  };

  const toggleHandoffTarget = (target: string) => {
    if (!editingAgent) return;
    const targets = [...(editingAgent.handoff_targets || [])];
    if (targets.includes(target)) {
      setEditingAgent({ ...editingAgent, handoff_targets: targets.filter((t) => t !== target) });
    } else {
      setEditingAgent({ ...editingAgent, handoff_targets: [...targets, target] });
    }
  };

  const toggleChannel = (ch: string) => {
    if (!editingAgent) return;
    const channels = [...(editingAgent.channels || [])];
    if (channels.includes(ch)) {
      setEditingAgent({ ...editingAgent, channels: channels.filter((c) => c !== ch) });
    } else {
      setEditingAgent({ ...editingAgent, channels: [...channels, ch] });
    }
  };

  const getMeta = (key: string) => AGENT_META[key] || AGENT_META.receptionist;

  const handleViewStates = async () => {
    try {
      const data = await AiAgentService.listStates();
      setStates(data);
      setStatesDialogOpen(true);
    } catch {
      toast.error('Failed to load states');
    }
  };

  const handleViewHandoffs = async (st: ConversationAgentState) => {
    setSelectedState(st);
    try {
      const list = await AiAgentService.getHandoffs(st.id);
      setStateHandoffs(list);
      setHandoffsDialogOpen(true);
    } catch {
      toast.error('Failed to load handoffs');
    }
  };

  // Find the selected segregated agent (matches by agent_key or ID or name)
  const segregatedAgent = selectedAgentKey
    ? agents.find(
        (a) =>
          a.agent_key === selectedAgentKey ||
          a.id === selectedAgentKey ||
          a.display_name.toLowerCase() === selectedAgentKey.toLowerCase()
      ) ||
      (() => {
        // Fallback: If clicked a Vapi agent from sidebar that isn't in chat agents, wrap it as an AiAgent
        const va = voiceAgents.find((v) => v.id === selectedAgentKey || v.template_key === selectedAgentKey || v.name === selectedAgentKey);
        if (va) {
          return {
            id: va.id,
            tenant_id: 'default',
            agent_key: va.template_key || va.id,
            display_name: va.name,
            role_title: 'Voice Telephony Specialist',
            description: va.system_prompt?.slice(0, 100) || 'Configured Vapi Assistant',
            persona_prompt: va.system_prompt || '',
            knowledge: '',
            allowed_tools: typeof va.allowed_tools === 'string' ? (va.allowed_tools as any).split(' ') : (va.allowed_tools || []),
            handoff_targets: [],
            handoff_message: va.first_message || '',
            llm_provider: va.provider || 'vapi',
            llm_model: va.llm_model || 'gpt-4o-mini',
            temperature: va.temperature ?? 0.4,
            is_active: va.status !== false,
            channels: ['voice'],
            emoji: '🤖',
          } as unknown as AiAgent;
        }
        return null;
      })()
    : null;

  const segregatedMeta = segregatedAgent ? getMeta(segregatedAgent.agent_key) : null;

  return (
    <div className="space-y-4">
      {/* ── CHANNEL DIFFERENTIATION BANNER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-gradient-to-r from-cyan-50 via-indigo-50/70 to-blue-50 border border-cyan-200/90 text-xs shadow-xs">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-cyan-100 border border-cyan-200 flex items-center justify-center text-cyan-700 shrink-0">
            <PhoneCall className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 text-xs">Looking for Phone / Voice Calling Assistants?</span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-cyan-100 text-cyan-800 border border-cyan-200 uppercase">
                Vapi & Telephony
              </span>
            </div>
            <p className="text-[11px] text-slate-600 mt-0.5">
              These 5 agents handle <strong>WhatsApp & Email text chat</strong> with seamless outbound <strong>Sales Phone Calling</strong> handoffs.
            </p>
          </div>
        </div>
        {onNavigateVoice && (
          <button
            onClick={onNavigateVoice}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:brightness-105 text-white font-bold text-xs flex items-center gap-1.5 shrink-0 transition-all cursor-pointer shadow-sm shadow-cyan-600/20 self-start sm:self-auto"
          >
            <PhoneCall className="h-3.5 w-3.5 fill-current" />
            <span>Open Voice Telephony Studio</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* ── TOP HEADER / NAVIGATION STRIP ── */}
      <div className="relative overflow-hidden p-5 rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 border border-indigo-200 flex items-center justify-center text-indigo-700 shrink-0 shadow-xs">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-bold text-slate-900 tracking-tight">AI Agent Workforce</h1>
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] py-0.5">
                  Multi-Agent Team
                </Badge>
                {segregatedAgent && (
                  <Badge variant="outline" className={`text-[10px] py-0.5 ${segregatedMeta?.color} ${segregatedMeta?.borderColor} ${segregatedMeta?.bgColor} font-semibold`}>
                    Segregated View: {segregatedAgent.display_name}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
                Autonomous AI agents collaborating on WhatsApp & Email with live telephone sales calling handoffs.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleViewStates}
              className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50 gap-1.5 text-xs h-8"
            >
              <Layers className="h-3.5 w-3.5 text-cyan-600" />
              Active Sessions
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={loadAgents}
              className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50 gap-1.5 text-xs h-8"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Agent Navigation Strip */}
        <div className="relative mt-5 pt-4 border-t border-slate-200 flex items-center justify-start sm:justify-center gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => {
              setIsEditing(false);
              onSelectAgent?.(null);
            }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all text-xs font-semibold shrink-0 ${
              !selectedAgentKey
                ? 'bg-purple-100 text-purple-900 border-purple-300 shadow-xs'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5 text-purple-600" />
            <span>All Assistants Overview</span>
          </button>
          <div className="h-5 w-[1px] bg-slate-200 shrink-0 mx-1" />

          {agents.map((agent, idx) => {
            const meta = getMeta(agent.agent_key);
            const isSelected = selectedAgentKey === agent.agent_key;
            return (
              <React.Fragment key={agent.id}>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    onSelectAgent?.(agent.agent_key);
                  }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all text-xs font-medium shrink-0 ${
                    isSelected
                      ? `${meta.bgColor} ${meta.color} ${meta.borderColor} shadow-xs font-bold ring-1 ring-indigo-200`
                      : agent.is_active
                      ? 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                      : 'bg-slate-100 text-slate-400 border-slate-200 opacity-60'
                  }`}
                >
                  <span className="text-base">{agent.emoji || meta.icon}</span>
                  <span>{agent.display_name}</span>
                  {!agent.is_active && <EyeOff className="h-3 w-3 text-slate-400" />}
                </button>
                {idx < agents.length - 1 && (
                  <ArrowRight className="h-3.5 w-3.5 text-slate-300 shrink-0" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* ── CASE 1: SEGREGATED ASSISTANT PAGE (When selectedAgentKey is set) ── */}
      {selectedAgentKey && segregatedAgent && segregatedMeta ? (
        <div className="space-y-4">
          {/* Segregated Assistant Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border border-slate-200 bg-white shadow-xs">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsEditing(false);
                  onSelectAgent?.(null);
                }}
                className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50 gap-1.5 text-xs h-9 px-3"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Overview</span>
              </Button>
              <div className="h-8 w-[1px] bg-slate-200" />
              <div className="flex items-center gap-3">
                <div className={`h-11 w-11 rounded-xl bg-gradient-to-br ${segregatedMeta.gradient} border ${segregatedMeta.borderColor} flex items-center justify-center text-2xl shadow-xs shrink-0`}>
                  {segregatedAgent.emoji || segregatedMeta.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base font-bold text-slate-900">{segregatedAgent.display_name}</h2>
                    <Badge variant="outline" className={`text-[10px] font-mono py-0 px-2 uppercase ${segregatedMeta.color} ${segregatedMeta.borderColor} ${segregatedMeta.bgColor}`}>
                      {segregatedAgent.agent_key}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] font-mono py-0 px-2 text-cyan-800 border-cyan-300 bg-cyan-50">
                      {segregatedAgent.llm_provider || 'openai'}: {segregatedAgent.llm_model || 'gpt-4o-mini'}
                    </Badge>
                    <Badge className={`text-[10px] py-0 px-2 ${segregatedAgent.is_active ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-slate-100 text-slate-500'}`}>
                      {segregatedAgent.is_active ? '● Active' : '○ Inactive'}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{segregatedAgent.description}</p>
                </div>
              </div>
            </div>

            {/* Edit / Save Action Button on Segregated Page */}
            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              {!isEditing ? (
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingAgent({ ...segregatedAgent });
                    setIsEditing(true);
                  }}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold gap-2 px-4 h-9 shadow-sm shadow-indigo-600/20"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  <span>Edit Assistant</span>
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsEditing(false);
                      setEditingAgent({ ...segregatedAgent });
                    }}
                    className="text-xs text-slate-600 hover:text-slate-900 h-9"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold gap-1.5 px-4 h-9 shadow-sm shadow-emerald-600/20"
                  >
                    <Save className="h-3.5 w-3.5" />
                    <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                  </Button>
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleReset(segregatedAgent)}
                className="border-slate-200 text-slate-600 hover:text-rose-600 hover:border-rose-200 gap-1.5 text-xs h-9"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset</span>
              </Button>
            </div>
          </div>

          {/* ── SUB-VIEW A: READ-ONLY SEGREGATED ASSISTANT DETAILS (Default) ── */}
          {!isEditing && (
            <div className="space-y-4">
              {/* Row 1: Engine & Capabilities */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Engine Card */}
                <Card className="border-slate-200 bg-white p-5 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Cpu className="h-4 w-4 text-cyan-600" />
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">LLM Engine</h4>
                    </div>
                    <Badge variant="outline" className="text-[10px] text-cyan-700 border-cyan-300 bg-cyan-50">
                      {segregatedAgent.llm_provider || 'openai'}
                    </Badge>
                  </div>
                  <div className="space-y-2 pt-1 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Model Name</span>
                      <span className="font-mono font-semibold text-slate-800">{segregatedAgent.llm_model || 'gpt-4o-mini'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Temperature</span>
                      <span className="font-mono font-semibold text-indigo-600">{segregatedAgent.temperature ?? 0.4}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-500">Channels</span>
                      <div className="flex items-center gap-1">
                        {(segregatedAgent.channels || []).includes('whatsapp') && (
                          <Badge variant="outline" className="text-[9px] py-0 text-emerald-700 border-emerald-300 bg-emerald-50">
                            WhatsApp
                          </Badge>
                        )}
                        {(segregatedAgent.channels || []).includes('email') && (
                          <Badge variant="outline" className="text-[9px] py-0 text-blue-700 border-blue-300 bg-blue-50">
                            Email
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Allowed Tools Card */}
                <Card className="border-slate-200 bg-white p-5 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Wrench className="h-4 w-4 text-amber-600" />
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Allowed Tools</h4>
                    </div>
                    <span className="text-[10px] text-slate-500">{(segregatedAgent.allowed_tools || []).length} active</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {(segregatedAgent.allowed_tools || []).map((tKey) => {
                      const tObj = ALL_TOOLS.find((t) => t.key === tKey);
                      return (
                        <div key={tKey} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50/70 border border-emerald-200 text-emerald-800 text-[11px] font-medium">
                          <span>{tObj?.icon || '⚙️'}</span>
                          <span>{tObj?.label || tKey}</span>
                        </div>
                      );
                    })}
                  </div>
                </Card>

                {/* Handoff Targets Card */}
                <Card className="border-slate-200 bg-white p-5 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ArrowRightLeft className="h-4 w-4 text-indigo-600" />
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Handoff Targets</h4>
                    </div>
                    <span className="text-[10px] text-slate-500">{(segregatedAgent.handoff_targets || []).length} specialists</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {(segregatedAgent.handoff_targets || []).map((targetKey) => {
                      const m = getMeta(targetKey);
                      return (
                        <div key={targetKey} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-medium ${m.bgColor} ${m.borderColor} ${m.color}`}>
                          <span>{m.icon}</span>
                          <span className="capitalize">{targetKey}</span>
                        </div>
                      );
                    })}
                  </div>
                  {segregatedAgent.handoff_message && (
                    <p className="text-[10px] text-slate-500 italic pt-1 truncate">
                      "{segregatedAgent.handoff_message}"
                    </p>
                  )}
                </Card>
              </div>

              {/* Row 2: System Persona Prompt */}
              <Card className="border-slate-200 bg-white p-5 space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Brain className="h-4 w-4 text-purple-600" />
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">System Persona & Prompt</h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500 font-mono">
                      {(segregatedAgent.persona_prompt || '').length} characters
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingAgent({ ...segregatedAgent });
                        setIsEditing(true);
                      }}
                      className="text-xs text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 h-7 px-2 gap-1"
                    >
                      <Pencil className="h-3 w-3" /> Edit Prompt
                    </Button>
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-800 whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto">
                  {segregatedAgent.persona_prompt}
                </div>
              </Card>

              {/* Row 3: Domain Knowledge Base */}
              <Card className="border-slate-200 bg-white p-5 space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-emerald-600" />
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Domain Knowledge Base</h4>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditingAgent({ ...segregatedAgent });
                      setIsEditing(true);
                    }}
                    className="text-xs text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 h-7 px-2 gap-1"
                  >
                    <Pencil className="h-3 w-3" /> Edit Knowledge
                  </Button>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-800 whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
                  {segregatedAgent.knowledge || 'No domain knowledge base configured for this assistant.'}
                </div>
              </Card>

              {/* ── ROW 4: CONFIGURED VAPI VOICE ASSISTANT DETAILS ── */}
              {(() => {
                const matchedVapiAgent = voiceAgents.find(
                  (va) =>
                    va.template_key === segregatedAgent.agent_key ||
                    va.name.toLowerCase().includes(segregatedAgent.agent_key.toLowerCase()) ||
                    (segregatedAgent.agent_key === 'sales' && /sales|alex/i.test(va.name)) ||
                    (segregatedAgent.agent_key === 'recruitment' && /recrui|maya|sarah/i.test(va.name)) ||
                    (segregatedAgent.agent_key === 'appointment' && /appoint|rachel/i.test(va.name)) ||
                    (segregatedAgent.agent_key === 'receptionist' && /reception/i.test(va.name)) ||
                    (segregatedAgent.agent_key === 'support' && /support/i.test(va.name))
                );

                return (
                  <Card className="border-blue-100 bg-gradient-to-br from-white via-blue-50/20 to-indigo-50/30 p-5 space-y-4 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-blue-100 pb-3">
                      <div className="flex items-center gap-3">
                        <span className="p-2 rounded-xl bg-blue-600 text-white shadow-xs">
                          <PhoneCall className="h-4 w-4" />
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                              Configured Vapi Voice Assistant
                            </h4>
                            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[9px] font-bold">
                              ● Telephony Ready
                            </Badge>
                          </div>
                          <p className="text-[11px] text-slate-500">
                            Remote phone assistant dynamically connected to this chat agent
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {onNavigateVoice && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={onNavigateVoice}
                            className="text-xs border-slate-200 text-slate-600 hover:text-blue-600 h-8 gap-1.5"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Telephony Studio
                          </Button>
                        )}
                        <Button
                          size="sm"
                          onClick={() => setTestCallModalOpen(true)}
                          className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold h-8 px-3 gap-1.5 shadow-xs"
                        >
                          <PhoneCall className="h-3 w-3" />
                          Trigger Test Call
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                      <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-1">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Agent Name & Remote ID</span>
                        <div className="font-semibold text-slate-900 truncate">
                          {matchedVapiAgent?.name || `${segregatedAgent.display_name} (Voice)`}
                        </div>
                        <div className="font-mono text-[10px] text-blue-600 flex items-center justify-between">
                          <span className="truncate">{matchedVapiAgent?.remote_agent_id || 'vapi_default_agent'}</span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(matchedVapiAgent?.remote_agent_id || '');
                              toast.success('Agent ID copied to clipboard');
                            }}
                            className="p-1 hover:text-blue-800"
                            title="Copy ID"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-1">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Voice Provider & Engine</span>
                        <div className="font-semibold text-slate-900 capitalize">
                          {matchedVapiAgent?.provider || 'Vapi.ai'} (Nova-2 + {matchedVapiAgent?.llm_model || 'gpt-4o-mini'})
                        </div>
                        <div className="text-[10px] text-slate-500">
                          Latency: ~450ms · Webhook Event Outbound
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-1">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">First Spoken Greeting</span>
                        <p className="text-[11px] text-slate-700 italic line-clamp-2">
                          "{matchedVapiAgent?.first_message || `Hello there! I'm ${segregatedAgent.display_name} from Sharyx. How can I help you today?`}"
                        </p>
                      </div>
                    </div>
                  </Card>
                );
              })()}

              {/* ── ROW 5: LIVE CALL LOGS & OUTCOMES FOR THIS ASSISTANT ── */}
              <Card className="border-slate-200 bg-white p-5 space-y-4 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                      <Clock className="h-4 w-4" />
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                          Live Call Logs & Vapi Outcomes
                        </h4>
                        <Badge variant="outline" className="text-[10px] py-0 px-2 bg-indigo-50 text-indigo-700 border-indigo-200 font-semibold">
                          {agentCallLogs.length} calls recorded
                        </Badge>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Recent voice telephone sessions handled by this assistant
                      </p>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const matched = voiceAgents.find(
                        (va) =>
                          va.template_key === segregatedAgent.agent_key ||
                          va.name.toLowerCase().includes(segregatedAgent.agent_key.toLowerCase()) ||
                          (segregatedAgent.agent_key === 'sales' && /sales|alex/i.test(va.name))
                      );
                      loadAgentCallLogs(segregatedAgent.agent_key, matched?.id);
                    }}
                    className="border-slate-200 text-slate-600 hover:text-slate-900 text-xs h-8 gap-1.5"
                  >
                    <RefreshCw className={`h-3 w-3 ${loadingVoiceLogs ? 'animate-spin' : ''}`} />
                    Refresh Call History
                  </Button>
                </div>

                {loadingVoiceLogs ? (
                  <div className="py-8 flex items-center justify-center gap-2 text-xs text-slate-400">
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    Loading agent call logs...
                  </div>
                ) : agentCallLogs.length === 0 ? (
                  <div className="p-6 rounded-xl border border-dashed border-slate-200 text-center space-y-1 bg-slate-50/50">
                    <PhoneCall className="h-5 w-5 text-slate-400 mx-auto" />
                    <p className="text-xs font-semibold text-slate-700">No calls recorded for this assistant yet</p>
                    <p className="text-[11px] text-slate-400">
                      Click "Trigger Test Call" above or call from the CRM leads table to test voice interaction.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                    {agentCallLogs.map((log) => {
                      const isExpanded = expandedCallTranscriptId === log.id;
                      const durationMin = Math.floor((log.duration_seconds || 0) / 60);
                      const durationSec = (log.duration_seconds || 0) % 60;
                      const durationFormatted = `${durationMin}:${durationSec.toString().padStart(2, '0')}`;

                      return (
                        <div
                          key={log.id}
                          className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all space-y-2.5 shadow-xs"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5 flex-wrap">
                              <span
                                className={`p-1 px-1.5 rounded-md text-[10px] font-bold uppercase flex items-center gap-1 ${
                                  log.direction === 'inbound'
                                    ? 'bg-cyan-50 text-cyan-700 border border-cyan-200'
                                    : 'bg-blue-50 text-blue-700 border border-blue-200'
                                }`}
                              >
                                {log.direction === 'inbound' ? (
                                  <ArrowDownLeft className="h-3 w-3" />
                                ) : (
                                  <ArrowUpRight className="h-3 w-3" />
                                )}
                                {log.direction}
                              </span>

                              <span className="font-semibold text-xs text-slate-900 font-mono">
                                {log.customer_phone || 'Unknown Phone'}
                              </span>

                              {log.customer_name && (
                                <span className="text-xs text-slate-500 font-medium">
                                  ({log.customer_name})
                                </span>
                              )}

                              <Badge
                                variant="outline"
                                className={`text-[9px] uppercase font-semibold py-0 ${
                                  log.call_status === 'completed'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {log.call_status}
                              </Badge>
                            </div>

                            <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {durationFormatted}
                              </span>
                              <span>•</span>
                              <span>{log.created_on ? formatDistanceToNow(new Date(log.created_on), { addSuffix: true }) : 'Recent'}</span>
                            </div>
                          </div>

                          {/* OUTCOME BADGE */}
                          {log.call_outcome && (
                            <div className="flex items-center gap-2 pt-0.5">
                              <span className="text-[10px] text-slate-400 uppercase font-semibold">Outcome:</span>
                              {log.call_outcome.toLowerCase().includes('quotation') ? (
                                <Badge className="bg-purple-100 text-purple-800 border-purple-300 text-[10px] font-semibold">
                                  📄 Quotation Requested
                                </Badge>
                              ) : log.call_outcome.toLowerCase().includes('demo') || log.call_outcome.toLowerCase().includes('meeting') ? (
                                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] font-semibold">
                                  📅 Demo Booked
                                </Badge>
                              ) : log.call_outcome.toLowerCase().includes('interview') ? (
                                <Badge className="bg-cyan-100 text-cyan-800 border-cyan-300 text-[10px] font-semibold">
                                  🎓 Interview Scheduled
                                </Badge>
                              ) : log.call_outcome.toLowerCase().includes('not_interested') ? (
                                <Badge className="bg-rose-100 text-rose-800 border-rose-300 text-[10px] font-semibold">
                                  ❌ Not Interested
                                </Badge>
                              ) : (
                                <Badge className="bg-blue-100 text-blue-800 border-blue-300 text-[10px] font-semibold">
                                  ✨ {log.call_outcome}
                                </Badge>
                              )}
                            </div>
                          )}

                          {/* SUMMARY */}
                          {log.summary && (
                            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs text-slate-700 leading-relaxed">
                              <span className="font-semibold text-slate-900 block text-[10px] uppercase tracking-wider mb-0.5">
                                AI Call Summary:
                              </span>
                              {log.summary}
                            </div>
                          )}

                          {/* AUDIO PLAYER */}
                          {log.recording_url && (
                            <div className="pt-1">
                              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1 flex items-center gap-1">
                                <Volume2 className="h-3 w-3 text-blue-600" />
                                Recording Audio:
                              </span>
                              <audio
                                controls
                                src={log.recording_url}
                                preload="none"
                                className="w-full h-8 rounded-lg bg-slate-50 border border-slate-200"
                              />
                            </div>
                          )}

                          {/* TRANSCRIPT TOGGLE */}
                          {log.transcript && (
                            <div className="pt-1 border-t border-slate-100">
                              <button
                                type="button"
                                onClick={() => setExpandedCallTranscriptId(isExpanded ? null : log.id)}
                                className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors"
                              >
                                <span>{isExpanded ? 'Hide Call Transcript' : 'View Full Transcript'}</span>
                                {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                              </button>

                              {isExpanded && (
                                <div className="mt-2 p-3 rounded-xl bg-slate-900 text-slate-100 text-xs font-mono max-h-52 overflow-y-auto space-y-2 leading-relaxed">
                                  {log.transcript.split('\n').filter(Boolean).map((line, idx) => {
                                    const isBot = line.toLowerCase().startsWith('ai:') || line.toLowerCase().startsWith('assistant:') || line.toLowerCase().startsWith('bot:');
                                    return (
                                      <div
                                        key={idx}
                                        className={`p-2 rounded-lg ${
                                          isBot ? 'bg-slate-800 text-blue-300 border-l-2 border-blue-400' : 'bg-slate-800/60 text-slate-200'
                                        }`}
                                      >
                                        {line}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>

              {/* Bottom Quick Edit Banner */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-50 via-purple-50 to-slate-50 border border-indigo-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs">
                <div>
                  <h4 className="font-semibold text-slate-900">Need to adjust {segregatedAgent.display_name}'s behavior or tools?</h4>
                  <p className="text-slate-500 text-[11px] mt-0.5">
                    Click the Edit Assistant button above or below to change prompts, temperature, tools, or handoff rules.
                  </p>
                </div>
                <Button
                  onClick={() => {
                    setEditingAgent({ ...segregatedAgent });
                    setIsEditing(true);
                  }}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold gap-1.5 self-start sm:self-auto shrink-0 shadow-xs"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit Configuration
                </Button>
              </div>
            </div>
          )}

          {/* ── SUB-VIEW B: EDITING SEGREGATED ASSISTANT FORM (When isEditing is true) ── */}
          {isEditing && editingAgent && (
            <Card className="border border-indigo-200 bg-white shadow-xl ring-1 ring-indigo-100">
              <CardHeader className="border-b border-slate-100 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700">
                      <Pencil className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-bold text-slate-900">
                        Edit Assistant Configuration — {editingAgent.display_name}
                      </CardTitle>
                      <CardDescription className="text-xs text-slate-500">
                        Changes update this assistant directly without creating duplicate records and take effect immediately.
                      </CardDescription>
                    </div>
                  </div>
                  <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px] py-1 px-2.5">
                    Live Editing
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="pt-6 pb-6 px-6 space-y-6">
                {/* ── SECTION 1: LLM PROVIDER & MODEL CONFIG ───────── */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Cpu className="h-4 w-4 text-cyan-600" />
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">LLM Provider & Model</h4>
                    </div>
                    <Badge variant="outline" className="text-[10px] text-cyan-800 border-cyan-300 bg-cyan-50">
                      Provider-Agnostic LLM
                    </Badge>
                  </div>

                  {/* Provider Selector Buttons */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium text-slate-600">Select LLM Provider</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {LLM_PROVIDERS.map((prov) => {
                        const isSelected = (editingAgent.llm_provider || 'openai') === prov.id;
                        return (
                          <button
                            key={prov.id}
                            type="button"
                            onClick={() => {
                              const currentModels = MODELS_BY_PROVIDER[prov.id] || [];
                              const defaultModel = prov.defaultModel || currentModels[0]?.value;
                              setEditingAgent({
                                ...editingAgent,
                                llm_provider: prov.id,
                                llm_model: defaultModel,
                              });
                            }}
                            className={`flex items-center justify-between p-2.5 rounded-xl border text-left transition-all ${
                              isSelected
                                ? 'bg-cyan-50 border-cyan-400 text-cyan-900 shadow-xs ring-1 ring-cyan-200'
                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-800'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-base">{prov.icon}</span>
                              <span className="text-xs font-semibold">{prov.name}</span>
                            </div>
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-700">
                              {prov.badge}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                    {/* Model Dropdown */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-medium text-slate-600">
                        Model ({(editingAgent.llm_provider || 'openai').toUpperCase()})
                      </label>
                      <Select
                        value={editingAgent.llm_model || MODELS_BY_PROVIDER[editingAgent.llm_provider || 'openai']?.[0]?.value}
                        onValueChange={(val) => setEditingAgent({ ...editingAgent, llm_model: val || undefined } as any)}
                      >
                        <SelectTrigger className="bg-slate-50 border-slate-200 text-xs h-9 text-slate-800">
                          <SelectValue placeholder="Select model..." />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-slate-200 shadow-xl">
                          {(MODELS_BY_PROVIDER[editingAgent.llm_provider || 'openai'] || []).map((m) => (
                            <SelectItem key={m.value} value={m.value} className="text-xs">
                              <div className="flex flex-col text-left py-0.5">
                                <span className="font-semibold text-slate-900">{m.label}</span>
                                <span className="text-[10px] text-slate-500">{m.desc}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Temperature Slider */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-medium text-slate-600">Temperature</label>
                        <span className="text-[10px] text-indigo-600 font-mono font-semibold">
                          {editingAgent.temperature} (
                          {editingAgent.temperature < 0.3 ? 'Deterministic' : editingAgent.temperature > 0.6 ? 'Creative' : 'Balanced'}
                          )
                        </span>
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={editingAgent.temperature ?? 0.4}
                          onChange={(e) => setEditingAgent({ ...editingAgent, temperature: parseFloat(e.target.value) })}
                          className="flex-1 accent-indigo-600 h-1.5"
                        />
                        <span className="text-xs font-mono text-slate-700 w-8 text-right">{editingAgent.temperature ?? 0.4}</span>
                      </div>
                    </div>

                    {/* Display Name */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-medium text-slate-600">Display Name</label>
                      <Input
                        value={editingAgent.display_name}
                        onChange={(e) => setEditingAgent({ ...editingAgent, display_name: e.target.value })}
                        className="bg-slate-50 border-slate-200 text-xs h-9 text-slate-900 font-medium focus:bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* ── SECTION 2: PROMPT & KNOWLEDGE ───────────────── */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Brain className="h-4 w-4 text-purple-600" />
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Prompt — What Should This Agent Do?
                      </h4>
                    </div>
                    <span className="text-[10px] text-slate-500">
                      System instructions defining persona, goals & boundaries
                    </span>
                  </div>

                  {/* Prompt Quick Snippets */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] text-slate-500 font-semibold uppercase mr-1">Quick Add:</span>
                    {PROMPT_SNIPPETS.map((snip) => (
                      <button
                        key={snip.label}
                        type="button"
                        onClick={() => {
                          const updated = (editingAgent.persona_prompt || '') + snip.text;
                          setEditingAgent({ ...editingAgent, persona_prompt: updated });
                          toast.info(`Added snippet: ${snip.label}`);
                        }}
                        className="px-2 py-1 rounded-md bg-purple-50 border border-purple-200 text-[10px] text-purple-700 hover:bg-purple-100 hover:border-purple-300 transition-all font-medium"
                      >
                        {snip.label}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-medium text-slate-700 flex items-center justify-between">
                        <span>System Persona & Instructions Prompt</span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {(editingAgent.persona_prompt || '').length} characters
                        </span>
                      </label>
                      <Textarea
                        rows={8}
                        value={editingAgent.persona_prompt}
                        onChange={(e) => setEditingAgent({ ...editingAgent, persona_prompt: e.target.value })}
                        placeholder="Enter the system prompt that defines what this agent does..."
                        className="bg-slate-50 border-slate-200 text-xs font-mono leading-relaxed text-slate-800 focus:bg-white focus:border-purple-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-medium text-slate-700 flex items-center justify-between">
                        <span>Domain Knowledge Base (Products, Pricing, Candidate FAQs, Policies)</span>
                        <span className="text-[10px] text-emerald-700 font-semibold">Agent uses strictly this knowledge</span>
                      </label>
                      <Textarea
                        rows={4}
                        value={editingAgent.knowledge || ''}
                        onChange={(e) => setEditingAgent({ ...editingAgent, knowledge: e.target.value })}
                        placeholder="Paste product catalog, pricing tiers, interview requirements, or candidate FAQ here..."
                        className="bg-slate-50 border-slate-200 text-xs font-mono text-slate-800 focus:bg-white focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                {/* ── SECTION 3: TOOLS ────────────────────────────── */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Wrench className="h-4 w-4 text-amber-600" />
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Tools (Actions this agent can perform)
                    </h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {ALL_TOOLS.map((tool) => {
                      const enabled = (editingAgent.allowed_tools || []).includes(tool.key);
                      return (
                        <button
                          key={tool.key}
                          type="button"
                          onClick={() => toggleTool(tool.key)}
                          className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                            enabled
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-900 shadow-xs'
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-100'
                          }`}
                        >
                          <span className="text-lg shrink-0">{tool.icon}</span>
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-semibold block">{tool.label}</span>
                            <span className="text-[10px] text-slate-500 block">{tool.desc}</span>
                          </div>
                          <div
                            className={`h-5 w-5 rounded-md border flex items-center justify-center shrink-0 ${
                              enabled ? 'bg-emerald-600 border-emerald-500 text-white' : 'border-slate-300 bg-white'
                            }`}
                          >
                            {enabled && <CheckCircle2 className="h-3 w-3" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* ── SECTION 4: HANDOFF CONFIG ───────────────────── */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ArrowRightLeft className="h-4 w-4 text-indigo-600" />
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Handoff Section (Team Handoff Rules)
                      </h4>
                    </div>
                    <Badge variant="outline" className="text-[10px] text-indigo-700 border-indigo-300 bg-indigo-50">
                      Multi-Agent Collaboration
                    </Badge>
                  </div>

                  {/* Handoff Targets Grid */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-medium text-slate-600 block">
                      Can hand off to these team specialists:
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {ALL_AGENT_KEYS.filter((k) => k !== editingAgent.agent_key).map((key) => {
                        const am = AGENT_META[key] || AGENT_META.receptionist;
                        const selected = (editingAgent.handoff_targets || []).includes(key);
                        const roleMap: Record<string, string> = {
                          receptionist: 'Welcome & triage first contact',
                          sales: 'Pricing, quotes & commercial qualification',
                          recruitment: 'Job candidates, resume screening & interviews',
                          support: '360° overview, ticket management & complaints',
                          appointment: 'Google Meet bookings & calendar scheduling',
                        };
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => toggleHandoffTarget(key)}
                            className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                              selected
                                ? `${am.bgColor} ${am.borderColor} ring-1 ring-indigo-200 shadow-xs`
                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-100'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="text-xl shrink-0">{am.icon}</span>
                              <div className="truncate">
                                <span className={`text-xs font-bold capitalize block ${selected ? am.color : 'text-slate-700'}`}>
                                  {key} Specialist
                                </span>
                                <span className="text-[10px] text-slate-500 block truncate">
                                  {roleMap[key]}
                                </span>
                              </div>
                            </div>
                            <div
                              className={`h-5 w-5 rounded-md border flex items-center justify-center shrink-0 ${
                                selected ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-slate-300 bg-white'
                              }`}
                            >
                              {selected && <CheckCircle2 className="h-3 w-3" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Announcement message & fallback */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-medium text-slate-600">
                        Handoff Announcement Message (Shown to customer)
                      </label>
                      <Input
                        value={editingAgent.handoff_message || ''}
                        placeholder='e.g. "Connecting you to our Sales Specialist 💼"'
                        onChange={(e) => setEditingAgent({ ...editingAgent, handoff_message: e.target.value })}
                        className="bg-slate-50 border-slate-200 text-xs h-9 text-slate-900 focus:bg-white"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-medium text-slate-600">
                        Fallback Message (Used when LLM is unavailable)
                      </label>
                      <Input
                        value={editingAgent.fallback_message || ''}
                        onChange={(e) => setEditingAgent({ ...editingAgent, fallback_message: e.target.value })}
                        className="bg-slate-50 border-slate-200 text-xs h-9 text-slate-900 focus:bg-white"
                      />
                    </div>
                  </div>

                  {/* Announce Toggle */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <div>
                      <span className="text-xs font-semibold text-slate-800 block">Announce Agent Switch</span>
                      <span className="text-[10px] text-slate-500 block">
                        Send the announcement message to the customer when transferring to this agent
                      </span>
                    </div>
                    <Switch
                      checked={editingAgent.announce_handoff}
                      onCheckedChange={(val) => setEditingAgent({ ...editingAgent, announce_handoff: val })}
                    />
                  </div>
                </div>

                {/* ── SECTION 5: CHANNELS ────────────────────────── */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <MessageSquare className="h-4 w-4 text-emerald-600" />
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Active Channels</h4>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => toggleChannel('whatsapp')}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-medium transition-all ${
                        (editingAgent.channels || []).includes('whatsapp')
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-semibold shadow-xs'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <MessageSquare className="h-4 w-4" />
                      WhatsApp
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleChannel('email')}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-medium transition-all ${
                        (editingAgent.channels || []).includes('email')
                          ? 'bg-blue-50 border-blue-300 text-blue-800 font-semibold shadow-xs'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <Mail className="h-4 w-4" />
                      Email
                    </button>
                  </div>
                </div>

                {/* ── ACTION BAR ──────────────────────────────────── */}
                <div className="flex items-center justify-between pt-5 border-t border-slate-100">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleReset(segregatedAgent)}
                    className="text-xs text-slate-500 hover:text-rose-600 gap-1.5"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Reset to Default
                  </Button>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setIsEditing(false);
                        setEditingAgent({ ...segregatedAgent });
                      }}
                      className="text-xs text-slate-600 hover:text-slate-900"
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSave}
                      disabled={saving}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs gap-1.5 px-6 font-semibold shadow-sm shadow-emerald-600/20"
                    >
                      <Save className="h-3 w-3" />
                      {saving ? 'Saving Changes…' : 'Save Changes'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        /* ── CASE 2: ALL AGENTS OVERVIEW (When selectedAgentKey is null) ── */
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Configured Autonomous Agents ({agents.length})
            </span>
            <span className="text-[11px] text-slate-500">
              Select an assistant to open its dedicated Segregated Assistant Page
            </span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20 text-slate-500 text-sm gap-2">
              <RefreshCw className="h-4 w-4 animate-spin" /> Loading agents…
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3.5">
              {agents.map((agent) => {
                const meta = getMeta(agent.agent_key);
                return (
                  <Card
                    key={agent.id}
                    className="border border-slate-200 bg-white hover:border-slate-300 hover:shadow-md transition-all p-5 shadow-xs"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${meta.gradient} border ${meta.borderColor} flex items-center justify-center text-2xl shadow-xs shrink-0`}>
                          {agent.emoji || meta.icon}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm font-bold text-slate-900">{agent.display_name}</h3>
                            <Badge variant="outline" className="text-[9px] uppercase font-mono py-0 px-1.5 text-slate-600 border-slate-200 bg-slate-50">
                              {agent.agent_key}
                            </Badge>
                            <Badge variant="outline" className="text-[9px] font-mono py-0 px-1.5 text-cyan-800 border-cyan-300 bg-cyan-50">
                              {agent.llm_provider || 'openai'}: {agent.llm_model || 'gpt-4o-mini'}
                            </Badge>
                            {agent.agent_key === 'support' && (
                              <Badge className="bg-violet-100 text-violet-800 border-violet-200 text-[9px] py-0">
                                360° View
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-1 max-w-xl">{agent.description}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 shrink-0 self-end sm:self-auto">
                        <div className="hidden lg:flex items-center gap-3">
                          <div className="flex items-center gap-1.5">
                            <Zap className="h-3 w-3 text-amber-500" />
                            <span className="text-[11px] text-slate-600">{(agent.allowed_tools || []).length} tools</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <ArrowRightLeft className="h-3 w-3 text-indigo-500" />
                            <span className="text-[11px] text-slate-600">{(agent.handoff_targets || []).length} handoffs</span>
                          </div>
                          <div className="flex items-center gap-1">
                            {(agent.channels || []).includes('whatsapp') && (
                              <Badge variant="outline" className="text-[9px] py-0 px-1.5 text-emerald-700 border-emerald-300 bg-emerald-50">
                                WA
                              </Badge>
                            )}
                            {(agent.channels || []).includes('email') && (
                              <Badge variant="outline" className="text-[9px] py-0 px-1.5 text-blue-700 border-blue-300 bg-blue-50">
                                Email
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Active switch */}
                        <div className="flex items-center gap-2">
                          <span className={`text-[11px] font-medium ${agent.is_active ? 'text-emerald-700' : 'text-slate-400'}`}>
                            {agent.is_active ? 'Active' : 'Off'}
                          </span>
                          <Switch
                            checked={agent.is_active}
                            disabled={agent.agent_key === 'receptionist'}
                            onCheckedChange={async (val) => {
                              await AiAgentService.update(agent.id, { is_active: val });
                              loadAgents();
                              toast.success(val ? `${agent.display_name} activated` : `${agent.display_name} disabled`);
                            }}
                          />
                        </div>

                        {/* Button to navigate into Segregated Assistant Page */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setIsEditing(false);
                            onSelectAgent?.(agent.agent_key);
                          }}
                          className="border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-900 gap-1.5 text-xs h-8 px-3 font-semibold"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>Open Segregated Assistant</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── DIALOG: ACTIVE SESSIONS ──────────────────────────────────── */}
      <Dialog open={statesDialogOpen} onOpenChange={setStatesDialogOpen}>
        <DialogContent className="max-w-3xl bg-white border-slate-200 text-slate-900 max-h-[80vh] overflow-y-auto shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-slate-900">
              <Layers className="h-4 w-4 text-cyan-600" />
              Active Agent Sessions
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              All conversations currently tracked by the multi-agent system across WhatsApp & Email.
            </DialogDescription>
          </DialogHeader>

          {states.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-500">
              No active sessions. Send a WhatsApp message or email to start.
            </div>
          ) : (
            <div className="space-y-2 mt-2">
              {states.map((st) => {
                const am = AGENT_META[st.active_agent] || AGENT_META.receptionist;
                return (
                  <div key={st.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-lg">{am.icon}</span>
                      <div className="min-w-0">
                        <span className="font-semibold text-slate-900 block truncate">
                          {st.customer_name || st.customer_phone || st.customer_email || 'Visitor'}
                        </span>
                        <span className="text-[10px] text-slate-500 block">
                          {st.channel.toUpperCase()} · {st.turn_count} turns · {st.handoff_count} handoffs
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className={`text-[9px] py-0 ${am.color} ${am.borderColor} ${am.bgColor}`}>
                        {st.active_agent}
                      </Badge>
                      {st.human_takeover && (
                        <Badge className="bg-rose-100 text-rose-800 border-rose-300 text-[9px] py-0">
                          👨‍💼 Human
                        </Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewHandoffs(st)}
                        className="text-[10px] text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 h-6 px-2"
                      >
                        Trail
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── DIALOG: HANDOFF TRAIL ────────────────────────────────────── */}
      <Dialog open={handoffsDialogOpen} onOpenChange={setHandoffsDialogOpen}>
        <DialogContent className="max-w-xl bg-white border-slate-200 text-slate-900 max-h-[70vh] overflow-y-auto shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-slate-900">
              <ArrowRightLeft className="h-4 w-4 text-indigo-600" />
              Handoff Audit Trail
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {selectedState?.customer_name || selectedState?.customer_phone || selectedState?.conversation_ref}
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-3">
            {stateHandoffs.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">No handoffs — stayed with one agent.</div>
            ) : (
              stateHandoffs.map((h, idx) => (
                <div key={h.id || idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-700">{h.from_agent || 'start'}</span>
                      <ArrowRight className="h-3 w-3 text-indigo-600" />
                      <span className="font-bold text-emerald-700">{h.to_agent}</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {new Date(h.created_on).toLocaleTimeString()}
                    </span>
                  </div>
                  {h.reason && <p className="text-[11px] text-slate-600 italic">"{h.reason}"</p>}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── DIALOG: TRIGGER TEST CALL FOR THIS ASSISTANT ── */}
      <Dialog open={testCallModalOpen} onOpenChange={setTestCallModalOpen}>
        <DialogContent className="max-w-md bg-white border-slate-200 text-slate-900 shadow-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-slate-900">
              <PhoneCall className="h-5 w-5 text-blue-600" />
              Dispatch Test Voice Call
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Enter your mobile number to test live phone conversation with {segregatedAgent?.display_name || 'this Assistant'}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Phone Number (with Country Code):</label>
              <Input
                type="tel"
                value={testCallPhone}
                onChange={(e) => setTestCallPhone(e.target.value)}
                placeholder="+919876543210 or 9876543210"
                className="bg-white border-slate-200 text-slate-900 text-sm h-9"
              />
              <span className="text-[10px] text-slate-400">Example: +91918015779116 or 8015779116</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setTestCallModalOpen(false)}
              className="text-xs text-slate-600"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={dispatchingTestCall || !testCallPhone.trim()}
              onClick={async () => {
                const matchedVapiAgent = voiceAgents.find(
                  (va) =>
                    va.template_key === segregatedAgent?.agent_key ||
                    va.name.toLowerCase().includes((segregatedAgent?.agent_key || '').toLowerCase()) ||
                    (segregatedAgent?.agent_key === 'sales' && /sales|alex/i.test(va.name)) ||
                    (segregatedAgent?.agent_key === 'recruitment' && /recrui|maya|sarah/i.test(va.name))
                );

                try {
                  setDispatchingTestCall(true);
                  toast.info(`Dialing ${testCallPhone} via ${matchedVapiAgent?.name || segregatedAgent?.display_name}...`);

                  await VoiceService.dispatchCall({
                    agent_id: matchedVapiAgent?.id || segregatedAgent?.agent_key || 'sales',
                    phone_number: testCallPhone.trim(),
                    customer_name: 'Test Customer',
                    custom_variables: {
                      reason: `Test call from ${segregatedAgent?.display_name} assistant page`,
                    },
                  });

                  toast.success(`📞 Outbound test call dispatched to ${testCallPhone}!`);
                  setTestCallModalOpen(false);
                  setTestCallPhone('');
                  setTimeout(() => {
                    if (segregatedAgent?.agent_key) {
                      loadAgentCallLogs(segregatedAgent.agent_key, matchedVapiAgent?.id);
                    }
                  }, 3500);
                } catch (err: any) {
                  toast.error(err.response?.data?.message || err.message || 'Failed to dispatch test call');
                } finally {
                  setDispatchingTestCall(false);
                }
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs h-9 px-4 gap-1.5 shadow-sm"
            >
              <PhoneCall className="h-3.5 w-3.5" />
              {dispatchingTestCall ? 'Dialing...' : 'Dispatch Call Now'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
