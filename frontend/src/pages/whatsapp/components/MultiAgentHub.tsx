import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AiAgent, ConversationAgentState, AgentHandoffLog, AgentSimulationResult } from '@/types/aiAgent';
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
} from 'lucide-react';
import { toast } from 'sonner';

interface SimulatedMessage {
  id: string;
  sender: 'user' | 'agent';
  agentKey?: string;
  agentName?: string;
  text: string;
  handoffs?: Array<{ from: string; to: string; reason: string }>;
  timestamp: string;
}

export const MultiAgentHub: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'squad' | 'simulator' | 'live_states'>('squad');
  const [agents, setAgents] = useState<AiAgent[]>([]);
  const [states, setStates] = useState<ConversationAgentState[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<AiAgent | null>(null);
  const [agentDialogOpen, setAgentDialogOpen] = useState(false);

  // Simulator state
  const [simChannel, setSimChannel] = useState<'whatsapp' | 'email'>('whatsapp');
  const [simInput, setSimInput] = useState('');
  const [simLoading, setSimLoading] = useState(false);
  const [simMessages, setSimMessages] = useState<SimulatedMessage[]>([
    {
      id: 'init',
      sender: 'agent',
      agentKey: 'receptionist',
      agentName: 'Receptionist 🛎️',
      text: 'Hello and welcome to Sharyx! 👋 I can share product details, pricing, schedule a live demo or interview, or provide support. How can I assist you today?',
      timestamp: 'Just now',
    },
  ]);

  // Handoffs dialog
  const [selectedState, setSelectedState] = useState<ConversationAgentState | null>(null);
  const [stateHandoffs, setStateHandoffs] = useState<AgentHandoffLog[]>([]);
  const [handoffsDialogOpen, setHandoffsDialogOpen] = useState(false);

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

  const loadStates = async () => {
    try {
      const data = await AiAgentService.listStates();
      setStates(data);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadAgents();
    loadStates();
  }, []);

  const handleUpdateAgent = async () => {
    if (!selectedAgent) return;
    try {
      await AiAgentService.update(selectedAgent.id, selectedAgent);
      toast.success(`${selectedAgent.display_name} updated successfully!`);
      setAgentDialogOpen(false);
      loadAgents();
    } catch {
      toast.error('Failed to update agent');
    }
  };

  const handleResetAgent = async (agent: AiAgent) => {
    try {
      await AiAgentService.reset(agent.id);
      toast.success(`${agent.display_name} reset to default!`);
      loadAgents();
    } catch {
      toast.error('Failed to reset agent');
    }
  };

  const handleSendSimulated = async (textToSend?: string) => {
    const text = textToSend || simInput;
    if (!text.trim() || simLoading) return;

    const userMsg: SimulatedMessage = {
      id: `u_${Date.now()}`,
      sender: 'user',
      text: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setSimMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setSimInput('');
    setSimLoading(true);

    try {
      const res: AgentSimulationResult = await AiAgentService.simulate(
        text.trim(),
        simChannel,
        'playground_session',
        'Visitor'
      );

      const agentMsg: SimulatedMessage = {
        id: `a_${Date.now()}`,
        sender: 'agent',
        agentKey: res.agentKey,
        agentName: res.agentName,
        text: res.reply || '*(Transferred to human agent)*',
        handoffs: res.handoffs,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setSimMessages((prev) => [...prev, agentMsg]);
      loadStates();
    } catch (err: any) {
      toast.error('Simulation failed: ' + (err?.response?.data?.message || err.message));
    } finally {
      setSimLoading(false);
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

  const handleToggleTakeover = async (st: ConversationAgentState) => {
    try {
      await AiAgentService.setTakeover(st.id, !st.human_takeover);
      toast.success(st.human_takeover ? 'AI resumed for this chat' : 'Human takeover activated');
      loadStates();
    } catch {
      toast.error('Failed to update takeover');
    }
  };

  const getAgentColor = (key: string) => {
    switch (key) {
      case 'receptionist':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      case 'sales':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
      case 'appointment':
        return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30';
      case 'support':
        return 'text-violet-400 bg-violet-500/10 border-violet-500/30';
      default:
        return 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30';
    }
  };

  const getAgentBadge = (key: string) => {
    switch (key) {
      case 'receptionist':
        return <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 gap-1">🛎️ Receptionist</Badge>;
      case 'sales':
        return <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 gap-1">💼 Sales</Badge>;
      case 'appointment':
        return <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30 gap-1">📅 Appointment</Badge>;
      case 'support':
        return <Badge className="bg-violet-500/20 text-violet-300 border-violet-500/30 gap-1">🛟 Support</Badge>;
      default:
        return <Badge variant="outline">{key}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="relative overflow-hidden p-6 rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 via-indigo-950/30 to-slate-900 backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0 shadow-lg shadow-indigo-500/10">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white tracking-tight">Autonomous Multi-Agent Team</h2>
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[10px] py-0.5">
                  LLM-Driven Handoffs
                </Badge>
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl">
                4 specialized AI agents working together seamlessly on WhatsApp & Email: Receptionist welcomes and answers product questions, Sales qualifies & quotes, Appointment Desk books demos & interviews with Google Meet, and Support has full 360° overview.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                loadAgents();
                loadStates();
              }}
              className="border-slate-700 text-slate-300 hover:text-white gap-1.5 text-xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Dynamic Sub-Tabs */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between">
          <Tabs value={activeSubTab} onValueChange={(v: any) => setActiveSubTab(v)} className="w-full">
            <TabsList className="bg-slate-950 border border-slate-800">
              <TabsTrigger value="squad" className="gap-2 text-xs">
                <Users className="h-3.5 w-3.5 text-indigo-400" />
                Agent Squad (4)
              </TabsTrigger>
              <TabsTrigger value="simulator" className="gap-2 text-xs">
                <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                Live Handoff Simulator
              </TabsTrigger>
              <TabsTrigger value="live_states" className="gap-2 text-xs">
                <ArrowRightLeft className="h-3.5 w-3.5 text-cyan-400" />
                Active Sessions ({states.length})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* ── SUB-TAB 1: AGENT SQUAD CARDS ─────────────────────────────────── */}
      {activeSubTab === 'squad' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {agents.map((agent) => {
            const colorClass = getAgentColor(agent.agent_key);
            return (
              <Card
                key={agent.id}
                className="border-slate-800 bg-slate-900/60 hover:border-slate-700 transition-all duration-200 flex flex-col justify-between"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`h-11 w-11 rounded-xl border flex items-center justify-center text-xl shadow-inner ${colorClass}`}>
                        {agent.emoji || '🤖'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base text-slate-100">{agent.display_name}</CardTitle>
                          <Badge variant="outline" className="text-[10px] uppercase font-mono py-0">
                            {agent.agent_key}
                          </Badge>
                        </div>
                        <CardDescription className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                          {agent.description}
                        </CardDescription>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-400 font-medium">
                        {agent.is_active ? 'Active' : 'Disabled'}
                      </span>
                      <Switch
                        checked={agent.is_active}
                        disabled={agent.agent_key === 'receptionist'}
                        onCheckedChange={async (val) => {
                          await AiAgentService.update(agent.id, { is_active: val });
                          loadAgents();
                        }}
                      />
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 pt-1">
                  {/* Persona Snippet */}
                  <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800/80 text-xs text-slate-300">
                    <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1">
                      <span>Persona & Instructions</span>
                      <span className="text-slate-500 font-mono">temp: {agent.temperature}</span>
                    </div>
                    <p className="line-clamp-3 text-slate-300 leading-relaxed font-sans">
                      {agent.persona_prompt}
                    </p>
                  </div>

                  {/* Capabilities & Tools */}
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mr-1">
                        Tools:
                      </span>
                      {agent.allowed_tools && agent.allowed_tools.length > 0 ? (
                        agent.allowed_tools.map((t) => (
                          <span
                            key={t}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-slate-800 text-slate-300 border border-slate-700/60 font-mono"
                          >
                            <Zap className="h-2.5 w-2.5 text-amber-400" />
                            {t}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-500 italic">No external tools</span>
                      )}
                    </div>

                    {/* Handoff Targets */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mr-1">
                        Can Transfer To:
                      </span>
                      {agent.handoff_targets && agent.handoff_targets.length > 0 ? (
                        agent.handoff_targets.map((tgt) => (
                          <span
                            key={tgt}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-indigo-950/40 text-indigo-300 border border-indigo-800/40"
                          >
                            <ArrowRightLeft className="h-2.5 w-2.5" />
                            {tgt}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-500">None</span>
                      )}
                    </div>
                  </div>

                  {/* Channels & Actions */}
                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <span className="text-[11px]">Channels:</span>
                      <Badge variant="outline" className="text-[10px] gap-1 py-0 px-1.5 text-emerald-400 border-emerald-500/30">
                        <MessageSquare className="h-2.5 w-2.5" /> WA
                      </Badge>
                      <Badge variant="outline" className="text-[10px] gap-1 py-0 px-1.5 text-blue-400 border-blue-500/30">
                        <Mail className="h-2.5 w-2.5" /> Email
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleResetAgent(agent)}
                        className="text-xs text-slate-400 hover:text-white h-7 px-2"
                      >
                        <RotateCcw className="h-3 w-3 mr-1" /> Reset
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedAgent({ ...agent });
                          setAgentDialogOpen(true);
                        }}
                        className="text-xs border-slate-700 hover:border-slate-600 text-slate-200 h-7 px-3"
                      >
                        Customize
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── SUB-TAB 2: INTERACTIVE LIVE SIMULATOR ──────────────────────────── */}
      {activeSubTab === 'simulator' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Chat Window */}
          <div className="lg:col-span-2 flex flex-col h-[600px] rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden shadow-2xl">
            {/* Chat Header */}
            <div className="p-3.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Bot className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">Multi-Agent Sandbox Simulator</span>
                  <span className="text-[10px] text-slate-400 block">
                    Test how Receptionist, Sales, Appointment & Support switch naturally
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700">
                  <button
                    onClick={() => setSimChannel('whatsapp')}
                    className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors ${
                      simChannel === 'whatsapp' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    WhatsApp Mode
                  </button>
                  <button
                    onClick={() => setSimChannel('email')}
                    className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors ${
                      simChannel === 'email' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Email Mode
                  </button>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setSimMessages([
                      {
                        id: 'init',
                        sender: 'agent',
                        agentKey: 'receptionist',
                        agentName: 'Receptionist 🛎️',
                        text: 'Hello and welcome to Sharyx! 👋 I can share product details, pricing, schedule a live demo or interview, or provide support. How can I assist you today?',
                        timestamp: 'Just now',
                      },
                    ])
                  }
                  className="h-7 text-xs text-slate-400 hover:text-white"
                >
                  <RotateCcw className="h-3 w-3 mr-1" /> Clear
                </Button>
              </div>
            </div>

            {/* Chat Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-gradient-to-b from-slate-950 via-slate-900/40 to-slate-950">
              {simMessages.map((msg) => {
                const isUser = msg.sender === 'user';
                return (
                  <div key={msg.id} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-full`}>
                    {!isUser && (
                      <div className="flex items-center gap-2 mb-1 px-1">
                        {getAgentBadge(msg.agentKey || 'receptionist')}
                        <span className="text-[10px] text-slate-400">{msg.timestamp}</span>
                      </div>
                    )}

                    {/* Handoff Banner if any occurred */}
                    {!isUser && msg.handoffs && msg.handoffs.length > 0 && (
                      <div className="mb-2 px-3 py-1.5 rounded-lg bg-indigo-950/60 border border-indigo-800/60 text-[11px] text-indigo-300 flex items-center gap-2">
                        <ArrowRightLeft className="h-3 w-3 text-indigo-400 shrink-0" />
                        <span>
                          Switched agent: <strong>{msg.handoffs.map((h) => `${h.from} → ${h.to}`).join(', ')}</strong> ({msg.handoffs[0]?.reason})
                        </span>
                      </div>
                    )}

                    <div
                      className={`p-3.5 rounded-2xl text-xs leading-relaxed max-w-[85%] whitespace-pre-wrap ${
                        isUser
                          ? 'bg-emerald-600 text-white rounded-tr-sm shadow-md'
                          : 'bg-slate-900 text-slate-100 border border-slate-800 rounded-tl-sm shadow-md'
                      }`}
                    >
                      {msg.text}
                    </div>

                    {isUser && <span className="text-[10px] text-slate-500 mt-1 px-1">{msg.timestamp}</span>}
                  </div>
                );
              })}

              {simLoading && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-400 w-fit">
                  <Bot className="h-4 w-4 animate-spin text-emerald-400" />
                  <span>Evaluating intent & switching to the right specialist agent...</span>
                </div>
              )}
            </div>

            {/* Input Bar */}
            <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-2">
              <Input
                placeholder={
                  simChannel === 'whatsapp'
                    ? 'Type a customer inquiry (e.g., "Tell me product details", "How much for 5 seats?", "Book demo tomorrow 3pm")...'
                    : 'Type incoming customer email body...'
                }
                value={simInput}
                onChange={(e) => setSimInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendSimulated()}
                className="bg-slate-950 border-slate-800 text-xs focus-visible:ring-indigo-500"
              />
              <Button
                onClick={() => handleSendSimulated()}
                disabled={!simInput.trim() || simLoading}
                className="bg-emerald-600 hover:bg-emerald-500 text-white shrink-0 text-xs gap-1.5"
              >
                <Send className="h-3.5 w-3.5" />
                Send
              </Button>
            </div>
          </div>

          {/* Right Col: Instant Test Presets */}
          <div className="space-y-4">
            <Card className="border-slate-800 bg-slate-900/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                  <Play className="h-4 w-4 text-emerald-400" />
                  Quick Scenario Triggers
                </CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Click any card to simulate a realistic multi-step customer journey.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2.5">
                <button
                  onClick={() => handleSendSimulated('What are the core features of your AI calling and WhatsApp automation?')}
                  className="w-full text-left p-3 rounded-xl bg-slate-950/80 hover:bg-slate-800/60 border border-slate-800 text-xs text-slate-300 transition-all group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-amber-300 flex items-center gap-1">
                      🛎️ 1. Product Inquiries
                    </span>
                    <Badge variant="outline" className="text-[9px] py-0 text-slate-400">Receptionist</Badge>
                  </div>
                  <p className="text-[11px] text-slate-400 group-hover:text-slate-200">
                    "What are the core features of your AI calling and WhatsApp automation?"
                  </p>
                </button>

                <button
                  onClick={() => handleSendSimulated('How much does it cost for a team of 5 agents? Do you have yearly discounts?')}
                  className="w-full text-left p-3 rounded-xl bg-slate-950/80 hover:bg-slate-800/60 border border-slate-800 text-xs text-slate-300 transition-all group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-emerald-300 flex items-center gap-1">
                      💼 2. Pricing & Sales
                    </span>
                    <Badge variant="outline" className="text-[9px] py-0 text-slate-400">Handoff to Sales</Badge>
                  </div>
                  <p className="text-[11px] text-slate-400 group-hover:text-slate-200">
                    "How much does it cost for a team of 5 agents? Do you have yearly discounts?"
                  </p>
                </button>

                <button
                  onClick={() => handleSendSimulated('Awesome, can we book a quick live demo for tomorrow at 3:00 PM?')}
                  className="w-full text-left p-3 rounded-xl bg-slate-950/80 hover:bg-slate-800/60 border border-slate-800 text-xs text-slate-300 transition-all group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-cyan-300 flex items-center gap-1">
                      📅 3. Book Demo Slot
                    </span>
                    <Badge variant="outline" className="text-[9px] py-0 text-slate-400">Appointment Desk</Badge>
                  </div>
                  <p className="text-[11px] text-slate-400 group-hover:text-slate-200">
                    "Awesome, can we book a quick live demo for tomorrow at 3:00 PM?"
                  </p>
                </button>

                <button
                  onClick={() => handleSendSimulated('I am an existing client having an issue with WhatsApp webhook delivery, can you check?')}
                  className="w-full text-left p-3 rounded-xl bg-slate-950/80 hover:bg-slate-800/60 border border-slate-800 text-xs text-slate-300 transition-all group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-violet-300 flex items-center gap-1">
                      🛟 4. Support Issue
                    </span>
                    <Badge variant="outline" className="text-[9px] py-0 text-slate-400">Support 360°</Badge>
                  </div>
                  <p className="text-[11px] text-slate-400 group-hover:text-slate-200">
                    "I am an existing client having an issue with WhatsApp webhook delivery..."
                  </p>
                </button>
              </CardContent>
            </Card>

            <Card className="border-slate-800 bg-slate-900/60 p-4">
              <span className="text-xs font-bold text-slate-200 block mb-2">How Handoffs Work</span>
              <ul className="text-[11px] text-slate-400 space-y-1.5 list-disc list-inside">
                <li><strong className="text-slate-300">No context loss:</strong> A memory brief is automatically assembled.</li>
                <li><strong className="text-slate-300">Tool execution:</strong> Booking creates a real Google Meet room.</li>
                <li><strong className="text-slate-300">Auto campaigns:</strong> Triggers outcome-based WhatsApp & Email templates.</li>
              </ul>
            </Card>
          </div>
        </div>
      )}

      {/* ── SUB-TAB 3: ACTIVE SESSIONS & TELEMETRY ───────────────────────── */}
      {activeSubTab === 'live_states' && (
        <Card className="border-slate-800 bg-slate-900/60">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base text-white">Live Conversation Agent States</CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Real-time tracking of active agent assignments, customer memory slots, and human takeover.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadStates}
              className="text-xs border-slate-700 text-slate-300"
            >
              <RefreshCw className="h-3 w-3 mr-1" /> Refresh States
            </Button>
          </CardHeader>

          <CardContent>
            {states.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">
                No active conversations recorded yet. Send a WhatsApp message or run the simulator above to see live states.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-950/80 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-3">Customer / Ref</th>
                      <th className="py-3 px-3">Channel</th>
                      <th className="py-3 px-3">Active Agent</th>
                      <th className="py-3 px-3">Handoffs</th>
                      <th className="py-3 px-3">Turns</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {states.map((st) => (
                      <tr key={st.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-3">
                          <span className="font-semibold text-slate-200 block">
                            {st.customer_name || st.customer_phone || st.customer_email || 'Visitor'}
                          </span>
                          <span className="text-[10px] font-mono text-slate-500 block truncate max-w-[180px]">
                            {st.conversation_ref}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <Badge variant="outline" className="text-[10px] py-0 uppercase">
                            {st.channel}
                          </Badge>
                        </td>
                        <td className="py-3 px-3">
                          {getAgentBadge(st.active_agent)}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-300">
                          {st.handoff_count || 0}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-300">
                          {st.turn_count || 0}
                        </td>
                        <td className="py-3 px-3">
                          {st.human_takeover ? (
                            <Badge className="bg-rose-500/20 text-rose-300 border-rose-500/40 text-[10px]">
                              👨‍💼 Human Takeover
                            </Badge>
                          ) : (
                            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[10px]">
                              🤖 Autonomous
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewHandoffs(st)}
                              className="h-7 text-xs text-indigo-400 hover:text-indigo-300 hover:bg-indigo-950/40 px-2"
                            >
                              Handoff Trail
                            </Button>
                            <Button
                              variant={st.human_takeover ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => handleToggleTakeover(st)}
                              className={`h-7 text-xs px-2.5 ${
                                st.human_takeover
                                  ? 'bg-rose-600 hover:bg-rose-500 text-white'
                                  : 'border-slate-700 text-slate-300 hover:text-white'
                              }`}
                            >
                              {st.human_takeover ? 'Resume AI' : 'Take Over'}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── DIALOG 1: CUSTOMIZE AGENT PERSONA & KNOWLEDGE ─────────────────── */}
      <Dialog open={agentDialogOpen} onOpenChange={setAgentDialogOpen}>
        <DialogContent className="max-w-2xl bg-slate-900 border-slate-800 text-slate-100 max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <span className="text-2xl">{selectedAgent?.emoji || '🤖'}</span>
              Configure {selectedAgent?.display_name}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Customize system prompt persona, verified knowledge, and handoff behavior for this agent.
            </DialogDescription>
          </DialogHeader>

          {selectedAgent && (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-400">Display Name</label>
                  <Input
                    value={selectedAgent.display_name}
                    onChange={(e) => setSelectedAgent({ ...selectedAgent, display_name: e.target.value })}
                    className="bg-slate-950 border-slate-800 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-400">Emoji Avatar</label>
                  <Input
                    value={selectedAgent.emoji}
                    onChange={(e) => setSelectedAgent({ ...selectedAgent, emoji: e.target.value })}
                    className="bg-slate-950 border-slate-800 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-400">
                  System Persona & Guardrails (Instructions to the LLM)
                </label>
                <Textarea
                  rows={5}
                  value={selectedAgent.persona_prompt}
                  onChange={(e) => setSelectedAgent({ ...selectedAgent, persona_prompt: e.target.value })}
                  className="bg-slate-950 border-slate-800 text-xs font-mono leading-relaxed"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-400">
                  Domain Knowledge (Products, pricing plans, service FAQ)
                </label>
                <Textarea
                  rows={4}
                  value={selectedAgent.knowledge || ''}
                  onChange={(e) => setSelectedAgent({ ...selectedAgent, knowledge: e.target.value })}
                  placeholder="Paste product list, pricing tiers, or support policies here..."
                  className="bg-slate-950 border-slate-800 text-xs font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-400">Handoff Announcement Message</label>
                  <Input
                    value={selectedAgent.handoff_message || ''}
                    placeholder="e.g. Connecting you to Sales Specialist 💼"
                    onChange={(e) => setSelectedAgent({ ...selectedAgent, handoff_message: e.target.value })}
                    className="bg-slate-950 border-slate-800 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-400">Fallback Message (Offline)</label>
                  <Input
                    value={selectedAgent.fallback_message || ''}
                    onChange={(e) => setSelectedAgent({ ...selectedAgent, fallback_message: e.target.value })}
                    className="bg-slate-950 border-slate-800 text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800">
                <div>
                  <span className="text-xs font-semibold text-slate-200 block">Announce Agent Switch</span>
                  <span className="text-[10px] text-slate-500 block">
                    Prepend the handoff message when switching to this agent
                  </span>
                </div>
                <Switch
                  checked={selectedAgent.announce_handoff}
                  onCheckedChange={(val) => setSelectedAgent({ ...selectedAgent, announce_handoff: val })}
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setAgentDialogOpen(false)} className="text-xs">
                  Cancel
                </Button>
                <Button onClick={handleUpdateAgent} size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs">
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── DIALOG 2: HANDOFF AUDIT TRAIL ─────────────────────────────────── */}
      <Dialog open={handoffsDialogOpen} onOpenChange={setHandoffsDialogOpen}>
        <DialogContent className="max-w-xl bg-slate-900 border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <ArrowRightLeft className="h-4 w-4 text-indigo-400" />
              Agent Switch Audit Trail
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Audit log of all agent transitions for {selectedState?.customer_name || selectedState?.customer_phone || selectedState?.conversation_ref}
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-3 max-h-[60vh] overflow-y-auto">
            {stateHandoffs.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                No handoffs occurred yet. This conversation started and stayed with the initial agent.
              </div>
            ) : (
              stateHandoffs.map((h, idx) => (
                <div key={h.id || idx} className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-300">{h.from_agent || 'initial'}</span>
                      <ArrowRightLeft className="h-3 w-3 text-indigo-400" />
                      <span className="font-bold text-emerald-400">{h.to_agent}</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {new Date(h.created_on).toLocaleTimeString()}
                    </span>
                  </div>
                  {h.reason && (
                    <p className="text-[11px] text-slate-400 italic">
                      Reason: "{h.reason}"
                    </p>
                  )}
                  {h.trigger_message && (
                    <p className="text-[11px] text-slate-500 truncate">
                      Trigger: "{h.trigger_message}"
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
