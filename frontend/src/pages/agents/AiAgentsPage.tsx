import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AiAgent, ConversationAgentState, AgentHandoffLog } from '@/types/aiAgent';
import { AiAgentService } from '@/service/aiAgentService';
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
} from 'lucide-react';
import { toast } from 'sonner';

// All available tools for the multi-select
const ALL_TOOLS = [
  { key: 'capture_contact', label: 'Capture Contact', icon: '📇', desc: 'Save name, email, phone, company' },
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
  receptionist: { icon: '🛎️', gradient: 'from-amber-500/20 to-orange-500/20', color: 'text-amber-400', borderColor: 'border-amber-500/30', bgColor: 'bg-amber-500/10' },
  sales:        { icon: '💼', gradient: 'from-emerald-500/20 to-green-500/20', color: 'text-emerald-400', borderColor: 'border-emerald-500/30', bgColor: 'bg-emerald-500/10' },
  appointment:  { icon: '📅', gradient: 'from-cyan-500/20 to-sky-500/20', color: 'text-cyan-400', borderColor: 'border-cyan-500/30', bgColor: 'bg-cyan-500/10' },
  support:      { icon: '🛟', gradient: 'from-violet-500/20 to-purple-500/20', color: 'text-violet-400', borderColor: 'border-violet-500/30', bgColor: 'bg-violet-500/10' },
  recruitment:  { icon: '🎓', gradient: 'from-rose-500/20 to-pink-500/20', color: 'text-rose-400', borderColor: 'border-rose-500/30', bgColor: 'bg-rose-500/10' },
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
  { label: '+ Strict Guardrail', text: '\n- Strictly answer ONLY based on the Domain Knowledge provided. Never invent features or prices.' },
  { label: '+ BANT Qualification', text: '\n- Qualify the lead using BANT (Budget, Authority, Need, Timeline). Ask one question at a time.' },
  { label: '+ Concise Tone', text: '\n- Keep answers warm, professional, and concise (under 2-3 sentences when possible).' },
];

export const AiAgentsPage: React.FC<AiAgentsPageProps> = ({ selectedAgentKey, onSelectAgent, onNavigateVoice }) => {
  const [agents, setAgents] = useState<AiAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);
  const [editingAgent, setEditingAgent] = useState<AiAgent | null>(null);
  const [saving, setSaving] = useState(false);
  const [handoffsDialogOpen, setHandoffsDialogOpen] = useState(false);
  const [statesDialogOpen, setStatesDialogOpen] = useState(false);
  const [states, setStates] = useState<ConversationAgentState[]>([]);
  const [stateHandoffs, setStateHandoffs] = useState<AgentHandoffLog[]>([]);
  const [selectedState, setSelectedState] = useState<ConversationAgentState | null>(null);

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
  }, []);

  // Sync expanded card with selectedAgentKey from sidebar or tabs
  useEffect(() => {
    if (!agents.length) return;
    if (selectedAgentKey) {
      const match = agents.find((a) => a.agent_key === selectedAgentKey);
      if (match) {
        setExpandedAgent(match.id);
        setEditingAgent({ ...match });
      }
    } else {
      setExpandedAgent(null);
      setEditingAgent(null);
    }
  }, [selectedAgentKey, agents]);

  const handleSave = async () => {
    if (!editingAgent) return;
    setSaving(true);
    try {
      await AiAgentService.update(editingAgent.id, editingAgent);
      toast.success(`${editingAgent.display_name} saved!`);
      setEditingAgent(null);
      setExpandedAgent(null);
      onSelectAgent?.(null);
      loadAgents();
    } catch {
      toast.error('Failed to save agent');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async (agent: AiAgent) => {
    try {
      await AiAgentService.reset(agent.id);
      toast.success(`${agent.display_name} reset to defaults!`);
      setEditingAgent(null);
      loadAgents();
    } catch {
      toast.error('Failed to reset');
    }
  };

  const handleExpand = (agent: AiAgent) => {
    if (expandedAgent === agent.id) {
      setExpandedAgent(null);
      setEditingAgent(null);
      onSelectAgent?.(null);
    } else {
      setExpandedAgent(agent.id);
      setEditingAgent({ ...agent });
      onSelectAgent?.(agent.agent_key);
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

  return (
    <div className="space-y-4">
      {/* ── CHANNEL DIFFERENTIATION BANNER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-indigo-950/30 to-slate-900 border border-cyan-800/40 text-xs shadow-lg">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center text-cyan-400 shrink-0">
            <PhoneCall className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-xs">Looking for Phone / Voice Calling Assistants?</span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 uppercase">
                Vapi & Telephony
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              These 5 agents below handle <strong>WhatsApp & Email text chat</strong>. Your live telephone calling assistants (<em>Riya, Vedantu, JainHousing</em>) are in <strong>Voice AI & Telephony</strong>.
            </p>
          </div>
        </div>
        {onNavigateVoice && (
          <button
            onClick={onNavigateVoice}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-400 to-indigo-500 hover:brightness-110 text-slate-950 font-bold text-xs flex items-center gap-1.5 shrink-0 transition-all cursor-pointer shadow-md shadow-cyan-500/20 self-start sm:self-auto"
          >
            <PhoneCall className="h-3.5 w-3.5 fill-current" />
            <span>Open Voice Telephony Studio</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* ── PAGE HEADER ──────────────────────────────────────────────── */}
      <div className="relative overflow-hidden p-6 rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 via-indigo-950/30 to-slate-900 backdrop-blur-md">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/5 via-purple-600/5 to-emerald-600/5 pointer-events-none" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0 shadow-lg shadow-indigo-500/10">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white tracking-tight">AI Agent Team</h1>
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[10px] py-0.5">
                  Multi-Agent Handoff
                </Badge>
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                Configure your autonomous AI agents that work together on WhatsApp & Email.
                Each agent has its own persona, LLM model, tools, and handoff rules.
                Agents switch seamlessly mid-conversation without losing context.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleViewStates}
              className="border-slate-700 text-slate-300 hover:text-white gap-1.5 text-xs"
            >
              <Layers className="h-3.5 w-3.5 text-cyan-400" />
              Active Sessions
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={loadAgents}
              className="border-slate-700 text-slate-300 hover:text-white gap-1.5 text-xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Agent Flow Visualization */}
        <div className="relative mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-start sm:justify-center gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => {
              setExpandedAgent(null);
              setEditingAgent(null);
              onSelectAgent?.(null);
            }}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all text-xs font-semibold shrink-0 ${
              !expandedAgent && !selectedAgentKey
                ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-sm ring-1 ring-purple-500/30'
                : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5 text-purple-400" />
            <span>All Agents</span>
          </button>
          <div className="h-5 w-[1px] bg-slate-800 shrink-0 mx-1" />

          {agents.map((agent, idx) => {
            const meta = getMeta(agent.agent_key);
            const isSelected = (selectedAgentKey === agent.agent_key) || (expandedAgent === agent.id);
            return (
              <React.Fragment key={agent.id}>
                <button
                  type="button"
                  onClick={() => handleExpand(agent)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all text-xs font-medium shrink-0 ${
                    isSelected
                      ? `${meta.bgColor} ${meta.color} ${meta.borderColor} shadow-md ring-1 ring-white/10`
                      : agent.is_active
                      ? 'bg-slate-900/60 text-slate-300 border-slate-800 hover:border-slate-700'
                      : 'bg-slate-950/60 text-slate-500 border-slate-800/50 opacity-50'
                  }`}
                >
                  <span className="text-lg">{agent.emoji || meta.icon}</span>
                  <span>{agent.display_name}</span>
                  {!agent.is_active && <EyeOff className="h-3 w-3 text-slate-500" />}
                </button>
                {idx < agents.length - 1 && (
                  <ArrowRight className="h-3.5 w-3.5 text-slate-600 shrink-0" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* ── AGENT CARDS ──────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-500 text-sm gap-2">
          <RefreshCw className="h-4 w-4 animate-spin" /> Loading agents…
        </div>
      ) : (
        <div className="space-y-4">
          {agents.map((agent) => {
            const meta = getMeta(agent.agent_key);
            const isExpanded = expandedAgent === agent.id;
            const edit = isExpanded ? editingAgent : null;

            return (
              <Card
                key={agent.id}
                className={`border transition-all duration-300 ${
                  isExpanded
                    ? `${meta.borderColor} bg-slate-900/80 shadow-lg ring-1 ring-white/5`
                    : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
                }`}
              >
                {/* ── COLLAPSED HEADER ────────────────────────────────── */}
                <div
                  className="flex items-center justify-between p-5 cursor-pointer select-none"
                  onClick={() => handleExpand(agent)}
                >
                  <div className="flex items-center gap-4">
                    <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${meta.gradient} border ${meta.borderColor} flex items-center justify-center text-2xl shadow-inner`}>
                      {agent.emoji || meta.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h3 className="text-sm font-bold text-white">{agent.display_name}</h3>
                        <Badge variant="outline" className="text-[9px] uppercase font-mono py-0 px-1.5 text-slate-400 border-slate-700">
                          {agent.agent_key}
                        </Badge>
                        <Badge variant="outline" className="text-[9px] font-mono py-0 px-1.5 text-cyan-400 border-cyan-500/30">
                          {agent.llm_provider || 'openai'}: {agent.llm_model || 'gpt-4o-mini'}
                        </Badge>
                        {agent.agent_key === 'support' && (
                          <Badge className="bg-violet-500/20 text-violet-300 border-violet-500/30 text-[9px] py-0">
                            360° View
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5 max-w-lg">{agent.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    {/* Quick stats */}
                    <div className="hidden md:flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <Zap className="h-3 w-3 text-amber-400" />
                        <span className="text-[11px] text-slate-400">{(agent.allowed_tools || []).length} tools</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <ArrowRightLeft className="h-3 w-3 text-indigo-400" />
                        <span className="text-[11px] text-slate-400">{(agent.handoff_targets || []).length} handoffs</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {(agent.channels || []).includes('whatsapp') && (
                          <Badge variant="outline" className="text-[9px] py-0 px-1 gap-0.5 text-emerald-400 border-emerald-500/30">
                            <MessageSquare className="h-2 w-2" /> WA
                          </Badge>
                        )}
                        {(agent.channels || []).includes('email') && (
                          <Badge variant="outline" className="text-[9px] py-0 px-1 gap-0.5 text-blue-400 border-blue-500/30">
                            <Mail className="h-2 w-2" /> Email
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Active toggle */}
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <span className={`text-[11px] font-medium ${agent.is_active ? 'text-emerald-400' : 'text-slate-500'}`}>
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

                    <ChevronRight className={`h-4 w-4 text-slate-500 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                  </div>
                </div>

                {/* ── EXPANDED EDITOR ─────────────────────────────────── */}
                {isExpanded && edit && (
                  <CardContent className="pt-0 pb-6 px-6 space-y-6 border-t border-slate-800/50">
                    {/* ── SECTION 1: LLM PROVIDER & MODEL CONFIG ───────── */}
                    <div className="pt-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Cpu className="h-4 w-4 text-cyan-400" />
                          <h4 className="text-xs font-bold text-white uppercase tracking-wider">LLM Provider & Model</h4>
                        </div>
                        <Badge variant="outline" className="text-[10px] text-cyan-300 border-cyan-500/30">
                          Provider-Agnostic LLM
                        </Badge>
                      </div>

                      {/* Provider Selector Buttons */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-medium text-slate-400">Select LLM Provider</label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {LLM_PROVIDERS.map((prov) => {
                            const isSelected = (edit.llm_provider || 'openai') === prov.id;
                            return (
                              <button
                                key={prov.id}
                                type="button"
                                onClick={() => {
                                  const currentModels = MODELS_BY_PROVIDER[prov.id] || [];
                                  const defaultModel = prov.defaultModel || currentModels[0]?.value;
                                  setEditingAgent({
                                    ...edit,
                                    llm_provider: prov.id,
                                    llm_model: defaultModel,
                                  });
                                }}
                                className={`flex items-center justify-between p-2.5 rounded-xl border text-left transition-all ${
                                  isSelected
                                    ? 'bg-cyan-500/15 border-cyan-500/50 text-white shadow-sm ring-1 ring-cyan-500/30'
                                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="text-base">{prov.icon}</span>
                                  <span className="text-xs font-semibold">{prov.name}</span>
                                </div>
                                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-400">
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
                          <label className="text-[11px] font-medium text-slate-400">
                            Model ({(edit.llm_provider || 'openai').toUpperCase()})
                          </label>
                          <Select
                            value={edit.llm_model || MODELS_BY_PROVIDER[edit.llm_provider || 'openai']?.[0]?.value}
                            onValueChange={(val) => setEditingAgent({ ...edit, llm_model: val || undefined } as any)}
                          >
                            <SelectTrigger className="bg-slate-950 border-slate-800 text-xs h-9">
                              <SelectValue placeholder="Select model..." />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-900 border-slate-800">
                              {(MODELS_BY_PROVIDER[edit.llm_provider || 'openai'] || []).map((m) => (
                                <SelectItem key={m.value} value={m.value} className="text-xs">
                                  <div className="flex flex-col text-left py-0.5">
                                    <span className="font-semibold text-white">{m.label}</span>
                                    <span className="text-[10px] text-slate-400">{m.desc}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Temperature Slider */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label className="text-[11px] font-medium text-slate-400">Temperature</label>
                            <span className="text-[10px] text-indigo-400 font-mono font-semibold">
                              {edit.temperature} (
                              {edit.temperature < 0.3 ? 'Deterministic' : edit.temperature > 0.6 ? 'Creative' : 'Balanced'}
                              )
                            </span>
                          </div>
                          <div className="flex items-center gap-2 pt-1">
                            <input
                              type="range"
                              min="0"
                              max="1"
                              step="0.05"
                              value={edit.temperature}
                              onChange={(e) => setEditingAgent({ ...edit, temperature: parseFloat(e.target.value) })}
                              className="flex-1 accent-cyan-500 h-1.5"
                            />
                            <span className="text-xs font-mono text-slate-300 w-8 text-right">{edit.temperature}</span>
                          </div>
                        </div>

                        {/* Display Name */}
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-medium text-slate-400">Display Name</label>
                          <Input
                            value={edit.display_name}
                            onChange={(e) => setEditingAgent({ ...edit, display_name: e.target.value })}
                            className="bg-slate-950 border-slate-800 text-xs h-9 text-white font-medium"
                          />
                        </div>
                      </div>
                    </div>

                    {/* ── SECTION 2: PROMPT & KNOWLEDGE ───────────────── */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Brain className="h-4 w-4 text-purple-400" />
                          <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                            Prompt — What Should This Agent Do?
                          </h4>
                        </div>
                        <span className="text-[10px] text-slate-400">
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
                              const updated = (edit.persona_prompt || '') + snip.text;
                              setEditingAgent({ ...edit, persona_prompt: updated });
                              toast.info(`Added snippet: ${snip.label}`);
                            }}
                            className="px-2 py-1 rounded-md bg-purple-950/40 border border-purple-500/20 text-[10px] text-purple-300 hover:bg-purple-900/50 hover:border-purple-500/40 transition-all font-medium"
                          >
                            {snip.label}
                          </button>
                        ))}
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-medium text-slate-300 flex items-center justify-between">
                            <span>System Persona & Instructions Prompt</span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {(edit.persona_prompt || '').length} characters
                            </span>
                          </label>
                          <Textarea
                            rows={8}
                            value={edit.persona_prompt}
                            onChange={(e) => setEditingAgent({ ...edit, persona_prompt: e.target.value })}
                            placeholder="Enter the system prompt that defines what this agent does..."
                            className="bg-slate-950/90 border-slate-800 text-xs font-mono leading-relaxed text-slate-200 focus:border-purple-500"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[11px] font-medium text-slate-300 flex items-center justify-between">
                            <span>Domain Knowledge Base (Products, Pricing, FAQs, Policies)</span>
                            <span className="text-[10px] text-emerald-400">Agent uses strictly this knowledge</span>
                          </label>
                          <Textarea
                            rows={4}
                            value={edit.knowledge || ''}
                            onChange={(e) => setEditingAgent({ ...edit, knowledge: e.target.value })}
                            placeholder="Paste product catalog, pricing tiers, interview requirements, or support policies here..."
                            className="bg-slate-950/90 border-slate-800 text-xs font-mono text-slate-200 focus:border-emerald-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* ── SECTION 3: TOOLS ────────────────────────────── */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Wrench className="h-4 w-4 text-amber-400" />
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                          Tools (Actions this agent can perform)
                        </h4>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {ALL_TOOLS.map((tool) => {
                          const enabled = (edit.allowed_tools || []).includes(tool.key);
                          return (
                            <button
                              key={tool.key}
                              type="button"
                              onClick={() => toggleTool(tool.key)}
                              className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                                enabled
                                  ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                              }`}
                            >
                              <span className="text-lg shrink-0">{tool.icon}</span>
                              <div className="flex-1 min-w-0">
                                <span className="text-xs font-semibold block">{tool.label}</span>
                                <span className="text-[10px] text-slate-500 block">{tool.desc}</span>
                              </div>
                              <div
                                className={`h-5 w-5 rounded-md border flex items-center justify-center shrink-0 ${
                                  enabled ? 'bg-emerald-500 border-emerald-400' : 'border-slate-700'
                                }`}
                              >
                                {enabled && <CheckCircle2 className="h-3 w-3 text-white" />}
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
                          <ArrowRightLeft className="h-4 w-4 text-indigo-400" />
                          <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                            Handoff Section (Team Handoff Rules)
                          </h4>
                        </div>
                        <Badge variant="outline" className="text-[10px] text-indigo-300 border-indigo-500/30">
                          Multi-Agent Collaboration
                        </Badge>
                      </div>

                      <div className="p-3.5 rounded-xl bg-indigo-950/20 border border-indigo-500/20 text-xs text-indigo-300/90 leading-relaxed">
                        When customer intent shifts during WhatsApp or Email chat, this agent will automatically hand off
                        conversation state, collected customer contact, and full history to the selected specialist.
                      </div>

                      {/* Handoff Targets Grid */}
                      <div className="space-y-2">
                        <label className="text-[11px] font-medium text-slate-400 block">
                          Can hand off to these team specialists:
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {ALL_AGENT_KEYS.filter((k) => k !== edit.agent_key).map((key) => {
                            const am = AGENT_META[key] || AGENT_META.receptionist;
                            const selected = (edit.handoff_targets || []).includes(key);
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
                                    ? `${am.bgColor} ${am.borderColor} ring-1 ring-white/10`
                                    : 'bg-slate-950/60 border-slate-800 text-slate-500 hover:border-slate-700'
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <span className="text-xl shrink-0">{am.icon}</span>
                                  <div className="truncate">
                                    <span className={`text-xs font-bold capitalize block ${selected ? am.color : 'text-slate-400'}`}>
                                      {key} Specialist
                                    </span>
                                    <span className="text-[10px] text-slate-500 block truncate">
                                      {roleMap[key]}
                                    </span>
                                  </div>
                                </div>
                                <div
                                  className={`h-5 w-5 rounded-md border flex items-center justify-center shrink-0 ${
                                    selected ? 'bg-indigo-600 border-indigo-400 text-white' : 'border-slate-700'
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
                          <label className="text-[11px] font-medium text-slate-400">
                            Handoff Announcement Message (Shown to customer)
                          </label>
                          <Input
                            value={edit.handoff_message || ''}
                            placeholder='e.g. "Connecting you to our Sales Specialist 💼"'
                            onChange={(e) => setEditingAgent({ ...edit, handoff_message: e.target.value })}
                            className="bg-slate-950 border-slate-800 text-xs h-9 text-slate-200"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[11px] font-medium text-slate-400">
                            Fallback Message (Used when LLM is unavailable)
                          </label>
                          <Input
                            value={edit.fallback_message || ''}
                            onChange={(e) => setEditingAgent({ ...edit, fallback_message: e.target.value })}
                            className="bg-slate-950 border-slate-800 text-xs h-9 text-slate-200"
                          />
                        </div>
                      </div>

                      {/* Announce Toggle */}
                      <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                        <div>
                          <span className="text-xs font-semibold text-slate-200 block">Announce Agent Switch</span>
                          <span className="text-[10px] text-slate-500 block">
                            Send the announcement message to the customer when transferring to this agent
                          </span>
                        </div>
                        <Switch
                          checked={edit.announce_handoff}
                          onCheckedChange={(val) => setEditingAgent({ ...edit, announce_handoff: val })}
                        />
                      </div>
                    </div>

                    {/* ── SECTION 5: CHANNELS ────────────────────────── */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <MessageSquare className="h-4 w-4 text-emerald-400" />
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider">Active Channels</h4>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => toggleChannel('whatsapp')}
                          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-medium transition-all ${
                            (edit.channels || []).includes('whatsapp')
                              ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                              : 'bg-slate-950/60 border-slate-800 text-slate-500'
                          }`}
                        >
                          <MessageSquare className="h-4 w-4" />
                          WhatsApp
                        </button>
                        <button
                          onClick={() => toggleChannel('email')}
                          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-medium transition-all ${
                            (edit.channels || []).includes('email')
                              ? 'bg-blue-950/40 border-blue-500/30 text-blue-300'
                              : 'bg-slate-950/60 border-slate-800 text-slate-500'
                          }`}
                        >
                          <Mail className="h-4 w-4" />
                          Email
                        </button>
                      </div>
                    </div>

                    {/* ── ACTION BAR ──────────────────────────────────── */}
                    <div className="flex items-center justify-between pt-4 border-t border-slate-800/60">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleReset(agent)}
                        className="text-xs text-slate-400 hover:text-rose-400 gap-1.5"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Reset to Default
                      </Button>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setExpandedAgent(null);
                            setEditingAgent(null);
                          }}
                          className="text-xs text-slate-400"
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleSave}
                          disabled={saving}
                          className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs gap-1.5 px-5"
                        >
                          <Save className="h-3 w-3" />
                          {saving ? 'Saving…' : 'Save Changes'}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* ── DIALOG: ACTIVE SESSIONS ──────────────────────────────────── */}
      <Dialog open={statesDialogOpen} onOpenChange={setStatesDialogOpen}>
        <DialogContent className="max-w-3xl bg-slate-900 border-slate-800 text-slate-100 max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Layers className="h-4 w-4 text-cyan-400" />
              Active Agent Sessions
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
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
                  <div key={st.id} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-lg">{am.icon}</span>
                      <div className="min-w-0">
                        <span className="font-semibold text-slate-200 block truncate">
                          {st.customer_name || st.customer_phone || st.customer_email || 'Visitor'}
                        </span>
                        <span className="text-[10px] text-slate-500 block">
                          {st.channel.toUpperCase()} · {st.turn_count} turns · {st.handoff_count} handoffs
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className={`text-[9px] py-0 ${am.color} ${am.borderColor}`}>
                        {st.active_agent}
                      </Badge>
                      {st.human_takeover && (
                        <Badge className="bg-rose-500/20 text-rose-300 border-rose-500/40 text-[9px] py-0">
                          👨‍💼 Human
                        </Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewHandoffs(st)}
                        className="text-[10px] text-indigo-400 hover:text-indigo-300 h-6 px-2"
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
        <DialogContent className="max-w-xl bg-slate-900 border-slate-800 text-slate-100 max-h-[70vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <ArrowRightLeft className="h-4 w-4 text-indigo-400" />
              Handoff Audit Trail
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              {selectedState?.customer_name || selectedState?.customer_phone || selectedState?.conversation_ref}
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-3">
            {stateHandoffs.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">No handoffs — stayed with one agent.</div>
            ) : (
              stateHandoffs.map((h, idx) => (
                <div key={h.id || idx} className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-300">{h.from_agent || 'start'}</span>
                      <ArrowRight className="h-3 w-3 text-indigo-400" />
                      <span className="font-bold text-emerald-400">{h.to_agent}</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {new Date(h.created_on).toLocaleTimeString()}
                    </span>
                  </div>
                  {h.reason && <p className="text-[11px] text-slate-400 italic">"{h.reason}"</p>}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
