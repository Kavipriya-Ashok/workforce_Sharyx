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
  ToggleLeft,
  ToggleRight,
  Power,
  ShieldCheck,
  AlertCircle,
  Search,
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
  CatalogAgentDto,
} from '@/service/voiceService';

export const VoiceAutomation: React.FC<{ initialTab?: 'providers' | 'agents' | 'catalog' | 'dispatch' | 'logs' }> = ({
  initialTab = 'dispatch',
}) => {
  const [activeTab, setActiveTab] = useState<'providers' | 'agents' | 'catalog' | 'dispatch' | 'logs'>(
    initialTab === 'catalog' ? 'agents' : initialTab
  );
  const [voiceSubTab, setVoiceSubTab] = useState<'all' | 'live' | 'templates'>(
    initialTab === 'catalog' ? 'templates' : 'all'
  );
  const [loading, setLoading] = useState(false);

  // Sync activeTab when initialTab prop updates
  useEffect(() => {
    if (initialTab) {
      if (initialTab === 'catalog') {
        setActiveTab('agents');
        setVoiceSubTab('templates');
      } else {
        setActiveTab(initialTab);
      }
    }
  }, [initialTab]);

  // Call Logs filtering states
  const [logSearchQuery, setLogSearchQuery] = useState('');
  const [logStatusFilter, setLogStatusFilter] = useState<'all' | 'completed' | 'failed' | 'initiated'>('all');
  const [logProviderFilter, setLogProviderFilter] = useState<'all' | 'vapi' | 'saas_fallback'>('all');

  // 5 Default Agents Catalog state
  const [catalogProvider, setCatalogProvider] = useState<VoiceProviderType>('vapi');
  const [catalogItems, setCatalogItems] = useState<CatalogAgentDto[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [togglingKey, setTogglingKey] = useState<string | null>(null);
  const [enablingAll, setEnablingAll] = useState(false);

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
  const [dispatchPhone, setDispatchPhone] = useState('');
  const [dispatchName, setDispatchName] = useState('');
  const [jsonExpanded, setJsonExpanded] = useState(false);
  const [dispatchVariables, setDispatchVariables] = useState('{}');
  const [dispatching, setDispatching] = useState(false);
  const [lastDispatchedCall, setLastDispatchedCall] = useState<any>(null);

  // Expanded log row
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // 1-Click Deploy 5 Agents state
  const [deployingTeam, setDeployingTeam] = useState(false);
  const [deployResultModalOpen, setDeployResultModalOpen] = useState(false);
  const [deployResultData, setDeployResultData] = useState<any>(null);

  // Sync call logs from SaaS state
  const [syncingLogs, setSyncingLogs] = useState(false);

  // Quick preset templates for one-click testing
  const VAPI_PRESETS = [
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

  const SAAS_PRESETS = [
    {
      label: '👋 AI Receptionist',
      agentName: 'AI Receptionist',
      data: {
        customer_name: 'Kavipriya',
        reason: 'General inquiry and greeting',
      },
    },
    {
      label: '💼 AI Sales Agent',
      agentName: 'AI Sales Agent',
      data: {
        customer_name: 'Kavipriya',
        product: 'Enterprise Suite',
        budget: 'Custom Pricing',
      },
    },
    {
      label: '📅 AI Appointment Manager',
      agentName: 'AI Appointment Manager',
      data: {
        customer_name: 'Kavipriya',
        slot: 'Tomorrow at 3:00 PM',
        meeting_type: 'Product Demo',
      },
    },
    {
      label: '🎧 AI Support Agent',
      agentName: 'AI Support Agent',
      data: {
        customer_name: 'Kavipriya',
        issue: 'Account Setup Guidance',
        priority: 'High',
      },
    },
  ];

  const ALL_PRESETS = [...VAPI_PRESETS, ...SAAS_PRESETS];

  // Load initial data
  const loadAllData = async () => {
    setLoading(true);
    try {
      const [cfgs, ags, lgs, sts, cat] = await Promise.all([
        VoiceService.getConfigs(),
        VoiceService.listAgents(),
        VoiceService.getCallLogs('default', 50),
        VoiceService.getCallStats(),
        VoiceService.getCatalog(catalogProvider),
      ]);
      setConfigs(cfgs);
      setAgents(ags);
      setLogs(lgs);
      setStats(sts);
      setCatalogItems(cat);

      if (ags.length > 0) {
        if (!dispatchAgentId || !ags.some((a) => a.id === dispatchAgentId)) {
          // Default to the first agent in the active list
          setDispatchAgentId(ags[0].id);
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

  const loadCatalog = async (provider: VoiceProviderType = catalogProvider) => {
    setCatalogLoading(true);
    try {
      const data = await VoiceService.getCatalog(provider);
      setCatalogItems(data);
    } catch {
      toast.error('Failed to load default agents catalog');
    } finally {
      setCatalogLoading(false);
    }
  };

  const handleSelectCatalogProvider = (provider: VoiceProviderType) => {
    setCatalogProvider(provider);
    loadCatalog(provider);
  };

  const handleToggleCatalogAgent = async (item: CatalogAgentDto) => {
    setTogglingKey(item.key);
    try {
      if (item.is_enabled) {
        await VoiceService.disableCatalogAgent(item.key, catalogProvider);
        toast.info(`${item.name} disabled (hidden from Call dropdown)`);
      } else {
        await VoiceService.enableCatalogAgent(item.key, catalogProvider);
        toast.success(`✓ ${item.name} enabled on ${catalogProvider === 'vapi' ? 'Vapi' : 'Sharyx SaaS'}!`);
      }
      const [cat, ags] = await Promise.all([
        VoiceService.getCatalog(catalogProvider),
        VoiceService.listAgents(),
      ]);
      setCatalogItems(cat);
      setAgents(ags);
      if (ags.length > 0 && (!dispatchAgentId || !ags.some((a) => a.id === dispatchAgentId))) {
        setDispatchAgentId(ags[0].id);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Failed to toggle agent');
    } finally {
      setTogglingKey(null);
    }
  };

  const handleEnableAllCatalog = async () => {
    setEnablingAll(true);
    try {
      await VoiceService.enableAllCatalogAgents(catalogProvider);
      toast.success(`All 5 agents enabled on ${catalogProvider === 'vapi' ? 'Vapi' : 'Sharyx SaaS'}!`);
      const [cat, ags] = await Promise.all([
        VoiceService.getCatalog(catalogProvider),
        VoiceService.listAgents(),
      ]);
      setCatalogItems(cat);
      setAgents(ags);
      if (ags.length > 0) setDispatchAgentId(ags[0].id);
    } catch (err: any) {
      toast.error(err.message || 'Failed to enable all agents');
    } finally {
      setEnablingAll(false);
    }
  };

  const handleDisableAllCatalog = async () => {
    setEnablingAll(true);
    try {
      await VoiceService.disableAllCatalogAgents(catalogProvider);
      toast.info(`All default agents disabled on ${catalogProvider === 'vapi' ? 'Vapi' : 'Sharyx SaaS'}`);
      const [cat, ags] = await Promise.all([
        VoiceService.getCatalog(catalogProvider),
        VoiceService.listAgents(),
      ]);
      setCatalogItems(cat);
      setAgents(ags);
    } catch (err: any) {
      toast.error(err.message || 'Failed to disable all agents');
    } finally {
      setEnablingAll(false);
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

  const handleDeploy5Agents = async () => {
    setDeployingTeam(true);
    try {
      const res = await VoiceService.deployWorkforceTeam();
      setDeployResultData(res);
      setDeployResultModalOpen(true);
      toast.success(`🎉 Deployed ${res.deployedCount || 5} agents to ${res.providerLabel || 'Voice Engine'}!`);
      await loadAllData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Failed to deploy 5-agent workforce team');
    } finally {
      setDeployingTeam(false);
    }
  };

  const handleSyncCallsFromSaas = async () => {
    setSyncingLogs(true);
    try {
      const res = await VoiceService.syncCallLogsFromSaas();
      toast.success(`✅ ${res.message || `Synced ${res.synced} call logs from Sharyx SaaS!`}`);
      await loadAllData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Could not sync call logs from SaaS');
    } finally {
      setSyncingLogs(false);
    }
  };

  const handleSyncCallsFromVapi = async () => {
    setSyncingLogs(true);
    try {
      const res = await VoiceService.syncCallLogsFromVapi();
      toast.success(`✅ ${res.message || `Synced ${res.synced} call logs from Vapi!`}`);
      await loadAllData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Could not sync call logs from Vapi');
    } finally {
      setSyncingLogs(false);
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
      api_key: '',                                    // Always blank — only updated if user types new key
      phone_number_id: existing.phone_number_id || '', // Vapi: phone UUID
      caller_id: existing.caller_id || '',             // SaaS/Retell: outbound phone number
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
  const handleApplyPreset = (preset: (typeof ALL_PRESETS)[0]) => {
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
  const matchingPresets = selectedAgent
    ? ALL_PRESETS.filter(
      (p) =>
        selectedAgent.name.toLowerCase().includes(p.agentName.toLowerCase()) ||
        p.agentName.toLowerCase().includes(selectedAgent.name.toLowerCase())
    )
    : [];

  return (
    <div className="space-y-4 sm:space-y-5 pb-8 font-sans selection:bg-cyan-600 selection:text-white">
      {/* ── HERO BANNER: NEXT-GEN TELEPHONY ENGINE ─────────────────────── */}
      <div className="relative rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-cyan-50/30 to-indigo-50/40 p-4 sm:p-6 shadow-xs overflow-hidden">
        {/* Ambient Glow Lights */}
        <div className="absolute top-0 right-1/4 -mt-20 w-80 h-80 bg-cyan-100/50 rounded-full blur-[90px] pointer-events-none" />
        <div className="absolute bottom-0 right-0 -mb-20 w-64 h-64 bg-indigo-100/50 rounded-full blur-[80px] pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-2xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-purple-600 p-[1px] shadow-sm shadow-cyan-500/20 shrink-0">
              <div className="h-full w-full rounded-2xl bg-white flex items-center justify-center">
                <PhoneCall className="h-4 w-4 sm:h-5 sm:w-5 text-cyan-600" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl lg:text-2xl font-black text-slate-900 tracking-tight">
                  Voice AI Telephony Studio
                </h1>
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold tracking-wider uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                  Live Gateway
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                Multi-provider voice telephony powered by Vapi.ai, Retell AI, & Twilio carrier SIP trunks
              </p>
            </div>
          </div>

          {/* Quick Actions & Live Carrier Status */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl sm:rounded-2xl bg-white border border-slate-200 text-[11px] sm:text-xs text-slate-700 shadow-xs">
              <Signal className="h-3.5 w-3.5 text-emerald-600" />
              <span className="text-slate-400">Carrier:</span>
              <span className="font-semibold text-slate-900">Twilio SIP Trunk</span>
            </div>

            <button
              onClick={loadAllData}
              disabled={loading}
              className="px-3 py-1.5 rounded-xl sm:rounded-2xl text-[11px] sm:text-xs font-semibold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
            >
              <RefreshCw className={`h-3 w-3 sm:h-3.5 sm:w-3.5 text-cyan-600 ${loading ? 'animate-spin' : ''}`} />
              <span>Sync</span>
            </button>

            <button
              onClick={() => setActiveTab('dispatch')}
              className="px-3.5 py-1.5 rounded-xl sm:rounded-2xl text-[11px] sm:text-xs font-bold bg-gradient-to-r from-cyan-600 via-teal-600 to-emerald-600 hover:brightness-105 text-white shadow-sm shadow-cyan-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Phone className="h-3 w-3 sm:h-3.5 sm:w-3.5 fill-current" />
              <span>Make Live Call</span>
            </button>
          </div>
        </div>

        {/* ── KPI METRICS CARDS ─────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3.5 mt-4 sm:mt-5">
          <div className="relative group p-3 sm:p-4 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between text-slate-500 text-[11px]">
              <span className="font-medium">Total Sessions</span>
              <Layers className="h-3.5 w-3.5 text-cyan-600" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1 tracking-tight">{stats.totalCalls}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Outbound calls</div>
          </div>

          <div className="relative group p-3 sm:p-4 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between text-slate-500 text-[11px]">
              <span className="font-medium">Completed</span>
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-emerald-700 mt-1 tracking-tight">{stats.completedCalls}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">AI concluded</div>
          </div>

          <div className="relative group p-3 sm:p-4 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between text-slate-500 text-[11px]">
              <span className="font-medium">Avg Duration</span>
              <Clock className="h-3.5 w-3.5 text-indigo-600" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1 tracking-tight">
              {Math.floor(stats.avgDurationSeconds / 60)}m {stats.avgDurationSeconds % 60}s
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Per conversation</div>
          </div>

          <div className="relative group p-3 sm:p-4 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between text-slate-500 text-[11px]">
              <span className="font-medium">Active Agents</span>
              <Bot className="h-3.5 w-3.5 text-purple-600" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-purple-700 mt-1 tracking-tight">{agents.length}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Vapi & Retell AI</div>
          </div>
        </div>
      </div>

      {/* ── NAVIGATION TABS ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveTab('dispatch')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'dispatch'
            ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white shadow-sm shadow-cyan-600/20'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
        >
          <PhoneCall className="h-3.5 w-3.5" />
          <span>Dispatch & Test Call</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('agents');
            loadCatalog(catalogProvider);
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'agents' || activeTab === 'catalog'
            ? 'bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 text-white shadow-sm shadow-purple-600/20'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
        >
          <Bot className="h-3.5 w-3.5" />
          <span>AI Voice Agents & Personas ({agents.length})</span>
          <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full font-mono">
            {catalogItems.filter((i) => i.is_enabled).length}/5 Personas
          </span>
        </button>

        <button
          onClick={() => setActiveTab('providers')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-semibold transition-all cursor-pointer ${activeTab === 'providers'
            ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
        >
          <Key className="h-3.5 w-3.5" />
          <span>Dynamic Providers (Vapi / Retell)</span>
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-semibold transition-all cursor-pointer ${activeTab === 'logs'
            ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
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
          <div className="lg:col-span-7 rounded-3xl border border-slate-200 bg-white p-6 lg:p-7 space-y-6 shadow-xs">
            <div>
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <PhoneCall className="h-4 w-4 text-cyan-600" />
                  <span>Outbound Voice Dispatcher</span>
                </h2>
                <span className="text-[11px] font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 font-semibold">
                  Carrier Ready
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Trigger real telephone calls with live prompt variables, ElevenLabs voice, and instant webhooks.
              </p>
            </div>

            {/* Quick 1-Click Templates (Only displayed when selected agent matches a template) */}
            {matchingPresets.length > 0 && (
              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-slate-600 flex items-center gap-1.5 uppercase tracking-wider">
                  <Sparkle className="h-3 w-3 text-cyan-600" />
                  <span>Quick Test Presets for {selectedAgent?.name}:</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {matchingPresets.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleApplyPreset(preset)}
                      className="px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200 transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <span>{preset.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleDispatchCall} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Select AI Voice Assistant *
                </label>
                <select
                  value={dispatchAgentId}
                  onChange={(e) => setDispatchAgentId(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-cyan-500 font-medium"
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
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Customer Phone Number *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={dispatchPhone}
                      onChange={(e) => setDispatchPhone(e.target.value)}
                      placeholder="+91 80157 79116"
                      className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-cyan-500 font-mono tracking-wide"
                      required
                    />
                    <Phone className="absolute right-3.5 top-3.5 h-4 w-4 text-slate-400" />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Must include country code (e.g. +91)</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Customer Name</label>
                  <input
                    type="text"
                    value={dispatchName}
                    onChange={(e) => setDispatchName(e.target.value)}
                    placeholder="e.g. Kavipriya"
                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-cyan-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Injected into greeting message</p>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Dynamic Prompt Variables (JSON Payload)
                  </label>
                  <button
                    type="button"
                    onClick={() => setJsonExpanded(!jsonExpanded)}
                    className="text-[11px] text-cyan-600 hover:text-cyan-800 font-mono flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <span>{jsonExpanded ? 'Collapse ▲' : 'Expand ▼'}</span>
                  </button>
                </div>
                <textarea
                  value={dispatchVariables}
                  onChange={(e) => setDispatchVariables(e.target.value)}
                  rows={jsonExpanded ? 7 : 3}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-indigo-700 font-mono placeholder-slate-400 focus:outline-none focus:bg-white focus:border-cyan-500 leading-relaxed"
                />
              </div>

              <button
                type="submit"
                disabled={dispatching}
                className="w-full py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider bg-gradient-to-r from-cyan-600 via-teal-600 to-emerald-600 hover:brightness-105 text-white shadow-md shadow-cyan-600/20 flex items-center justify-center gap-2.5 transition-all cursor-pointer disabled:opacity-50"
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
              <div className="rounded-3xl border border-slate-200 bg-white p-5 space-y-4 shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-700 font-bold">
                      <Bot className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-900">{selectedAgent.name}</h3>
                      <p className="text-[10px] text-slate-500 uppercase font-mono">
                        {selectedAgent.provider} • {selectedAgent.llm_model}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-800 border border-cyan-200 font-semibold">
                    ElevenLabs
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="text-[11px] text-slate-600 font-semibold">Greeting Message:</div>
                  <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200 italic leading-relaxed">
                    "{selectedAgent.first_message}"
                  </p>
                </div>

                {/* Simulated Audio Waveform Visualizer */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <Headphones className="h-4 w-4 text-cyan-600" />
                    <span>Turn-Taking Engine:</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="h-4 w-1 bg-indigo-500 rounded-full animate-pulse" />
                    <span className="h-6 w-1 bg-indigo-500 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                    <span className="h-3 w-1 bg-indigo-500 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
                    <span className="h-7 w-1 bg-indigo-500 rounded-full animate-pulse" style={{ animationDelay: '75ms' }} />
                    <span className="h-5 w-1 bg-indigo-500 rounded-full animate-pulse" style={{ animationDelay: '220ms' }} />
                  </div>
                </div>
              </div>
            )}

            {/* Last Dispatch Result Banner */}
            {lastDispatchedCall && (
              <div className="rounded-3xl border border-cyan-200 bg-white p-5 space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-cyan-700 font-bold text-xs">
                    <PhoneCall className="h-4 w-4" />
                    <span>SaaS / Plivo Telephony Status</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-50 text-cyan-800 border border-cyan-200 font-semibold">
                    Live Dispatch
                  </span>
                </div>
                <div className="text-xs text-slate-700 space-y-1.5 font-mono text-[11px] bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div className="flex justify-between">
                    <span className="text-slate-500">
                      {lastDispatchedCall.provider === 'vapi' ? 'Vapi Call ID:' : 'Plivo Call UUID:'}
                    </span>
                    <span className="text-slate-900 font-semibold truncate max-w-[200px]" title={lastDispatchedCall?.provider_call_id}>
                      {lastDispatchedCall?.provider_call_id || lastDispatchedCall?.id || '—'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Destination:</span>
                    <span className="text-cyan-700 font-bold">{lastDispatchedCall.customer_phone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Carrier Engine:</span>
                    <span className="text-fuchsia-700 uppercase font-bold">{lastDispatchedCall.provider || 'saas_fallback'}</span>
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t border-slate-200">
                    <span className="text-slate-500">Live Status:</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${lastDispatchedCall.call_status === 'completed'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : lastDispatchedCall.call_status === 'failed'
                          ? 'bg-rose-50 text-rose-800 border-rose-300'
                          : 'bg-cyan-50 text-cyan-800 border-cyan-300'
                      }`}>
                      {lastDispatchedCall.call_status}
                    </span>
                  </div>
                </div>
                {lastDispatchedCall.call_status === 'initiated' && (
                  <p className="text-[10px] text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-200 leading-relaxed">
                    ⏱️ Carrier status: <strong>Initiated</strong>. If call does not ring in 60s, Plivo Geo Permissions or international Indian telecom filtering (DND) may be holding the carrier delivery.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 2: UNIFIED AI VOICE AGENTS & WORKFORCE STUDIO ─────────── */}
      {(activeTab === 'agents' || activeTab === 'catalog') && (
        <div className="space-y-5">
          {/* Active Platform Banner */}
          <div className="p-3.5 px-4 rounded-2xl bg-white border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-2.5">
              <span className="text-xs text-slate-500 font-medium">Exclusive Active Engine:</span>
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-lg border flex items-center gap-1.5 uppercase font-mono ${configs.vapi?.is_active
                  ? 'bg-violet-50 text-violet-700 border-violet-200'
                  : configs.saas_fallback?.is_active
                    ? 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200'
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}>
                <span className={`h-2 w-2 rounded-full ${configs.vapi?.is_active || configs.saas_fallback?.is_active
                    ? 'bg-emerald-500 animate-pulse'
                    : 'bg-slate-400'
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
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 border border-slate-200"
                  title="Switch to Sharyx SaaS Telephony (Vapi agents will vanish)"
                >
                  <span>Switch to SaaS Telephony</span>
                  <span className="text-indigo-600">➔</span>
                </button>
              ) : configs.saas_fallback?.is_active ? (
                <button
                  type="button"
                  onClick={() => handleSelectActiveProvider('vapi')}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 border border-slate-200"
                  title="Switch to Vapi.ai (SaaS agents will vanish)"
                >
                  <span>Switch to Vapi.ai</span>
                  <span className="text-indigo-600">➔</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setActiveTab('providers')}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all cursor-pointer shadow-sm"
                >
                  Activate a Platform
                </button>
              )}
            </div>
          </div>

          {/* Sub-view switcher for unified AI Voice Agents & Personas section */}
          <div className="flex items-center justify-between flex-wrap gap-3 pb-2 border-b border-slate-200">
            <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 border border-slate-200">
              <button
                type="button"
                onClick={() => setVoiceSubTab('all')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  voiceSubTab === 'all'
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="h-3.5 w-3.5" />
                <span>All-in-One View</span>
              </button>
              <button
                type="button"
                onClick={() => setVoiceSubTab('live')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  voiceSubTab === 'live'
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Bot className="h-3.5 w-3.5" />
                <span>Live Assistants ({agents.length})</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setVoiceSubTab('templates');
                  loadCatalog(catalogProvider);
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  voiceSubTab === 'templates'
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sparkles className="h-3.5 w-3.5 fill-current" />
                <span>5 Workforce Personas ({catalogItems.filter((i) => i.is_enabled).length}/5)</span>
              </button>
            </div>

            <div className="text-xs text-slate-500 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Omnichannel Voice Telephony Ready</span>
            </div>
          </div>

          {(voiceSubTab === 'all' || voiceSubTab === 'live') && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Active Voice Personas ({agents.length})</h2>
                  <p className="text-xs text-slate-500">
                    Only assistants from your currently active voice engine are shown. Disconnected platforms vanish automatically.
                  </p>
                </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleDeploy5Agents}
                disabled={deployingTeam || loading}
                className="px-4 py-2 rounded-2xl text-xs font-bold bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:brightness-110 text-white flex items-center gap-1.5 shadow-md shadow-orange-500/20 transition-all cursor-pointer disabled:opacity-50"
                title="1-Click deploy 5 AI agents (Receptionist, Sales, Appointment, Support, Recruiter) to your active voice engine"
              >
                {deployingTeam ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Deploying 5 Agents...</span>
                  </>
                ) : (
                  <>
                    <Zap className="h-3.5 w-3.5 fill-current" />
                    <span>1-Click Deploy 5 Agents</span>
                  </>
                )}
              </button>

              <button
                onClick={handleSyncAll}
                disabled={loading}
                className="px-3.5 py-2 rounded-2xl text-xs font-semibold border border-indigo-200 bg-indigo-50/50 text-indigo-700 hover:bg-indigo-50 flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                title="Synchronize assistants from your selected active platform"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Sync Active</span>
              </button>

              <button
                onClick={() => setAgentModalOpen(true)}
                className="px-3.5 py-2 rounded-2xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 shadow-sm shadow-indigo-600/20 transition-all cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Create Custom</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const targetProvider = configs.vapi?.is_active ? 'vapi' : 'saas_fallback';
                  setConfigForm({
                    provider: targetProvider,
                    api_key: '',
                    phone_number_id: configs[targetProvider]?.phone_number_id || '',
                    caller_id: configs[targetProvider]?.caller_id || '',
                    base_url: configs[targetProvider]?.base_url || '',
                    webhook_forward_url: configs[targetProvider]?.webhook_forward_url || '',
                    is_active: true,
                  });
                  setEditingProvider(targetProvider);
                }}
                className="px-3.5 py-2 rounded-2xl text-xs font-bold border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
              >
                <Key className="h-3.5 w-3.5 text-blue-600" />
                <span>Configure API Key</span>
              </button>
            </div>
          </div>

          {/* ── CONFIGURED AI & TELEPHONY ENGINE STATUS BANNER ── */}
          <div className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4 text-xs shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <Key className="h-3.5 w-3.5 text-indigo-600" />
                  <span>Configured Telephony & AI Engine:</span>
                </span>
                <span className="font-mono text-[11px] px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-bold border border-indigo-200">
                  {configs.saas_fallback?.is_active
                    ? 'Sharyx Voice AI (SaaS)'
                    : configs.vapi?.is_active
                      ? 'Vapi Voice AI Platform'
                      : 'No Active Platform'}
                </span>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-slate-500">
                <span>
                  API Key: <strong className="text-emerald-600 font-mono">
                    {configs.saas_fallback?.is_active
                      ? (configs.saas_fallback.api_key ? '••••••••' + configs.saas_fallback.api_key.slice(-4) : 'Configured (Active)')
                      : configs.vapi?.is_active
                        ? (configs.vapi.api_key ? 'vapi_••••' + configs.vapi.api_key.slice(-4) : 'Configured (Active)')
                        : 'Not set'}
                  </strong>
                  <button
                    type="button"
                    onClick={() => {
                      const targetProvider = configs.vapi?.is_active ? 'vapi' : 'saas_fallback';
                      setConfigForm({
                        provider: targetProvider,
                        api_key: '',
                        phone_number_id: configs[targetProvider]?.phone_number_id || '',
                        caller_id: configs[targetProvider]?.caller_id || '',
                        base_url: configs[targetProvider]?.base_url || '',
                        webhook_forward_url: configs[targetProvider]?.webhook_forward_url || '',
                        is_active: true,
                      });
                      setEditingProvider(targetProvider);
                    }}
                    className="text-blue-600 hover:text-blue-800 font-bold ml-1.5 underline cursor-pointer"
                  >
                    (Change)
                  </button>
                </span>
                <span className="hidden md:inline text-slate-300">•</span>
                <span className="hidden md:inline">
                  Caller ID: <strong className="text-slate-900 font-mono">{configs.saas_fallback?.caller_id || configs.vapi?.caller_id || '+918035454141'}</strong>
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-3 text-[11px]">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200">
                <Mic className="h-3.5 w-3.5 text-teal-600 shrink-0" />
                <div>
                  <span className="text-slate-500 block text-[9px] uppercase tracking-wider font-semibold">STT Hearing</span>
                  <span className="text-slate-800 font-medium">
                    {configs.saas_fallback?.is_active ? 'Soniox Realtime v4 (stt-rt-v4)' : 'Deepgram Nova-2'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200">
                <Sparkles className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                <div>
                  <span className="text-slate-500 block text-[9px] uppercase tracking-wider font-semibold">LLM Brain</span>
                  <span className="text-slate-800 font-medium">OpenAI gpt-4o-mini (&lt;300ms)</span>
                </div>
              </div>

              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200">
                <Volume2 className="h-3.5 w-3.5 text-fuchsia-600 shrink-0" />
                <div>
                  <span className="text-slate-500 block text-[9px] uppercase tracking-wider font-semibold">TTS Voice Persona</span>
                  <span className="text-slate-800 font-medium">
                    {configs.saas_fallback?.is_active ? 'ElevenLabs Priya (Flash v2)' : 'ElevenLabs Rachel (11labs)'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {agents.map((ag) => (
              <div
                key={ag.id}
                className="rounded-3xl border border-slate-200 bg-white p-5 space-y-4 hover:border-indigo-300 hover:shadow-md transition-all flex flex-col justify-between group shadow-sm"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                      {ag.provider.toUpperCase()}
                    </span>
                    <span className="text-[11px] text-slate-500 flex items-center gap-1 font-mono">
                      <Mic className="h-3 w-3 text-indigo-600" />
                      <span>{ag.voice_provider}</span>
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                    {ag.name}
                  </h3>
                  <p className="text-xs text-slate-600 line-clamp-3 italic leading-relaxed">
                    "{ag.first_message}"
                  </p>
                </div>

                <div className="space-y-2 pt-3 border-t border-slate-100 text-[11px] text-slate-500">
                  <div className="flex justify-between">
                    <span>LLM Engine:</span>
                    <span className="text-slate-800 font-mono font-medium">{ag.llm_model}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Remote UUID:</span>
                    <span className="text-slate-800 font-mono truncate max-w-[140px] font-medium">{ag.remote_agent_id}</span>
                  </div>

                  {(ag.transfer_agent_id || ag.transfer_phone_number) && (
                    <div className="flex items-center justify-between text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-xl border border-indigo-200 text-[10px]">
                      <span className="flex items-center gap-1 font-semibold">
                        <Share2 className="h-3 w-3 text-indigo-600" />
                        <span>Warm Transfer:</span>
                      </span>
                      <span className="font-mono truncate max-w-[130px] font-semibold">
                        {agents.find((x) => x.id === ag.transfer_agent_id)?.name || ag.transfer_phone_number}
                      </span>
                    </div>
                  )}

                  <button
                    onClick={() => {
                      setDispatchAgentId(ag.id);
                      setActiveTab('dispatch');
                    }}
                    className="w-full mt-2 py-2.5 rounded-2xl text-xs font-bold bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white border border-indigo-200 hover:border-indigo-600 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
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

      {/* ── 5 AUTONOMOUS WORKFORCE PERSONAS CATALOG ─────────── */}
      {(voiceSubTab === 'all' || voiceSubTab === 'templates') && (
        <div className={`space-y-5 ${voiceSubTab === 'all' ? 'pt-6 border-t border-slate-200' : ''}`}>
          {/* PROVIDER PICKER BAR */}
          <div className="rounded-3xl border border-slate-800 bg-gradient-to-r from-slate-950 via-[#0d1424] to-slate-950 p-4 sm:p-5 shadow-2xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-400" />
                  <h2 className="text-sm sm:text-base font-black text-white tracking-tight">
                    5 Autonomous Workforce Personas
                  </h2>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 uppercase">
                    Provider Catalog
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Select a provider tab below to view and toggle its 5 default agents. Enabling an agent creates or links it on that vendor platform and makes it available in the Dispatch Call dropdown.
                </p>
              </div>

              {/* Quick Actions */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleEnableAllCatalog}
                  disabled={enablingAll || catalogLoading}
                  className="px-3.5 py-2 rounded-2xl text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-500 hover:brightness-110 text-slate-950 flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-50"
                  title="Enable all 5 default agents on this provider at once"
                >
                  {enablingAll ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Power className="h-3.5 w-3.5 fill-current" />
                  )}
                  <span>Enable All 5</span>
                </button>

                <button
                  type="button"
                  onClick={handleDisableAllCatalog}
                  disabled={enablingAll || catalogLoading}
                  className="px-3.5 py-2 rounded-2xl text-xs font-semibold border border-slate-700 bg-slate-900/80 hover:bg-slate-800 text-slate-300 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  title="Disable all default agents on this provider (soft disable — hides from dropdown)"
                >
                  <span>Disable All</span>
                </button>

                <button
                  type="button"
                  onClick={() => loadCatalog(catalogProvider)}
                  disabled={catalogLoading}
                  className="p-2 rounded-2xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300 transition-all cursor-pointer disabled:opacity-50"
                  title="Refresh status from server"
                >
                  <RefreshCw className={`h-3.5 w-3.5 text-cyan-400 ${catalogLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Provider Tabs Switcher (Vapi vs Sharyx SaaS) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleSelectCatalogProvider('vapi')}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                  catalogProvider === 'vapi'
                    ? 'bg-gradient-to-r from-violet-950/60 to-purple-950/40 border-violet-500 shadow-lg shadow-violet-500/20 ring-1 ring-violet-500/50'
                    : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`h-10 w-10 rounded-2xl flex items-center justify-center font-black text-sm ${
                      catalogProvider === 'vapi'
                        ? 'bg-violet-500 text-white shadow-md shadow-violet-500/30'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    V
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                      <span>Vapi.ai Engine</span>
                      {configs.vapi?.is_active && (
                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold uppercase border border-emerald-500/30">
                          Active Engine
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Low-latency WebRTC & Twilio Carrier SIP
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-mono font-bold text-violet-300">
                    {catalogProvider === 'vapi'
                      ? `${catalogItems.filter((i) => i.is_enabled).length}/5 Enabled`
                      : 'View Personas'}
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleSelectCatalogProvider('saas_fallback')}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                  catalogProvider === 'saas_fallback'
                    ? 'bg-gradient-to-r from-cyan-950/60 to-blue-950/40 border-cyan-500 shadow-lg shadow-cyan-500/20 ring-1 ring-cyan-500/50'
                    : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`h-10 w-10 rounded-2xl flex items-center justify-center font-black text-sm ${
                      catalogProvider === 'saas_fallback'
                        ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    S
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                      <span>Sharyx Voice AI (SaaS)</span>
                      {configs.saas_fallback?.is_active && (
                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold uppercase border border-emerald-500/30">
                          Active Engine
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Autonomous PBX • Soniox STT • Flash TTS
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-mono font-bold text-cyan-300">
                    {catalogProvider === 'saas_fallback'
                      ? `${catalogItems.filter((i) => i.is_enabled).length}/5 Enabled`
                      : 'View Personas'}
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* 5 AGENT CARDS GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {catalogItems.map((item) => {
              const isToggling = togglingKey === item.key;
              const isEnabled = item.is_enabled;

              // Persona role style metadata
              const roleMeta =
                item.key === 'receptionist'
                  ? { badge: 'from-violet-500/20 to-purple-500/20 text-violet-300 border-violet-500/40', dot: 'bg-violet-400' }
                  : item.key === 'sales'
                  ? { badge: 'from-emerald-500/20 to-teal-500/20 text-emerald-300 border-emerald-500/40', dot: 'bg-emerald-400' }
                  : item.key === 'appointment'
                  ? { badge: 'from-sky-500/20 to-cyan-500/20 text-sky-300 border-sky-500/40', dot: 'bg-sky-400' }
                  : item.key === 'support'
                  ? { badge: 'from-amber-500/20 to-orange-500/20 text-amber-300 border-amber-500/40', dot: 'bg-amber-400' }
                  : { badge: 'from-rose-500/20 to-pink-500/20 text-rose-300 border-rose-500/40', dot: 'bg-rose-400' };

              return (
                <div
                  key={item.key}
                  className={`relative rounded-3xl border transition-all p-5 flex flex-col justify-between shadow-xl ${
                    isEnabled
                      ? 'bg-slate-950/90 border-slate-700/80 shadow-slate-950/50 ring-1 ring-cyan-500/20'
                      : 'bg-slate-950/50 border-slate-800/80 opacity-80 hover:opacity-100'
                  }`}
                >
                  <div className="space-y-3.5">
                    {/* Header: Persona Role badge & Interactive Enable Switch */}
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-full border bg-gradient-to-r flex items-center gap-1.5 uppercase tracking-wide ${roleMeta.badge}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${roleMeta.dot}`} />
                        {item.role}
                      </span>

                      {/* Interactive Toggle Switch */}
                      <button
                        type="button"
                        onClick={() => handleToggleCatalogAgent(item)}
                        disabled={isToggling}
                        className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 ${
                          isEnabled ? 'bg-gradient-to-r from-emerald-500 to-teal-500' : 'bg-slate-800'
                        }`}
                        title={isEnabled ? 'Click to disable (hide from call dropdown)' : 'Click to enable (create/sync and show in dropdown)'}
                      >
                        <span className="sr-only">Toggle agent</span>
                        <span
                          className={`pointer-events-none inline-flex h-6 w-6 transform items-center justify-center rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                            isEnabled ? 'translate-x-7' : 'translate-x-0'
                          }`}
                        >
                          {isToggling ? (
                            <RefreshCw className="h-3 w-3 animate-spin text-slate-800" />
                          ) : isEnabled ? (
                            <Check className="h-3.5 w-3.5 text-emerald-600 stroke-[3]" />
                          ) : (
                            <span className="h-2 w-2 rounded-full bg-slate-400" />
                          )}
                        </span>
                      </button>
                    </div>

                    {/* Agent Name & Status Badge */}
                    <div className="flex items-baseline justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-bold text-white">{item.name}</h3>
                        <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
                          Template: <span className="text-slate-300 font-semibold">{item.key}</span>
                        </p>
                      </div>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase ${
                          isEnabled
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : 'bg-slate-800 text-slate-500 border border-slate-700'
                        }`}
                      >
                        {isEnabled ? '● Enabled' : '○ Disabled'}
                      </span>
                    </div>

                    {/* Greeting Preview */}
                    <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800/80 text-[11px] text-slate-300 italic relative">
                      <Volume2 className="h-3.5 w-3.5 text-cyan-400 absolute top-2.5 right-2.5 opacity-60" />
                      <p className="line-clamp-3 pr-4">"{item.first_message}"</p>
                    </div>

                    {/* Technical Specs */}
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 pt-1">
                      <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                        <span className="block text-[9px] uppercase tracking-wider text-slate-500 font-semibold">Voice ID</span>
                        <span className="text-white font-mono truncate block">{item.voice_id}</span>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                        <span className="block text-[9px] uppercase tracking-wider text-slate-500 font-semibold">Model</span>
                        <span className="text-white font-mono block">{item.llm_model}</span>
                      </div>
                    </div>

                    {/* Tools list */}
                    <div className="flex flex-wrap gap-1 pt-1">
                      {item.allowed_tools?.map((tool, idx) => (
                        <span
                          key={idx}
                          className="text-[9px] px-2 py-0.5 rounded-md bg-slate-900 text-slate-400 border border-slate-800 font-mono"
                        >
                          {tool}
                        </span>
                      ))}
                    </div>

                    {/* Remote Agent ID / Provider Sync Status */}
                    <div className="p-2.5 rounded-xl bg-slate-900/40 border border-slate-800/80 text-[11px]">
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span>Remote ID:</span>
                        <span className="font-mono text-cyan-300 font-bold truncate max-w-[170px]" title={item.remote_agent_id || 'Not provisioned'}>
                          {item.remote_agent_id || 'Will create on enable'}
                        </span>
                      </div>
                    </div>

                    {/* Error Banner if any */}
                    {item.last_sync_error && (
                      <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-[11px] text-rose-300 flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <span className="font-semibold block">Sync Warning:</span>
                          <span className="text-[10px]">{item.last_sync_error}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Footer Action: Select for call if enabled */}
                  {isEnabled && item.agent_id ? (
                    <button
                      type="button"
                      onClick={() => {
                        setDispatchAgentId(item.agent_id!);
                        setActiveTab('dispatch');
                      }}
                      className="w-full mt-4 py-2 rounded-2xl text-xs font-bold bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Phone className="h-3.5 w-3.5" />
                      <span>Dispatch Call with this Persona</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleToggleCatalogAgent(item)}
                      disabled={isToggling}
                      className="w-full mt-4 py-2 rounded-2xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Power className="h-3.5 w-3.5" />
                      <span>Enable this Persona</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
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
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${configs.vapi?.is_active
                    ? 'bg-violet-950/40 border-violet-500 shadow-md shadow-violet-500/20'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`h-8 w-8 rounded-xl flex items-center justify-center font-bold text-xs ${configs.vapi?.is_active ? 'bg-violet-500 text-white' : 'bg-slate-800 text-slate-400'
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
                <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${configs.vapi?.is_active ? 'border-cyan-400 bg-cyan-400/20' : 'border-slate-700'
                  }`}>
                  {configs.vapi?.is_active && <div className="h-2 w-2 rounded-full bg-cyan-400" />}
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleSelectActiveProvider('saas_fallback')}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${configs.saas_fallback?.is_active
                    ? 'bg-fuchsia-950/40 border-fuchsia-500 shadow-md shadow-fuchsia-500/20'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`h-8 w-8 rounded-xl flex items-center justify-center font-bold text-xs ${configs.saas_fallback?.is_active ? 'bg-fuchsia-500 text-white' : 'bg-slate-800 text-slate-400'
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
                <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${configs.saas_fallback?.is_active ? 'border-cyan-400 bg-cyan-400/20' : 'border-slate-700'
                  }`}>
                  {configs.saas_fallback?.is_active && <div className="h-2 w-2 rounded-full bg-cyan-400" />}
                </div>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* VAPI CARD */}
            <div className={`rounded-3xl border bg-slate-950/80 p-6 space-y-4 hover:border-slate-700 transition-all shadow-xl ${configs.vapi?.is_active ? 'border-violet-500/70 shadow-violet-500/10' : 'border-slate-800'
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
                  className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${configs.vapi?.is_active
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
                  <span className={`font-mono ${configs.vapi?.has_key ? 'text-slate-200' : 'text-amber-400'}`}>
                    {configs.vapi?.masked_key || 'Not configured'}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Phone ID:</span>
                  <span className={`font-mono truncate max-w-[180px] ${configs.vapi?.phone_number_id ? 'text-slate-200' : 'text-slate-500 italic'}`}>
                    {configs.vapi?.phone_number_id || 'Not set (auto-detected on call)'}
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
            <div className={`rounded-3xl border bg-slate-950/80 p-6 space-y-4 hover:border-slate-700 transition-all shadow-xl ${configs.saas_fallback?.is_active ? 'border-fuchsia-500/70 shadow-fuchsia-500/10' : 'border-slate-800'
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
                  className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${configs.saas_fallback?.is_active
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                >
                  {configs.saas_fallback?.is_active ? '● Active Engine' : 'Inactive'}
                </span>
              </div>

              <div className="space-y-2 text-xs text-slate-300 py-1 border-y border-slate-800">
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Private Key / Token:</span>
                  <span className={`font-mono ${configs.saas_fallback?.has_key ? 'text-slate-200' : 'text-amber-400'}`}>
                    {configs.saas_fallback?.masked_key || 'Not configured'}
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
                  <span className={configs.saas_fallback?.caller_id ? 'text-slate-200' : 'text-slate-500 italic'}>
                    {configs.saas_fallback?.caller_id || 'Auto-resolved from SaaS tenant'}
                  </span>
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
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-emerald-600" />
                  <span>Call Logs & Audio Playback ({logs.length})</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Inspect recordings, audio playback, AI transcripts, and lead qualification
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Sync from Vapi */}
                <button
                  onClick={handleSyncCallsFromVapi}
                  disabled={syncingLogs}
                  title="Pull call history directly from Vapi API and sync to local DB"
                  className="px-3 py-2 rounded-xl border border-purple-200 bg-purple-50 text-xs text-purple-700 hover:bg-purple-100 flex items-center gap-1.5 cursor-pointer font-semibold disabled:opacity-50 transition-all shadow-xs"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${syncingLogs ? 'animate-spin' : ''}`} />
                  <span>{syncingLogs ? 'Syncing...' : '⬇ Sync from Vapi'}</span>
                </button>

                {/* Pull call history from SaaS */}
                {configs.saas_fallback?.has_key && (
                  <button
                    onClick={handleSyncCallsFromSaas}
                    disabled={syncingLogs}
                    title="Pull call history from Sharyx SaaS platform and sync to local DB"
                    className="px-3 py-2 rounded-xl border border-fuchsia-200 bg-fuchsia-50 text-xs text-fuchsia-700 hover:bg-fuchsia-100 flex items-center gap-1.5 cursor-pointer font-semibold disabled:opacity-50 transition-all shadow-xs"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${syncingLogs ? 'animate-spin' : ''}`} />
                    <span>{syncingLogs ? 'Syncing...' : '⬇ Sync from SaaS'}</span>
                  </button>
                )}

                <button
                  onClick={loadAllData}
                  disabled={loading}
                  className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-700 hover:bg-slate-100 flex items-center gap-1.5 cursor-pointer font-medium disabled:opacity-50 transition-all"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-3 border-t border-slate-100">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={logSearchQuery}
                  onChange={(e) => setLogSearchQuery(e.target.value)}
                  placeholder="Search by customer phone, name, agent, or transcript..."
                  className="w-full h-9 pl-9 pr-3 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-cyan-500"
                />
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
                {(['all', 'completed', 'failed', 'initiated'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setLogStatusFilter(st)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${
                      logStatusFilter === st
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>

              {/* Provider Filter */}
              <div className="flex items-center gap-1.5">
                {(['all', 'vapi', 'saas_fallback'] as const).map((pv) => (
                  <button
                    key={pv}
                    onClick={() => setLogProviderFilter(pv)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                      logProviderFilter === pv
                        ? 'bg-purple-600 text-white'
                        : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                    }`}
                  >
                    {pv === 'saas_fallback' ? 'SAAS' : pv}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Logs List */}
          {(() => {
            const filteredLogs = logs.filter((log) => {
              if (logStatusFilter !== 'all' && log.call_status !== logStatusFilter) return false;
              if (logProviderFilter !== 'all' && log.provider !== logProviderFilter) return false;
              if (logSearchQuery.trim()) {
                const q = logSearchQuery.toLowerCase();
                const matchPhone = (log.customer_phone || '').toLowerCase().includes(q);
                const matchName = (log.customer_name || '').toLowerCase().includes(q);
                const matchAgent = (log.agent_name || '').toLowerCase().includes(q);
                const matchSummary = (log.summary || '').toLowerCase().includes(q);
                const matchTranscript = (log.transcript || '').toLowerCase().includes(q);
                if (!matchPhone && !matchName && !matchAgent && !matchSummary && !matchTranscript) return false;
              }
              return true;
            });

            if (filteredLogs.length === 0) {
              return (
                <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-slate-500 text-xs shadow-xs space-y-2">
                  <div className="text-sm font-semibold text-slate-700">No calls matching your search or filters</div>
                  <p>Try clearing filters or click "Sync from Vapi" above to pull recent calls.</p>
                </div>
              );
            }

            return (
              <div className="space-y-3">
                {filteredLogs.map((log) => {
                  const isExpanded = expandedLogId === log.id;
                  const isVapi = log.provider === 'vapi';
                  return (
                    <div
                      key={log.id}
                      className="rounded-2xl border border-slate-200 bg-white overflow-hidden transition-all hover:border-slate-300 shadow-xs"
                    >
                      <div
                        onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                        className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer select-none hover:bg-slate-50/60 transition-colors"
                      >
                        <div className="flex items-center gap-3.5">
                          <div className={`h-10 w-10 rounded-2xl flex items-center justify-center shrink-0 border ${
                            isVapi
                              ? 'bg-purple-50 border-purple-200 text-purple-600'
                              : 'bg-blue-50 border-blue-200 text-blue-600'
                          }`}>
                            <Phone className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-900">
                                {log.customer_name || 'Customer'}
                              </span>
                              <span className="text-xs font-mono font-semibold text-slate-600">
                                {log.customer_phone}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-slate-700">Agent: {log.agent_name || 'Voice Assistant'}</span>
                              <span>•</span>
                              <span className={`uppercase text-[10px] font-bold px-2 py-0.2 rounded-full border ${
                                isVapi
                                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                                  : 'bg-blue-50 text-blue-700 border-blue-200'
                              }`}>
                                {log.provider}
                              </span>
                              <span>•</span>
                              <span>{new Date(log.created_on).toLocaleString()}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 self-end md:self-auto">
                          <span
                            className={`text-[10px] font-bold px-3 py-1 rounded-full border ${
                              log.call_status === 'completed'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : log.call_status === 'failed'
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}
                          >
                            {log.call_status}
                          </span>

                          <span className="text-xs font-mono font-semibold text-slate-700 bg-slate-100 px-2 py-1 rounded-lg">
                            {log.duration_seconds ? `${log.duration_seconds}s` : '0s'}
                          </span>

                          <ChevronRight
                            className={`h-4 w-4 text-slate-400 transition-transform ${
                              isExpanded ? 'rotate-90' : ''
                            }`}
                          />
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="border-t border-slate-100 bg-slate-50/70 p-5 space-y-4">
                          {/* Audio Player */}
                          {log.recording_url ? (
                            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2.5">
                              <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
                                <div className="flex items-center gap-2">
                                  <Volume2 className="h-4 w-4 text-emerald-600" />
                                  <span>Audio Call Recording Playback</span>
                                </div>
                                <a
                                  href={log.recording_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[11px] text-blue-600 hover:underline font-mono"
                                >
                                  Download Audio ↗
                                </a>
                              </div>
                              <audio controls className="w-full h-9">
                                <source src={log.recording_url} type="audio/wav" />
                                <source src={log.recording_url} type="audio/mpeg" />
                                Your browser does not support audio playback.
                              </audio>
                            </div>
                          ) : (
                            <div className="p-3 rounded-xl bg-slate-100 text-[11px] text-slate-500 italic">
                              No audio recording available for this session.
                            </div>
                          )}

                          {/* AI Summary */}
                          {log.summary && (
                            <div className="space-y-1.5">
                              <div className="text-xs font-bold text-slate-800">AI Call Summary & Outcome</div>
                              <p className="text-xs text-slate-700 bg-white border border-slate-200 p-3.5 rounded-2xl leading-relaxed shadow-xs">
                                {log.summary}
                              </p>
                            </div>
                          )}

                          {/* Interactive Chat Bubble Transcript */}
                          <div className="space-y-2">
                            <div className="text-xs font-bold text-slate-800">Full Dialogue Transcript</div>
                            <div className="max-h-72 overflow-y-auto p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2.5">
                              {log.transcript ? (
                                log.transcript.split('\n').map((line, idx) => {
                                  const trimmed = line.trim();
                                  if (!trimmed) return null;
                                  const isAi = trimmed.toLowerCase().startsWith('ai:') || trimmed.toLowerCase().startsWith('assistant:');
                                  return (
                                    <div
                                      key={idx}
                                      className={`flex flex-col text-xs max-w-[85%] ${
                                        isAi ? 'self-start' : 'self-end ml-auto'
                                      }`}
                                    >
                                      <div
                                        className={`p-3 rounded-2xl leading-relaxed ${
                                          isAi
                                            ? 'bg-purple-50 text-purple-950 border border-purple-200/80 rounded-tl-sm'
                                            : 'bg-slate-100 text-slate-900 border border-slate-200 rounded-tr-sm'
                                        }`}
                                      >
                                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">
                                          {isAi ? '🤖 AI Assistant' : '👤 Customer'}
                                        </div>
                                        {trimmed.replace(/^(ai:|assistant:|customer:|user:)\s*/i, '')}
                                      </div>
                                    </div>
                                  );
                                })
                              ) : (
                                <p className="text-xs text-slate-400 italic">No transcript recorded for this session.</p>
                              )}
                            </div>
                          </div>

                          {/* Extracted Context / Metadata */}
                          {log.extracted_slots && Object.keys(log.extracted_slots).length > 0 && (
                            <div className="space-y-1.5">
                              <div className="text-xs font-bold text-slate-800">Extracted Session Context</div>
                              <pre className="p-3.5 rounded-2xl bg-slate-900 text-[11px] font-mono text-cyan-300 overflow-x-auto shadow-xs">
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
            );
          })()}
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
              {/* Provider-specific hint banner */}
              {editingProvider === 'saas_fallback' && (
                <div className="p-3 rounded-xl bg-fuchsia-950/30 border border-fuchsia-800/40 text-[11px] text-fuchsia-300 leading-relaxed">
                  <span className="font-bold">Sharyx SaaS:</span> Enter your <span className="font-mono bg-fuchsia-900/40 px-1 rounded">shx_priv_...</span> private key from the SaaS dashboard. This is used as your authentication token to sync agents dynamically.
                </div>
              )}
              {editingProvider === 'vapi' && (
                <div className="p-3 rounded-xl bg-violet-950/30 border border-violet-800/40 text-[11px] text-violet-300 leading-relaxed">
                  <span className="font-bold">Vapi.ai:</span> Enter your <span className="font-mono bg-violet-900/40 px-1 rounded">Bearer API key</span> from <a href="https://dashboard.vapi.ai" target="_blank" rel="noreferrer" className="underline">dashboard.vapi.ai</a>. The Phone Number ID is the UUID of your Vapi phone number (optional — auto-detected if left blank).
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  {editingProvider === 'saas_fallback' ? 'Private Key (shx_priv_...)' : 'API Key / Secret Token'}
                </label>
                <input
                  type="password"
                  value={configForm.api_key || ''}
                  onChange={(e) => setConfigForm({ ...configForm, api_key: e.target.value })}
                  placeholder={editingProvider === 'saas_fallback' ? 'shx_priv_xxxxxxxxxxxx' : 'Enter API Key (leave empty to keep existing)'}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              {/* Vapi: Phone Number ID (UUID) */}
              {editingProvider === 'vapi' && (
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Phone Number ID <span className="text-slate-500 font-normal">(Vapi phone UUID)</span>
                  </label>
                  <input
                    type="text"
                    value={configForm.phone_number_id || ''}
                    onChange={(e) => setConfigForm({ ...configForm, phone_number_id: e.target.value })}
                    placeholder="e.g. 55a48c4e-f77d-4515-a53e-810677e78dac"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Leave blank to auto-detect from your Vapi phone numbers list on call dispatch.</p>
                </div>
              )}

              {/* SaaS/Retell: Caller ID (phone number) */}
              {(editingProvider === 'saas_fallback' || editingProvider === 'retell' || editingProvider === 'bland') && (
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Caller ID <span className="text-slate-500 font-normal">(outbound phone number)</span>
                  </label>
                  <input
                    type="text"
                    value={configForm.caller_id || ''}
                    onChange={(e) => setConfigForm({ ...configForm, caller_id: e.target.value })}
                    placeholder="e.g. +918035454141"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Your outbound caller number with country code. For SaaS, leave blank to auto-resolve from your tenant's assigned numbers.</p>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  API Endpoint / Base URL <span className="text-slate-500 font-normal">(Optional)</span>
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
                  External Webhook Forwarder URL <span className="text-slate-500 font-normal">(Optional)</span>
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

      {/* ── 1-CLICK DEPLOY 5 AGENTS RESULTS MODAL ── */}
      {deployResultModalOpen && deployResultData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-2xl rounded-3xl border border-slate-800 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 shadow-2xl overflow-hidden my-8">
            {/* Ambient Top Glow */}
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-400 via-emerald-400 to-cyan-400" />

            <div className="p-6 border-b border-slate-800 flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 shadow-lg shadow-emerald-500/10">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>5 AI Workforce Agents Deployed</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 uppercase">
                      Live & Synced
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Target Engine: <strong className="text-cyan-300">{deployResultData.providerLabel}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDeployResultModalOpen(false)}
                className="h-8 w-8 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              {/* Configured Telephony & API Details */}
              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                  <span className="flex items-center gap-1.5 text-cyan-400">
                    <Key className="h-3.5 w-3.5" />
                    <span>Configured Engine & API Credentials</span>
                  </span>
                  <span className="text-[10px] text-emerald-400 font-mono bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40">
                    Active & Authenticated
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800/80 flex justify-between">
                    <span className="text-slate-400">Target Voice Platform:</span>
                    <span className="font-semibold text-white">{deployResultData.configuredApi?.providerLabel}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800/80 flex justify-between">
                    <span className="text-slate-400">Configured Key:</span>
                    <span className="font-mono text-emerald-400 font-semibold">{deployResultData.configuredApi?.apiKeyMasked}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800/80 flex justify-between">
                    <span className="text-slate-400">Caller ID:</span>
                    <span className="font-mono text-cyan-300 font-bold">{deployResultData.configuredApi?.callerId}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800/80 flex justify-between">
                    <span className="text-slate-400">STT Hearing:</span>
                    <span className="font-medium text-slate-200">{deployResultData.configuredApi?.sttEngine}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800/80 flex justify-between">
                    <span className="text-slate-400">LLM Brain:</span>
                    <span className="font-medium text-slate-200">{deployResultData.configuredApi?.llmEngine}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800/80 flex justify-between">
                    <span className="text-slate-400">TTS Speaking Voice:</span>
                    <span className="font-medium text-slate-200">{deployResultData.configuredApi?.ttsEngine}</span>
                  </div>
                </div>
              </div>

              {/* Deployed 5 Agents List */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                  <span>Registered Assistants ({deployResultData.deployedCount || deployResultData.data?.length || 5})</span>
                  <span className="text-[10px] text-slate-500">Stored locally and live on remote voice carrier</span>
                </label>

                <div className="space-y-2">
                  {(deployResultData.data || []).map((ag: any) => (
                    <div
                      key={ag.id}
                      className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-3 hover:border-slate-700 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-purple-500/10 border border-purple-500/25 flex items-center justify-center text-purple-400 shrink-0">
                          <Bot className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white">{ag.name}</span>
                            <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/40">
                              ID: {ag.remote_agent_id}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                            {ag.first_message}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setDispatchAgentId(ag.id);
                          setDeployResultModalOpen(false);
                          setActiveTab('dispatch');
                        }}
                        className="px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer"
                      >
                        <Phone className="h-3 w-3 fill-current" />
                        <span>Test Call</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 px-6 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                All 5 agents are active and ready for live telephone calling.
              </span>
              <button
                type="button"
                onClick={() => setDeployResultModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-all shadow-md shadow-emerald-500/20 cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CONFIGURE PROVIDER / API KEY MODAL ── */}
      {editingProvider && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-lg rounded-3xl border border-slate-700 bg-slate-900 text-slate-100 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
                  <Key className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Configure {editingProvider === 'vapi' ? 'Vapi.ai Cloud' : 'Sharyx SaaS'} Telephony
                  </h3>
                  <p className="text-xs text-slate-400">
                    Set your Private API Key and Outbound Calling Number
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingProvider(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await VoiceService.saveConfig({
                    provider: editingProvider,
                    api_key: configForm.api_key?.trim() || undefined,
                    phone_number_id: configForm.phone_number_id?.trim() || undefined,
                    caller_id: configForm.caller_id?.trim() || undefined,
                    base_url: configForm.base_url?.trim() || undefined,
                    is_active: true,
                  });
                  await VoiceService.activateProvider(editingProvider);
                  toast.success(`✅ ${editingProvider.toUpperCase()} API Key saved and activated!`);
                  setEditingProvider(null);
                  loadAllData();
                } catch (err: any) {
                  toast.error(`Failed to save config: ${err.message}`);
                }
              }}
              className="p-6 space-y-4 text-xs"
            >
              <div>
                <label className="text-slate-300 font-bold block mb-1">
                  Active Platform
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingProvider('vapi')}
                    className={`p-2.5 rounded-xl border text-left text-xs ${
                      editingProvider === 'vapi'
                        ? 'border-blue-500 bg-blue-500/20 text-white font-bold'
                        : 'border-slate-800 bg-slate-800/50 text-slate-400'
                    }`}
                  >
                    Vapi.ai Platform
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingProvider('saas_fallback')}
                    className={`p-2.5 rounded-xl border text-left text-xs ${
                      editingProvider === 'saas_fallback'
                        ? 'border-cyan-500 bg-cyan-500/20 text-white font-bold'
                        : 'border-slate-800 bg-slate-800/50 text-slate-400'
                    }`}
                  >
                    Sharyx SaaS Telephony
                  </button>
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">
                  {editingProvider === 'vapi' ? 'Vapi Private API Key *' : 'SaaS API Key *'}
                </label>
                <input
                  type="password"
                  value={configForm.api_key || ''}
                  onChange={(e) => setConfigForm({ ...configForm, api_key: e.target.value })}
                  placeholder={
                    configs[editingProvider]?.has_key
                      ? '•••••••••••••••••••••••• (Leave blank to keep current)'
                      : 'Enter your API Key'
                  }
                  className="w-full h-10 px-3 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-xs focus:border-blue-500 focus:outline-none"
                />
              </div>

              {editingProvider === 'vapi' && (
                <div>
                  <label className="text-slate-300 font-bold block mb-1">
                    Vapi Phone Number ID (Optional)
                  </label>
                  <input
                    type="text"
                    value={configForm.phone_number_id || ''}
                    onChange={(e) => setConfigForm({ ...configForm, phone_number_id: e.target.value })}
                    placeholder="e.g. 01a180... (UUID from Vapi Phone Numbers)"
                    className="w-full h-10 px-3 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-xs focus:border-blue-500 focus:outline-none"
                  />
                </div>
              )}

              <div>
                <label className="text-slate-300 font-bold block mb-1">
                  Caller ID (Display Phone Number)
                </label>
                <input
                  type="text"
                  value={configForm.caller_id || ''}
                  onChange={(e) => setConfigForm({ ...configForm, caller_id: e.target.value })}
                  placeholder={editingProvider === 'vapi' ? '+14155552671' : '+918035454141'}
                  className="w-full h-10 px-3 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-xs focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingProvider(null)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-500/20 cursor-pointer"
                >
                  Save & Set Active
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
