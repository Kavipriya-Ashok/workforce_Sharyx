import React, { useState, useEffect } from 'react';
import {
  Phone,
  PhoneCall,
  Mic,
  Settings,
  Sparkles,
  RefreshCw,
  Play,
  Volume2,
  Key,
  Share2,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Plus,
  Radio,
  Activity,
  Layers,
  ChevronRight,
  ExternalLink,
  Bot,
  Zap,
  Building2,
  Dumbbell,
  GraduationCap,
  Sliders,
  Copy,
  Check,
  Headphones,
  Signal,
  ArrowUpRight,
  Sparkle,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  VoiceService,
  VoiceProviderType,
  MaskedVoiceConfig,
  VoiceAgentDto,
  VoiceCallLogItem,
  VoiceStats,
  SaveVoiceConfigPayload,
} from '@/service/voiceService';

export const VoiceAutomation: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'providers' | 'agents' | 'dispatch' | 'logs'>('dispatch');
  const [loading, setLoading] = useState(false);

  // Data states
  const [configs, setConfigs] = useState<Record<VoiceProviderType, MaskedVoiceConfig>>({} as any);
  const [agents, setAgents] = useState<VoiceAgentDto[]>([]);
  const [logs, setLogs] = useState<VoiceCallLogItem[]>([]);
  const [stats, setStats] = useState<VoiceStats>({
    totalCalls: 0,
    completedCalls: 0,
    avgDurationSeconds: 0,
    completionRate: 0,
  });

  // Provider test latency / status cache
  const [testResults, setTestResults] = useState<Record<string, { ok: boolean; message: string; latency?: number }>>({});
  const [testingProvider, setTestingProvider] = useState<string | null>(null);

  // Edit Config Modal state
  const [editingProvider, setEditingProvider] = useState<VoiceProviderType | null>(null);
  const [configForm, setConfigForm] = useState<SaveVoiceConfigPayload>({
    provider: 'vapi',
    api_key: '',
    phone_number_id: '',
    caller_id: '',
    base_url: '',
    webhook_forward_url: '',
    is_active: true,
  });

  // Create/Edit Agent Modal state
  const [agentModalOpen, setAgentModalOpen] = useState(false);
  const [agentForm, setAgentForm] = useState({
    name: '',
    provider: 'vapi' as VoiceProviderType,
    system_prompt: '',
    first_message: '',
    voice_id: '21m00Tcm4TlvDq8ikWAM',
    voice_provider: 'elevenlabs',
    llm_model: 'gpt-4o-mini',
    temperature: 0.4,
    language: 'en',
    transfer_agent_id: '',
    transfer_phone_number: '',
  });

  // Dispatch Call state
  const [dispatchAgentId, setDispatchAgentId] = useState('');
  const [dispatchPhone, setDispatchPhone] = useState('+918015779116');
  const [dispatchName, setDispatchName] = useState('Kavipriya');
  const [jsonExpanded, setJsonExpanded] = useState(false);
  const [dispatchVariables, setDispatchVariables] = useState(
    JSON.stringify(
      {
        customer_name: 'Kavipriya',
        project: 'Jain Housing Luxury Towers',
        budget: '₹85 Lakhs - 1.2 Crore',
        unit_type: '3 BHK Sea-View',
        scheduled_site_visit: 'Tomorrow 4:30 PM',
      },
      null,
      2
    )
  );
  const [dispatching, setDispatching] = useState(false);
  const [lastDispatchedCall, setLastDispatchedCall] = useState<any>(null);

  // Expanded log row
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Quick preset templates for one-click testing
  const PRESET_TEMPLATES = [
    {
      label: '🏠 Jain Housing Site Visit',
      agentName: 'JainHousing',
      data: {
        customer_name: 'Kavipriya',
        project_name: 'Jain Pebble Brook',
        scheduled_time: 'Tomorrow 11:00 AM',
        budget: '75 Lakhs',
        unit_type: '2 BHK',
      },
    },
    {
      label: '🏋️ Riya - Gym Membership',
      agentName: 'Riya - gym',
      data: {
        customer_name: 'Kavipriya',
        gym_branch: 'T. Nagar Elite Fitness',
        trial_pass: 'Free 3-Day Personal Trainer Pass',
        special_offer: 'Flat 20% Annual Membership Discount',
      },
    },
    {
      label: '📚 Vedantu Live Counseling',
      agentName: 'vedantu-pre-call',
      data: {
        student_name: 'Kavipriya',
        curriculum: 'Class 10 CBSE Math & Science',
        counselor_slot: 'Today at 6:00 PM',
        scholarship_eligible: 'Yes (Up to 40%)',
      },
    },
  ];

  // Load initial data
  const loadAllData = async () => {
    setLoading(true);
    try {
      const [cfgs, ags, lgs, sts] = await Promise.all([
        VoiceService.getConfigs(),
        VoiceService.listAgents(),
        VoiceService.getCallLogs('default', 50),
        VoiceService.getCallStats(),
      ]);
      setConfigs(cfgs);
      setAgents(ags);
      setLogs(lgs);
      setStats(sts);

      if (ags.length > 0) {
        if (!dispatchAgentId || !ags.some((a) => a.id === dispatchAgentId)) {
          const preferred = ags.find((a) => a.name.toLowerCase().includes('jain') || a.name.toLowerCase().includes('riya')) || ags[0];
          setDispatchAgentId(preferred.id);
        }
      } else {
        setDispatchAgentId('');
      }
    } catch {
      toast.error('Failed to load voice telemetry');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectActiveProvider = async (provider: VoiceProviderType) => {
    setLoading(true);
    try {
      await VoiceService.activateProvider(provider);
      toast.success(`${provider === 'vapi' ? 'Vapi.ai' : 'Sharyx SaaS Telephony'} is now your exclusive active voice platform!`);
      await loadAllData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to switch active platform');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnectProvider = async (provider: VoiceProviderType) => {
    setLoading(true);
    try {
      await VoiceService.disconnectProvider(provider);
      toast.info(`${provider === 'vapi' ? 'Vapi.ai' : 'Sharyx SaaS Telephony'} disconnected. Associated agents vanished.`);
      await loadAllData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to disconnect platform');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncAll = async () => {
    setLoading(true);
    try {
      const synced = await VoiceService.syncAllAgents();
      setAgents(synced);
      toast.success(`Synchronized ${synced.length} assistants for your active voice platform!`);
      await loadAllData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Could not sync assistants across platforms');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Provider Test Handler
  const handleTestConnection = async (provider: VoiceProviderType, candidateKey?: string) => {
    setTestingProvider(provider);
    try {
      const res = await VoiceService.testConnection(provider, candidateKey);
      setTestResults((prev) => ({
        ...prev,
        [provider]: { ok: res.ok, message: res.message, latency: res.latencyMs },
      }));
      if (res.ok) {
        toast.success(`${provider.toUpperCase()} connected successfully! (${res.latencyMs}ms)`);
      } else {
        toast.error(`Connection failed: ${res.message}`);
      }
    } catch (err: any) {
      setTestResults((prev) => ({
        ...prev,
        [provider]: { ok: false, message: err.message },
      }));
      toast.error(`Could not reach ${provider}`);
    } finally {
      setTestingProvider(null);
    }
  };

  // Provider Config Save
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProvider) return;
    try {
      await VoiceService.saveConfig({
        ...configForm,
        provider: editingProvider,
      });
      toast.success(`${editingProvider.toUpperCase()} configuration saved dynamically!`);
      setEditingProvider(null);
      loadAllData();
    } catch {
      toast.error('Failed to update provider configuration');
    }
  };

  const openConfigEdit = (p: VoiceProviderType) => {
    const existing = configs[p] || {};
    setConfigForm({
      provider: p,
      api_key: '',
      phone_number_id: existing.phone_number_id || '',
      caller_id: existing.caller_id || '',
      base_url: existing.base_url || '',
      webhook_forward_url: existing.webhook_forward_url || '',
      is_active: existing.is_active ?? true,
    });
    setEditingProvider(p);
  };

  // Agent Creation
  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await VoiceService.createAgent(agentForm);
      toast.success(`Voice Agent "${agentForm.name}" created and synced!`);
      setAgentModalOpen(false);
      loadAllData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create voice agent');
    }
  };

  // Apply Quick Preset
  const handleApplyPreset = (preset: (typeof PRESET_TEMPLATES)[0]) => {
    const matchedAgent = agents.find((a) => a.name.toLowerCase().includes(preset.agentName.toLowerCase()));
    if (matchedAgent) {
      setDispatchAgentId(matchedAgent.id);
    }
    setDispatchVariables(JSON.stringify(preset.data, null, 2));
    if (preset.data.customer_name) {
      setDispatchName(preset.data.customer_name);
    }
    toast.info(`Applied template: ${preset.label}`);
  };

  // Dispatch Live Call
  const handleDispatchCall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispatchAgentId) {
      toast.error('Please select a voice agent');
      return;
    }
    if (!dispatchPhone || dispatchPhone.length < 8) {
      toast.error('Please enter a valid telephone number with country code');
      return;
    }

    let parsedVars = {};
    try {
      if (dispatchVariables.trim()) {
        parsedVars = JSON.parse(dispatchVariables);
      }
    } catch {
      toast.error('Dynamic Variables must be valid JSON');
      return;
    }

    setDispatching(true);
    try {
      const res = await VoiceService.dispatchCall({
        agent_id: dispatchAgentId,
        phone_number: dispatchPhone.trim(),
        customer_name: dispatchName.trim() || undefined,
        custom_variables: parsedVars,
      });
      setLastDispatchedCall(res);
      toast.success(`Call Dispatched! Call ID: ${res?.provider_call_id || res?.id || 'Success'}`);
      loadAllData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Failed to dispatch voice call');
    } finally {
      setDispatching(false);
    }
  };

  const selectedAgent = agents.find((a) => a.id === dispatchAgentId);

  return (
    <div className="space-y-4 sm:space-y-5 pb-8 font-sans selection:bg-cyan-500 selection:text-black">
      {/* ── HERO BANNER: NEXT-GEN TELEPHONY ENGINE ─────────────────────── */}
      <div className="relative rounded-3xl border border-slate-800/90 bg-gradient-to-br from-slate-950 via-[#0d1424] to-[#090e1a] p-4 sm:p-6 shadow-2xl overflow-hidden">
        {/* Ambient Glow Lights */}
        <div className="absolute top-0 right-1/4 -mt-20 w-80 h-80 bg-cyan-500/10 rounded-full blur-[90px] pointer-events-none" />
        <div className="absolute bottom-0 right-0 -mb-20 w-64 h-64 bg-indigo-500/15 rounded-full blur-[80px] pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-2xl bg-gradient-to-tr from-cyan-400 via-indigo-500 to-purple-600 p-[1px] shadow-lg shadow-cyan-500/20 shrink-0">
              <div className="h-full w-full rounded-2xl bg-slate-950 flex items-center justify-center">
                <PhoneCall className="h-4 w-4 sm:h-5 sm:w-5 text-cyan-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl lg:text-2xl font-black text-white tracking-tight">
                  Voice AI Telephony Studio
                </h1>
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold tracking-wider uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Live Gateway
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
                Multi-provider voice telephony powered by Vapi.ai, Retell AI, & Twilio carrier SIP trunks
              </p>
            </div>
          </div>

          {/* Quick Actions & Live Carrier Status */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl sm:rounded-2xl bg-slate-900/80 border border-slate-800 text-[11px] sm:text-xs text-slate-300 backdrop-blur-md">
              <Signal className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-slate-400">Carrier:</span>
              <span className="font-semibold text-white">Twilio SIP Trunk</span>
            </div>

            <button
              onClick={loadAllData}
              disabled={loading}
              className="px-3 py-1.5 rounded-xl sm:rounded-2xl text-[11px] sm:text-xs font-semibold border border-slate-700 bg-slate-900/80 hover:bg-slate-800 text-slate-200 flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
            >
              <RefreshCw className={`h-3 w-3 sm:h-3.5 sm:w-3.5 text-cyan-400 ${loading ? 'animate-spin' : ''}`} />
              <span>Sync</span>
            </button>

            <button
              onClick={() => setActiveTab('dispatch')}
              className="px-3.5 py-1.5 rounded-xl sm:rounded-2xl text-[11px] sm:text-xs font-bold bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 hover:brightness-110 text-slate-950 shadow-lg shadow-cyan-500/20 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Phone className="h-3 w-3 sm:h-3.5 sm:w-3.5 fill-current" />
              <span>Make Live Call</span>
            </button>
          </div>
        </div>

        {/* ── KPI METRICS CARDS ─────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3.5 mt-4 sm:mt-5">
          <div className="relative group p-3 sm:p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 backdrop-blur-md hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span className="font-medium">Total Sessions</span>
              <Layers className="h-3.5 w-3.5 text-cyan-400" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-white mt-1 tracking-tight">{stats.totalCalls}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Outbound calls</div>
          </div>

          <div className="relative group p-3 sm:p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 backdrop-blur-md hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span className="font-medium">Completed</span>
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-emerald-400 mt-1 tracking-tight">{stats.completedCalls}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">AI concluded</div>
          </div>

          <div className="relative group p-3 sm:p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 backdrop-blur-md hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span className="font-medium">Avg Duration</span>
              <Clock className="h-3.5 w-3.5 text-indigo-400" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-white mt-1 tracking-tight">
              {Math.floor(stats.avgDurationSeconds / 60)}m {stats.avgDurationSeconds % 60}s
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Per conversation</div>
          </div>

          <div className="relative group p-3 sm:p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 backdrop-blur-md hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span className="font-medium">Active Agents</span>
              <Bot className="h-3.5 w-3.5 text-purple-400" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-purple-400 mt-1 tracking-tight">{agents.length}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Vapi & Retell AI</div>
          </div>
        </div>
      </div>

      {/* ── NAVIGATION TABS ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 border-b border-slate-800/80 pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveTab('dispatch')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'dispatch'
              ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-slate-950 shadow-md shadow-cyan-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
            }`}
        >
          <PhoneCall className="h-3.5 w-3.5" />
          <span>Dispatch & Test Call</span>
        </button>

        <button
          onClick={() => setActiveTab('agents')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-semibold transition-all cursor-pointer ${activeTab === 'agents'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/25'
              : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
            }`}
        >
          <Bot className="h-3.5 w-3.5" />
          <span>Voice Agents Studio ({agents.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('providers')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-semibold transition-all cursor-pointer ${activeTab === 'providers'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
              : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
            }`}
        >
          <Key className="h-3.5 w-3.5" />
          <span>Dynamic Providers (Vapi / Retell)</span>
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-semibold transition-all cursor-pointer ${activeTab === 'logs'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25'
              : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
            }`}
        >
          <FileText className="h-3.5 w-3.5" />
          <span>Live Call Logs & Recordings ({logs.length})</span>
        </button>
      </div>

      {/* ── TAB 1: DISPATCH & TEST CALL (INTERACTIVE PHONE STUDIO) ───────── */}
      {activeTab === 'dispatch' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT: THE CALL DIALER */}
          <div className="lg:col-span-7 rounded-3xl border border-slate-800 bg-slate-950/80 p-6 lg:p-7 space-y-6 shadow-xl backdrop-blur-xl">
            <div>
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <PhoneCall className="h-4 w-4 text-cyan-400" />
                  <span>Outbound Voice Dispatcher</span>
                </h2>
                <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                  Carrier Ready
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Trigger real telephone calls with live prompt variables, ElevenLabs voice, and instant webhooks.
              </p>
            </div>

            {/* Quick 1-Click Templates */}
            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5 uppercase tracking-wider">
                <Sparkle className="h-3 w-3 text-cyan-400" />
                <span>Quick Test Presets (Click to load):</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {PRESET_TEMPLATES.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleApplyPreset(preset)}
                    className="px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <span>{preset.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleDispatchCall} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Select AI Voice Assistant *
                </label>
                <select
                  value={dispatchAgentId}
                  onChange={(e) => setDispatchAgentId(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-500 font-medium"
                  required
                >
                  <option value="">-- Choose Assistant --</option>
                  {agents.map((ag) => (
                    <option key={ag.id} value={ag.id}>
                      {ag.name} ({ag.provider.toUpperCase()} • {ag.llm_model})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Customer Phone Number *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={dispatchPhone}
                      onChange={(e) => setDispatchPhone(e.target.value)}
                      placeholder="+91 80157 79116"
                      className="w-full px-4 py-3 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 font-mono tracking-wide"
                      required
                    />
                    <Phone className="absolute right-3.5 top-3.5 h-4 w-4 text-slate-500" />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">Must include country code (e.g. +91)</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Customer Name</label>
                  <input
                    type="text"
                    value={dispatchName}
                    onChange={(e) => setDispatchName(e.target.value)}
                    placeholder="e.g. Kavipriya"
                    className="w-full px-4 py-3 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Injected into greeting message</p>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Dynamic Prompt Variables (JSON Payload)
                  </label>
                  <button
                    type="button"
                    onClick={() => setJsonExpanded(!jsonExpanded)}
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 font-mono flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <span>{jsonExpanded ? 'Collapse ▲' : 'Expand ▼'}</span>
                  </button>
                </div>
                <textarea
                  value={dispatchVariables}
                  onChange={(e) => setDispatchVariables(e.target.value)}
                  rows={jsonExpanded ? 7 : 3}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-cyan-300 font-mono placeholder-slate-600 focus:outline-none focus:border-cyan-500 leading-relaxed"
                />
              </div>

              <button
                type="submit"
                disabled={dispatching}
                className="w-full py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 hover:brightness-110 text-slate-950 shadow-xl shadow-cyan-500/25 flex items-center justify-center gap-2.5 transition-all cursor-pointer disabled:opacity-50"
              >
                {dispatching ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Dialing Telephony Carrier...</span>
                  </>
                ) : (
                  <>
                    <PhoneCall className="h-4 w-4 fill-current" />
                    <span>Initiate Call Now</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* RIGHT: LIVE TELEMETRY STAGE */}
          <div className="lg:col-span-5 space-y-4">
            {/* Active Assistant Card */}
            {selectedAgent && (
              <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-5 space-y-4 backdrop-blur-xl">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 font-bold">
                      <Bot className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-white">{selectedAgent.name}</h3>
                      <p className="text-[10px] text-slate-400 uppercase font-mono">
                        {selectedAgent.provider} • {selectedAgent.llm_model}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-semibold">
                    ElevenLabs
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="text-[11px] text-slate-400 font-semibold">Greeting Message:</div>
                  <p className="text-xs text-slate-200 bg-slate-900/60 p-3 rounded-xl border border-slate-800/80 italic leading-relaxed">
                    "{selectedAgent.first_message}"
                  </p>
                </div>

                {/* Simulated Audio Waveform Visualizer */}
                <div className="p-3.5 rounded-2xl bg-slate-900/40 border border-slate-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Headphones className="h-4 w-4 text-cyan-400" />
                    <span>Turn-Taking Engine:</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="h-4 w-1 bg-cyan-400 rounded-full animate-pulse" />
                    <span className="h-6 w-1 bg-cyan-400 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                    <span className="h-3 w-1 bg-cyan-400 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
                    <span className="h-7 w-1 bg-cyan-400 rounded-full animate-pulse" style={{ animationDelay: '75ms' }} />
                    <span className="h-5 w-1 bg-cyan-400 rounded-full animate-pulse" style={{ animationDelay: '220ms' }} />
                  </div>
                </div>
              </div>
            )}

            {/* Last Dispatch Result Banner */}
            {lastDispatchedCall && (
              <div className="rounded-3xl border border-emerald-500/40 bg-gradient-to-br from-emerald-950/30 to-slate-950 p-5 space-y-3 backdrop-blur-xl">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Call Dispatched into Carrier Network</span>
                </div>
                <div className="text-xs text-slate-300 space-y-1.5 font-mono text-[11px] bg-slate-950/60 p-3 rounded-xl border border-emerald-500/20">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Call ID:</span>
                    <span className="text-white truncate max-w-[180px]">
                      {lastDispatchedCall?.provider_call_id || lastDispatchedCall?.id || '—'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Target:</span>
                    <span className="text-emerald-400">{lastDispatchedCall.customer_phone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Status:</span>
                    <span className="text-cyan-400 font-bold uppercase">{lastDispatchedCall.call_status}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 2: VOICE AGENTS STUDIO ─────────────────────────────────── */}
      {activeTab === 'agents' && (
        <div className="space-y-4">
          {/* Active Platform Banner */}
          <div className="p-3.5 px-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
            <div className="flex items-center gap-2.5">
              <span className="text-xs text-slate-400">Exclusive Active Engine:</span>
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-lg border flex items-center gap-1.5 uppercase font-mono ${
                configs.vapi?.is_active
                  ? 'bg-violet-500/15 text-violet-300 border-violet-500/30'
                  : configs.saas_fallback?.is_active
                  ? 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}>
                <span className={`h-2 w-2 rounded-full ${
                  configs.vapi?.is_active || configs.saas_fallback?.is_active
                    ? 'bg-emerald-400 animate-pulse'
                    : 'bg-slate-500'
                }`} />
                {configs.vapi?.is_active
                  ? 'Vapi.ai'
                  : configs.saas_fallback?.is_active
                  ? 'Sharyx SaaS Telephony'
                  : 'No Active Platform'}
              </span>
              <span className="text-[11px] text-slate-500">
                ({agents.length} active agent{agents.length !== 1 ? 's' : ''})
              </span>
            </div>

            <div className="flex items-center gap-2">
              {configs.vapi?.is_active ? (
                <button
                  type="button"
                  onClick={() => handleSelectActiveProvider('saas_fallback')}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 border border-slate-700"
                  title="Switch to Sharyx SaaS Telephony (Vapi agents will vanish)"
                >
                  <span>Switch to SaaS Telephony</span>
                  <span className="text-cyan-400">➔</span>
                </button>
              ) : configs.saas_fallback?.is_active ? (
                <button
                  type="button"
                  onClick={() => handleSelectActiveProvider('vapi')}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 border border-slate-700"
                  title="Switch to Vapi.ai (SaaS agents will vanish)"
                >
                  <span>Switch to Vapi.ai</span>
                  <span className="text-cyan-400">➔</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setActiveTab('providers')}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all cursor-pointer"
                >
                  Activate a Platform
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white">Active Voice Personas ({agents.length})</h2>
              <p className="text-xs text-slate-400">
                Only assistants from your currently active voice engine are shown. Disconnected platforms vanish automatically.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSyncAll}
                disabled={loading}
                className="px-3.5 py-2 rounded-2xl text-xs font-semibold border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/10 flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                title="Synchronize assistants from your selected active platform"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Sync Active Platform</span>
              </button>

              <button
                onClick={() => setAgentModalOpen(true)}
                className="px-4 py-2 rounded-2xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white flex items-center gap-1.5 shadow-md shadow-purple-600/25 transition-all cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Create Voice Agent</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {agents.map((ag) => (
              <div
                key={ag.id}
                className="rounded-3xl border border-slate-800 bg-slate-950/80 p-5 space-y-4 hover:border-slate-700 transition-all flex flex-col justify-between group shadow-lg"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30">
                      {ag.provider.toUpperCase()}
                    </span>
                    <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                      <Mic className="h-3 w-3 text-cyan-400" />
                      <span>{ag.voice_provider}</span>
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-white group-hover:text-cyan-400 transition-colors">
                    {ag.name}
                  </h3>
                  <p className="text-xs text-slate-300 line-clamp-3 italic leading-relaxed">
                    "{ag.first_message}"
                  </p>
                </div>

                <div className="space-y-2 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400">
                  <div className="flex justify-between">
                    <span>LLM Engine:</span>
                    <span className="text-slate-200 font-mono">{ag.llm_model}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Remote UUID:</span>
                    <span className="text-slate-200 font-mono truncate max-w-[140px]">{ag.remote_agent_id}</span>
                  </div>

                  {(ag.transfer_agent_id || ag.transfer_phone_number) && (
                    <div className="flex items-center justify-between text-indigo-300 bg-indigo-950/40 px-2.5 py-1 rounded-xl border border-indigo-500/20 text-[10px]">
                      <span className="flex items-center gap-1 font-semibold">
                        <Share2 className="h-3 w-3 text-indigo-400" />
                        <span>Warm Transfer:</span>
                      </span>
                      <span className="font-mono truncate max-w-[130px]">
                        {agents.find((x) => x.id === ag.transfer_agent_id)?.name || ag.transfer_phone_number}
                      </span>
                    </div>
                  )}

                  <button
                    onClick={() => {
                      setDispatchAgentId(ag.id);
                      setActiveTab('dispatch');
                    }}
                    className="w-full mt-2 py-2.5 rounded-2xl text-xs font-bold bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    <span>Select for Outbound Call</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB 3: DYNAMIC PROVIDERS ─────────────────────────────────────── */}
      {activeTab === 'providers' && (
        <div className="space-y-4">
          {/* EXCLUSIVE ACTIVE PLATFORM SELECTOR */}
          <div className="p-4 sm:p-5 rounded-3xl border border-indigo-900/50 bg-gradient-to-r from-slate-950 via-indigo-950/30 to-slate-950 shadow-xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-indigo-300 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-cyan-400" />
                  <span>Choose Active Platform (Single Engine Selection)</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Select your primary platform. When you choose Vapi, SaaS agents vanish. When you choose SaaS, Vapi agents vanish. Disconnecting vanishes its agents immediately.
                </p>
              </div>
              <div className="flex items-center gap-1.5 self-start sm:self-auto">
                <span className="text-[10px] text-slate-400">Selected Platform:</span>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 uppercase">
                  {configs.vapi?.is_active ? 'Vapi.ai' : configs.saas_fallback?.is_active ? 'Sharyx SaaS Telephony' : 'None Selected'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => handleSelectActiveProvider('vapi')}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                  configs.vapi?.is_active
                    ? 'bg-violet-950/40 border-violet-500 shadow-md shadow-violet-500/20'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`h-8 w-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                    configs.vapi?.is_active ? 'bg-violet-500 text-white' : 'bg-slate-800 text-slate-400'
                  }`}>
                    V
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-2">
                      <span>Vapi.ai Engine</span>
                      {configs.vapi?.is_active && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-emerald-500/20 text-emerald-400 font-bold uppercase">Active</span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400">Ultra-Low Latency Telephony</div>
                  </div>
                </div>
                <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                  configs.vapi?.is_active ? 'border-cyan-400 bg-cyan-400/20' : 'border-slate-700'
                }`}>
                  {configs.vapi?.is_active && <div className="h-2 w-2 rounded-full bg-cyan-400" />}
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleSelectActiveProvider('saas_fallback')}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                  configs.saas_fallback?.is_active
                    ? 'bg-fuchsia-950/40 border-fuchsia-500 shadow-md shadow-fuchsia-500/20'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`h-8 w-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                    configs.saas_fallback?.is_active ? 'bg-fuchsia-500 text-white' : 'bg-slate-800 text-slate-400'
                  }`}>
                    S
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-2">
                      <span>Sharyx SaaS Telephony</span>
                      {configs.saas_fallback?.is_active && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-emerald-500/20 text-emerald-400 font-bold uppercase">Active</span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400">Autonomous Core & PBX Platform</div>
                  </div>
                </div>
                <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                  configs.saas_fallback?.is_active ? 'border-cyan-400 bg-cyan-400/20' : 'border-slate-700'
                }`}>
                  {configs.saas_fallback?.is_active && <div className="h-2 w-2 rounded-full bg-cyan-400" />}
                </div>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* VAPI CARD */}
            <div className={`rounded-3xl border bg-slate-950/80 p-6 space-y-4 hover:border-slate-700 transition-all shadow-xl ${
              configs.vapi?.is_active ? 'border-violet-500/70 shadow-violet-500/10' : 'border-slate-800'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 font-bold text-base">
                    V
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Vapi.ai</h3>
                    <p className="text-[11px] text-slate-400">Ultra-low latency WebRTC & SIP phone agents</p>
                  </div>
                </div>
                <span
                  className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${
                    configs.vapi?.is_active
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  {configs.vapi?.is_active ? '● Active Engine' : 'Inactive'}
                </span>
              </div>

              <div className="space-y-2 text-xs text-slate-300 py-1 border-y border-slate-800">
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">API Key:</span>
                  <span className="font-mono text-slate-200">
                    {configs.vapi?.masked_key || '0d49...a655'}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Phone ID:</span>
                  <span className="font-mono text-slate-200 truncate max-w-[180px]">
                    {configs.vapi?.phone_number_id || '55a48c4e-f77d-4515-a53e-810677e78dac'}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Webhook Forwarder:</span>
                  <span className="text-slate-200 truncate max-w-[200px]">
                    {configs.vapi?.webhook_forward_url || 'None (Internal DB only)'}
                  </span>
                </div>
              </div>

              {testResults.vapi && (
                <div
                  className={`p-3 rounded-xl text-xs border flex items-center gap-2 ${testResults.vapi.ok
                      ? 'bg-emerald-950/30 border-emerald-800/50 text-emerald-300'
                      : 'bg-rose-950/30 border-rose-800/50 text-rose-300'
                    }`}
                >
                  {testResults.vapi.ok ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <XCircle className="h-4 w-4 shrink-0" />}
                  <span>{testResults.vapi.message}</span>
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => openConfigEdit('vapi')}
                  className="flex-1 py-2.5 rounded-2xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition-all text-center border border-slate-800 cursor-pointer"
                >
                  Configure
                </button>
                <button
                  onClick={() => handleTestConnection('vapi')}
                  disabled={testingProvider === 'vapi'}
                  className="px-3.5 py-2.5 rounded-2xl text-xs font-semibold border border-violet-500/30 text-violet-300 hover:bg-violet-500/10 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${testingProvider === 'vapi' ? 'animate-spin' : ''}`} />
                  <span>Test</span>
                </button>
                {configs.vapi?.is_active ? (
                  <button
                    onClick={() => handleDisconnectProvider('vapi')}
                    className="px-3 py-2.5 rounded-2xl text-xs font-semibold bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 text-rose-300 transition-all cursor-pointer flex items-center gap-1"
                    title="Disconnect Vapi and vanish all Vapi agents"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    <span>Disconnect</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleSelectActiveProvider('vapi')}
                    className="px-3 py-2.5 rounded-2xl text-xs font-bold bg-violet-600/30 hover:bg-violet-600 border border-violet-500/40 text-violet-200 hover:text-white transition-all cursor-pointer flex items-center gap-1"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Activate</span>
                  </button>
                )}
              </div>
            </div>

            {/* RETELL AI CARD */}
            <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6 space-y-4 hover:border-slate-700 transition-all shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold text-base">
                    R
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Retell AI</h3>
                    <p className="text-[11px] text-slate-400">High-naturalness conversational speech engine</p>
                  </div>
                </div>
                <span
                  className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${configs.retell?.has_key
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    }`}
                >
                  {configs.retell?.has_key ? 'Active & Configured' : 'Needs API Key'}
                </span>
              </div>

              <div className="space-y-2 text-xs text-slate-300 py-1 border-y border-slate-800">
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">API Key:</span>
                  <span className="font-mono text-slate-200">
                    {configs.retell?.masked_key || 'Not set'}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Caller ID:</span>
                  <span className="text-slate-200">{configs.retell?.caller_id || 'System Default'}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Webhook Forwarder:</span>
                  <span className="text-slate-200 truncate max-w-[200px]">
                    {configs.retell?.webhook_forward_url || 'None (Internal DB only)'}
                  </span>
                </div>
              </div>

              {testResults.retell && (
                <div
                  className={`p-3 rounded-xl text-xs border flex items-center gap-2 ${testResults.retell.ok
                      ? 'bg-emerald-950/30 border-emerald-800/50 text-emerald-300'
                      : 'bg-rose-950/30 border-rose-800/50 text-rose-300'
                    }`}
                >
                  {testResults.retell.ok ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <XCircle className="h-4 w-4 shrink-0" />}
                  <span>{testResults.retell.message}</span>
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => openConfigEdit('retell')}
                  className="flex-1 py-2.5 rounded-2xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition-all text-center border border-slate-800 cursor-pointer"
                >
                  Configure Credentials
                </button>
                <button
                  onClick={() => handleTestConnection('retell')}
                  disabled={testingProvider === 'retell'}
                  className="px-4 py-2.5 rounded-2xl text-xs font-semibold border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/10 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${testingProvider === 'retell' ? 'animate-spin' : ''}`} />
                  <span>Test API</span>
                </button>
              </div>
            </div>

            {/* SHARYX VOICE AI FALLBACK CARD */}
            <div className={`rounded-3xl border bg-slate-950/80 p-6 space-y-4 hover:border-slate-700 transition-all shadow-xl ${
              configs.saas_fallback?.is_active ? 'border-fuchsia-500/70 shadow-fuchsia-500/10' : 'border-slate-800'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-fuchsia-500/10 border border-fuchsia-500/20 flex items-center justify-center text-fuchsia-400 font-bold text-base">
                    S
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Sharyx Voice AI</h3>
                    <p className="text-[11px] text-slate-400">Autonomous Core & PBX Telephony Engine</p>
                  </div>
                </div>
                <span
                  className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${
                    configs.saas_fallback?.is_active
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  {configs.saas_fallback?.is_active ? '● Active Engine' : 'Inactive'}
                </span>
              </div>

              <div className="space-y-2 text-xs text-slate-300 py-1 border-y border-slate-800">
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">API Key / Token:</span>
                  <span className="font-mono text-slate-200">
                    {configs.saas_fallback?.masked_key || 'System Default'}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Endpoint:</span>
                  <span className="font-mono text-slate-200 truncate max-w-[180px]">
                    {configs.saas_fallback?.base_url || 'https://fallback-voice.sharyx.ai'}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Caller ID:</span>
                  <span className="text-slate-200">{configs.saas_fallback?.caller_id || '+1 (912) 733-4409'}</span>
                </div>
              </div>

              {testResults.saas_fallback && (
                <div
                  className={`p-3 rounded-xl text-xs border flex items-center gap-2 ${testResults.saas_fallback.ok
                      ? 'bg-emerald-950/30 border-emerald-800/50 text-emerald-300'
                      : 'bg-rose-950/30 border-rose-800/50 text-rose-300'
                    }`}
                >
                  {testResults.saas_fallback.ok ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <XCircle className="h-4 w-4 shrink-0" />}
                  <span>{testResults.saas_fallback.message}</span>
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => openConfigEdit('saas_fallback')}
                  className="flex-1 py-2.5 rounded-2xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition-all text-center border border-slate-800 cursor-pointer"
                >
                  Configure
                </button>
                <button
                  onClick={() => handleTestConnection('saas_fallback')}
                  disabled={testingProvider === 'saas_fallback'}
                  className="px-3.5 py-2.5 rounded-2xl text-xs font-semibold border border-fuchsia-500/30 text-fuchsia-300 hover:bg-fuchsia-500/10 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${testingProvider === 'saas_fallback' ? 'animate-spin' : ''}`} />
                  <span>Test</span>
                </button>
                {configs.saas_fallback?.is_active ? (
                  <button
                    onClick={() => handleDisconnectProvider('saas_fallback')}
                    className="px-3 py-2.5 rounded-2xl text-xs font-semibold bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 text-rose-300 transition-all cursor-pointer flex items-center gap-1"
                    title="Disconnect SaaS and vanish all SaaS agents"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    <span>Disconnect</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleSelectActiveProvider('saas_fallback')}
                    className="px-3 py-2.5 rounded-2xl text-xs font-bold bg-fuchsia-600/30 hover:bg-fuchsia-600 border border-fuchsia-500/40 text-fuchsia-200 hover:text-white transition-all cursor-pointer flex items-center gap-1"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Activate</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 4: CALL LOGS & CHAT-BUBBLE TRANSCRIPTS ──────────────────── */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white">Call Logs & Dialogue Audio ({logs.length})</h2>
              <p className="text-xs text-slate-400">
                Inspect recordings, AI summaries, bubble transcripts, and extracted lead data
              </p>
            </div>
            <button
              onClick={loadAllData}
              className="px-3.5 py-1.5 rounded-xl border border-slate-800 bg-slate-900 text-xs text-slate-300 hover:text-white flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="h-3 w-3" />
              <span>Refresh Logs</span>
            </button>
          </div>

          {logs.length === 0 ? (
            <div className="rounded-3xl border border-slate-800 bg-slate-950/60 p-12 text-center text-slate-400 text-xs">
              No calls logged yet. Switch to "Dispatch & Test Call" to place your first live session!
            </div>
          ) : (
            <div className="space-y-2.5">
              {logs.map((log) => {
                const isExpanded = expandedLogId === log.id;
                return (
                  <div
                    key={log.id}
                    className="rounded-2xl border border-slate-800/90 bg-slate-950/80 overflow-hidden transition-all hover:border-slate-700 shadow-md"
                  >
                    <div
                      onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                      className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer select-none"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="h-9 w-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
                          <Phone className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white">
                              {log.customer_name || 'Customer'}
                            </span>
                            <span className="text-[11px] text-slate-400 font-mono">
                              ({log.customer_phone})
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                            <span>Agent: {log.agent_name || 'Voice Assistant'}</span>
                            <span>•</span>
                            <span className="uppercase text-[10px] font-bold text-indigo-400">
                              {log.provider}
                            </span>
                            <span>•</span>
                            <span>{new Date(log.created_on).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3.5 self-end md:self-auto">
                        <span
                          className={`text-[10px] font-bold px-3 py-0.5 rounded-full border ${log.call_status === 'completed'
                              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                              : log.call_status === 'failed'
                                ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                                : 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30'
                            }`}
                        >
                          {log.call_status}
                        </span>

                        <span className="text-xs font-mono text-slate-300">
                          {log.duration_seconds ? `${log.duration_seconds}s` : '0s'}
                        </span>

                        <ChevronRight
                          className={`h-4 w-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''
                            }`}
                        />
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-slate-800/90 bg-[#070b13] p-5 space-y-4">
                        {/* Audio Player */}
                        {log.recording_url ? (
                          <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
                            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                              <Volume2 className="h-4 w-4 text-cyan-400" />
                              <span>Audio Dialogue Playback</span>
                            </div>
                            <audio controls className="w-full h-8">
                              <source src={log.recording_url} type="audio/wav" />
                              <source src={log.recording_url} type="audio/mpeg" />
                              Your browser does not support audio playback.
                            </audio>
                          </div>
                        ) : null}

                        {/* AI Summary */}
                        {log.summary && (
                          <div className="space-y-1">
                            <div className="text-xs font-bold text-slate-300">AI Call Summary</div>
                            <p className="text-xs text-slate-300 bg-slate-900/40 border border-slate-800/80 p-3.5 rounded-2xl leading-relaxed">
                              {log.summary}
                            </p>
                          </div>
                        )}

                        {/* Interactive Chat Bubble Transcript */}
                        <div className="space-y-2">
                          <div className="text-xs font-bold text-slate-300">Full Dialogue Transcript</div>
                          <div className="max-h-72 overflow-y-auto p-4 rounded-2xl bg-slate-900/30 border border-slate-800/80 space-y-2.5">
                            {log.transcript
                              ? log.transcript.split('\n').map((line, idx) => {
                                const isAi = line.toLowerCase().startsWith('ai:') || line.toLowerCase().startsWith('assistant:');
                                return (
                                  <div
                                    key={idx}
                                    className={`flex flex-col text-xs max-w-[85%] ${isAi ? 'self-start' : 'self-end ml-auto'
                                      }`}
                                  >
                                    <div
                                      className={`p-3 rounded-2xl leading-relaxed ${isAi
                                          ? 'bg-indigo-950/50 text-indigo-200 border border-indigo-800/40 rounded-tl-sm'
                                          : 'bg-slate-800/80 text-white border border-slate-700/60 rounded-tr-sm'
                                        }`}
                                    >
                                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                                        {isAi ? '🤖 AI Assistant' : '👤 Customer'}
                                      </div>
                                      {line.replace(/^(ai:|assistant:|customer:|user:)\s*/i, '')}
                                    </div>
                                  </div>
                                );
                              })
                              : 'No transcript recorded.'}
                          </div>
                        </div>

                        {/* Extracted Slots */}
                        {log.extracted_slots && Object.keys(log.extracted_slots).length > 0 && (
                          <div className="space-y-1">
                            <div className="text-xs font-bold text-slate-300">Dynamic Extracted Context</div>
                            <pre className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-cyan-400 overflow-x-auto">
                              {JSON.stringify(log.extracted_slots, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── EDIT PROVIDER MODAL ─────────────────────────────────────────── */}
      {editingProvider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-lg max-h-[88vh] flex flex-col rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl my-auto overflow-hidden">
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-800 bg-slate-900/95 backdrop-blur-sm shrink-0">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Key className="h-4 w-4 text-cyan-400" />
                <span>Configure {editingProvider.toUpperCase()} Credentials</span>
              </h3>
              <button
                onClick={() => setEditingProvider(null)}
                className="text-slate-400 hover:text-white text-xs cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveConfig} className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  API Key / Secret Token
                </label>
                <input
                  type="password"
                  value={configForm.api_key || ''}
                  onChange={(e) => setConfigForm({ ...configForm, api_key: e.target.value })}
                  placeholder="Enter API Key (leave empty to keep existing)"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Phone Number ID / Caller ID
                </label>
                <input
                  type="text"
                  value={configForm.phone_number_id || configForm.caller_id || ''}
                  onChange={(e) =>
                    setConfigForm({
                      ...configForm,
                      phone_number_id: e.target.value,
                      caller_id: e.target.value,
                    })
                  }
                  placeholder="e.g. 55a48c4e-... or +14787584319"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  API Endpoint / Base URL (Optional)
                </label>
                <input
                  type="text"
                  value={configForm.base_url || ''}
                  onChange={(e) => setConfigForm({ ...configForm, base_url: e.target.value })}
                  placeholder="e.g. https://fallback-voice.sharyx.ai"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  External Webhook Forwarder URL (Optional)
                </label>
                <input
                  type="text"
                  value={configForm.webhook_forward_url || ''}
                  onChange={(e) => setConfigForm({ ...configForm, webhook_forward_url: e.target.value })}
                  placeholder="https://hooks.zapier.com/hooks/catch/..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Call transcripts and recordings will be automatically forwarded to this URL.
                </p>
              </div>

              <div className="pt-2">
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800/80 text-[11px]">
                  <span className="text-slate-300 font-medium">Provider Status:</span>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={configForm.is_active ?? true}
                      onChange={(e) => setConfigForm({ ...configForm, is_active: e.target.checked })}
                      className="rounded accent-cyan-500"
                    />
                    <span className="text-slate-200">Active Gateway</span>
                  </label>
                </div>
              </div>
            </form>

            <div className="flex items-center justify-end gap-2.5 px-5 sm:px-6 py-3.5 border-t border-slate-800 bg-slate-900/95 backdrop-blur-sm shrink-0">
              <button
                type="button"
                onClick={() => setEditingProvider(null)}
                className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-semibold cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveConfig}
                className="px-5 py-2 rounded-xl font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs cursor-pointer shadow-lg shadow-cyan-500/20 transition-all"
              >
                Save Configuration
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CREATE VOICE AGENT MODAL ────────────────────────────────────── */}
      {agentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-xl max-h-[88vh] flex flex-col rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl my-auto overflow-hidden">
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-800 bg-slate-900/95 backdrop-blur-sm shrink-0">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Bot className="h-4 w-4 text-purple-400" />
                <span>Create New Voice Agent</span>
              </h3>
              <button
                onClick={() => setAgentModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAgent} id="create-agent-form" className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Agent Name *</label>
                  <input
                    type="text"
                    value={agentForm.name}
                    onChange={(e) => setAgentForm({ ...agentForm, name: e.target.value })}
                    placeholder="e.g. Maya - Real Estate"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-purple-500"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Voice Provider *</label>
                  <select
                    value={agentForm.provider}
                    onChange={(e) => setAgentForm({ ...agentForm, provider: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="vapi">Vapi.ai (Native Voice)</option>
                    <option value="retell">Retell AI</option>
                    <option value="bland">Bland AI</option>
                    <option value="saas_fallback">Sharyx SaaS Telephony</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  First Greeting Message *
                </label>
                <input
                  type="text"
                  value={agentForm.first_message}
                  onChange={(e) => setAgentForm({ ...agentForm, first_message: e.target.value })}
                  placeholder="Hello! Thank you for connecting with us today. How may I assist you?"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  System Prompt & Persona Instructions *
                </label>
                <textarea
                  value={agentForm.system_prompt}
                  onChange={(e) => setAgentForm({ ...agentForm, system_prompt: e.target.value })}
                  rows={3}
                  placeholder="You are an expert sales representative for Sharyx. Qualify the client's needs and book a live demo..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 font-sans"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Voice ID</label>
                  <input
                    type="text"
                    value={agentForm.voice_id}
                    onChange={(e) => setAgentForm({ ...agentForm, voice_id: e.target.value })}
                    placeholder="21m00Tcm4TlvDq8ikWAM"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 font-mono text-[11px]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">LLM Model</label>
                  <select
                    value={agentForm.llm_model}
                    onChange={(e) => setAgentForm({ ...agentForm, llm_model: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="gpt-4o-mini">GPT-4o Mini (Fastest)</option>
                    <option value="gpt-4o">GPT-4o (High Intelligence)</option>
                    <option value="claude-3-5-sonnet">Claude 3.5 Sonnet</option>
                  </select>
                </div>
              </div>

              {/* ── AGENT-TO-AGENT WARM TRANSFER / ESCALATION ── */}
              <div className="p-3.5 rounded-2xl bg-indigo-950/25 border border-indigo-900/50 space-y-2.5">
                <div className="flex items-center gap-2 text-indigo-300 font-bold">
                  <Share2 className="h-4 w-4 text-indigo-400" />
                  <span>Agent-to-Agent Warm Transfer (Optional)</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  When caller requests escalation or a specialist, the AI automatically transfers the live call.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">
                      Transfer to AI Assistant
                    </label>
                    <select
                      value={agentForm.transfer_agent_id || ''}
                      onChange={(e) => setAgentForm({ ...agentForm, transfer_agent_id: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="">-- None (No Agent Transfer) --</option>
                      {agents.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name} ({a.provider.toUpperCase()})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">
                      Or Transfer to Human / Phone
                    </label>
                    <input
                      type="text"
                      value={agentForm.transfer_phone_number || ''}
                      onChange={(e) => setAgentForm({ ...agentForm, transfer_phone_number: e.target.value })}
                      placeholder="e.g. +19205042591"
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono text-[11px]"
                    />
                  </div>
                </div>
              </div>
            </form>

            <div className="flex items-center justify-end gap-2.5 px-5 sm:px-6 py-3.5 border-t border-slate-800 bg-slate-900/95 backdrop-blur-sm shrink-0">
              <button
                type="button"
                onClick={() => setAgentModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-semibold cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="create-agent-form"
                className="px-5 py-2 rounded-xl font-bold bg-purple-600 hover:bg-purple-500 text-white text-xs cursor-pointer shadow-lg shadow-purple-600/25 transition-all"
              >
                Create & Sync Agent
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
