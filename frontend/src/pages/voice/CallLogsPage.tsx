import React, { useState, useEffect } from 'react';
import {
  Phone,
  FileText,
  Clock,
  RefreshCw,
  Search,
  ChevronRight,
  Volume2,
  Sparkles,
  Bot,
  Zap,
  Filter,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Download,
  Activity,
  Layers,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  VoiceService,
  VoiceCallLogItem,
  VoiceStats,
  VoiceAgentDto,
} from '@/service/voiceService';

interface CallLogsPageProps {
  initialAgentId?: string;
  onNavigateAgent?: (agentId: string) => void;
}

export const CallLogsPage: React.FC<CallLogsPageProps> = ({ initialAgentId }) => {
  const [logs, setLogs] = useState<VoiceCallLogItem[]>([]);
  const [agents, setAgents] = useState<VoiceAgentDto[]>([]);
  const [stats, setStats] = useState<VoiceStats>({
    totalCalls: 0,
    completedCalls: 0,
    avgDurationSeconds: 0,
    completionRate: 0,
  });
  const [loading, setLoading] = useState(false);
  const [syncingVapi, setSyncingVapi] = useState(false);
  const [syncingSaas, setSyncingSaas] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'failed' | 'in-progress' | 'no-answer'>('all');
  const [providerFilter, setProviderFilter] = useState<'all' | 'vapi' | 'saas_fallback'>('all');
  const [selectedAgentId, setSelectedAgentId] = useState<string>(initialAgentId || 'all');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const loadData = async (skipSync: boolean = false) => {
    setLoading(true);
    try {
      const [fetchedLogs, fetchedStats, fetchedAgents] = await Promise.all([
        VoiceService.getCallLogs('default', 100, selectedAgentId !== 'all' ? selectedAgentId : undefined, skipSync),
        VoiceService.getCallStats('default'),
        VoiceService.listAgents('default'),
      ]);
      setLogs(fetchedLogs);
      setStats(fetchedStats);
      setAgents(fetchedAgents);
      if (fetchedLogs.length > 0 && !expandedLogId) {
        setExpandedLogId(fetchedLogs[0].id);
      }
    } catch {
      toast.error('Failed to load call logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(true);
    // Automatically sync latest recordings, transcripts & outcomes from Vapi in the background
    VoiceService.syncCallLogsFromVapi('default')
      .then(() => loadData(true))
      .catch(() => {});
    const interval = setInterval(() => loadData(true), 15000);
    return () => clearInterval(interval);
  }, [selectedAgentId]);

  const handleSyncVapi = async () => {
    setSyncingVapi(true);
    try {
      toast.loading('Syncing latest call recordings and transcripts from Vapi API...', { id: 'vapi-sync' });
      const res = await VoiceService.syncCallLogsFromVapi('default');
      toast.success(`Synced ${res.synced} calls from Vapi platform!`, { id: 'vapi-sync' });
      await loadData(true);
    } catch (err: any) {
      toast.error(err.message || 'Failed to sync calls from Vapi', { id: 'vapi-sync' });
    } finally {
      setSyncingVapi(false);
    }
  };

  const handleSyncSaas = async () => {
    setSyncingSaas(true);
    try {
      toast.loading('Syncing call logs from Sharyx SaaS platform...', { id: 'saas-sync' });
      const res = await VoiceService.syncCallLogsFromSaas('default');
      toast.success(`Synced ${res.synced} calls from SaaS platform!`, { id: 'saas-sync' });
      await loadData(true);
    } catch (err: any) {
      toast.error(err.message || 'Failed to sync from SaaS', { id: 'saas-sync' });
    } finally {
      setSyncingSaas(false);
    }
  };

  const filteredLogs = logs.filter((log) => {
    if (statusFilter !== 'all' && log.call_status !== statusFilter) return false;
    if (providerFilter !== 'all' && log.provider !== providerFilter) return false;
    if (selectedAgentId !== 'all') {
      const matchesAgentId = log.agent_id === selectedAgentId;
      const matchedAgent = agents.find((a) => a.id === selectedAgentId);
      const matchesAgentName = matchedAgent && log.agent_name === matchedAgent.name;
      if (!matchesAgentId && !matchesAgentName) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchPhone = (log.customer_phone || '').toLowerCase().includes(q);
      const matchName = (log.customer_name || '').toLowerCase().includes(q);
      const matchAgent = (log.agent_name || '').toLowerCase().includes(q);
      const matchSummary = (log.summary || '').toLowerCase().includes(q);
      const matchOutcome = (log.call_outcome || '').toLowerCase().includes(q);
      const matchTranscript = (log.transcript || '').toLowerCase().includes(q);
      if (!matchPhone && !matchName && !matchAgent && !matchSummary && !matchOutcome && !matchTranscript) {
        return false;
      }
    }
    return true;
  });

  const formatCallDate = (dateVal?: string | Date) => {
    if (!dateVal) return 'Just now';
    const d = new Date(dateVal);
    return isNaN(d.getTime()) ? 'Recently' : d.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              Voice Call Logs & Audio Dialogue
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-pulse" />
              Live Telephony
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time call transcripts, audio recordings, semantic outcomes, and Vapi voice telemetry.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleSyncVapi}
            disabled={syncingVapi}
            className="px-3 py-2 rounded-xl border border-purple-200 bg-purple-50 text-xs text-purple-700 hover:bg-purple-100 flex items-center gap-1.5 cursor-pointer font-semibold disabled:opacity-50 transition-all shadow-[0_1px_3px_0_rgba(15,23,42,0.06),0_1px_2px_-1px_rgba(15,23,42,0.04)]"
            title="Pull calls directly from Vapi API"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${syncingVapi ? 'animate-spin' : ''}`} />
            <span>Sync from Vapi</span>
          </button>

          <button
            onClick={handleSyncSaas}
            disabled={syncingSaas}
            className="px-3 py-2 rounded-xl border border-blue-200 bg-blue-50 text-xs text-blue-700 hover:bg-blue-100 flex items-center gap-1.5 cursor-pointer font-semibold disabled:opacity-50 transition-all shadow-[0_1px_3px_0_rgba(15,23,42,0.06),0_1px_2px_-1px_rgba(15,23,42,0.04)]"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${syncingSaas ? 'animate-spin' : ''}`} />
            <span>Sync SaaS Calls</span>
          </button>

          <button
            onClick={() => loadData(false)}
            disabled={loading}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer font-semibold disabled:opacity-50 transition-all shadow-[0_1px_3px_0_rgba(15,23,42,0.06),0_1px_2px_-1px_rgba(15,23,42,0.04)]"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_1px_3px_0_rgba(15,23,42,0.06),0_1px_2px_-1px_rgba(15,23,42,0.04)] space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Total Calls</span>
            <Phone className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats.totalCalls}</div>
          <div className="text-[11px] text-slate-400">All inbound & outbound sessions</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_1px_3px_0_rgba(15,23,42,0.06),0_1px_2px_-1px_rgba(15,23,42,0.04)] space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Completed Calls</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-600">{stats.completedCalls}</div>
          <div className="text-[11px] text-slate-400">Successfully connected & finished</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_1px_3px_0_rgba(15,23,42,0.06),0_1px_2px_-1px_rgba(15,23,42,0.04)] space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Avg Duration</span>
            <Clock className="h-4 w-4 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-purple-600">{stats.avgDurationSeconds}s</div>
          <div className="text-[11px] text-slate-400">Average dialogue length</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_1px_3px_0_rgba(15,23,42,0.06),0_1px_2px_-1px_rgba(15,23,42,0.04)] space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Success Rate</span>
            <Activity className="h-4 w-4 text-cyan-600" />
          </div>
          <div className="text-2xl font-bold text-cyan-600">{stats.completionRate}%</div>
          <div className="text-[11px] text-slate-400">Completion ratio</div>
        </div>
      </div>

      {/* Filters & Search Control Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_1px_3px_0_rgba(15,23,42,0.06),0_1px_2px_-1px_rgba(15,23,42,0.04)] space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search Bar */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by customer phone, name, agent, transcript, or outcome..."
              className="w-full h-9 pl-9 pr-3 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-blue-500"
            />
          </div>

          {/* Agent Dropdown Filter */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Bot className="h-4 w-4 text-slate-400 shrink-0" />
            <select
              value={selectedAgentId}
              onChange={(e) => setSelectedAgentId(e.target.value)}
              className="h-9 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-800 font-semibold focus:outline-none focus:bg-white cursor-pointer w-full md:w-48"
            >
              <option value="all">All Configured Agents</option>
              {agents.map((ag) => (
                <option key={ag.id} value={ag.id}>
                  {ag.name} ({ag.provider})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
          {/* Status Filter Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-semibold text-slate-400 mr-1">Status:</span>
            {(['all', 'completed', 'in-progress', 'failed', 'no-answer'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${
                  statusFilter === st
                    ? 'bg-blue-600 text-white shadow-[0_1px_3px_0_rgba(15,23,42,0.06),0_1px_2px_-1px_rgba(15,23,42,0.04)]'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Provider Filter Pills */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-400 mr-1">Provider:</span>
            {(['all', 'vapi', 'saas_fallback'] as const).map((pv) => (
              <button
                key={pv}
                onClick={() => setProviderFilter(pv)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                  providerFilter === pv
                    ? 'bg-purple-600 text-white shadow-[0_1px_3px_0_rgba(15,23,42,0.06),0_1px_2px_-1px_rgba(15,23,42,0.04)]'
                    : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                }`}
              >
                {pv === 'saas_fallback' ? 'SAAS' : pv}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Call Logs List */}
      {filteredLogs.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-500 text-xs shadow-[0_1px_3px_0_rgba(15,23,42,0.06),0_1px_2px_-1px_rgba(15,23,42,0.04)] space-y-2">
          <Phone className="h-10 w-10 text-slate-300 mx-auto" />
          <div className="text-sm font-bold text-slate-700">No calls matching your search or filters</div>
          <p>Try clearing your filters or click "Sync from Vapi" above to pull recent call recordings.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredLogs.map((log) => {
            const isExpanded = expandedLogId === log.id;
            const isVapi = log.provider === 'vapi';
            const outcomeLower = (log.call_outcome || '').toLowerCase();
            const isQuotation =
              outcomeLower.includes('quot') ||
              outcomeLower.includes('pric') ||
              outcomeLower.includes('whatsapp') ||
              outcomeLower.includes('detail');
            const isMeeting =
              outcomeLower.includes('demo') ||
              outcomeLower.includes('interview') ||
              outcomeLower.includes('appointment') ||
              outcomeLower.includes('schedule') ||
              outcomeLower.includes('placement');
            const meetUrl =
              log.extracted_slots?.meet_url ||
              log.extracted_slots?.whatsapp_dispatch?.meet_url ||
              null;
            const waDispatch = log.extracted_slots?.whatsapp_dispatch || null;

            return (
              <div
                key={log.id}
                className="rounded-2xl border border-slate-200 bg-white overflow-hidden transition-all hover:border-slate-300 shadow-[0_1px_3px_0_rgba(15,23,42,0.06),0_1px_2px_-1px_rgba(15,23,42,0.04)]"
              >
                <div
                  onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                  className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer select-none hover:bg-slate-50/70 transition-colors"
                >
                  <div className="flex items-center gap-3.5">
                    <div
                      className={`h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 border ${
                        isVapi
                          ? 'bg-purple-50 border-purple-200 text-purple-600'
                          : 'bg-blue-50 border-blue-200 text-blue-600'
                      }`}
                    >
                      <Phone className="h-4 w-4" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-900">
                          {log.customer_name || 'Customer'}
                        </span>
                        <span className="text-xs font-mono font-semibold text-slate-600">
                          {log.customer_phone}
                        </span>

                        {/* Semantic Outcome Badge */}
                        {log.call_outcome && (
                          <span
                            className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${
                              isQuotation
                                ? 'bg-amber-50 text-amber-800 border-amber-300'
                                : isMeeting
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                : 'bg-blue-50 text-blue-800 border-blue-200'
                            }`}
                          >
                            <Sparkles className="h-2.5 w-2.5" />
                            {log.call_outcome}
                          </span>
                        )}

                        {/* Scheduled Meeting Google Meet Link Pill */}
                        {meetUrl && (
                          <a
                            href={meetUrl}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1 shadow-[0_1px_3px_0_rgba(15,23,42,0.06),0_1px_2px_-1px_rgba(15,23,42,0.04)]"
                          >
                            <span>🎥 Join Google Meet</span>
                          </a>
                        )}

                        {/* WhatsApp Template Sent Badge */}
                        {waDispatch?.template_name && (
                          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-300 flex items-center gap-1">
                            <span>📲 WA Template: {waDispatch.template_name}</span>
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-700">
                          Agent: {log.agent_name || 'Voice Assistant'}
                        </span>
                        <span>•</span>
                        <span
                          className={`uppercase text-[10px] font-bold px-2 py-0.2 rounded-full border ${
                            isVapi
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                          }`}
                        >
                          {log.provider}
                        </span>
                        <span>•</span>
                        <span>{formatCallDate(log.created_on)}</span>
                      </div>

                      {/* Always-Visible Summary Preview on Every Call Row */}
                      {log.summary && (
                        <div className="mt-2 text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 max-w-2xl line-clamp-2">
                          <span className="font-bold text-slate-900 mr-1">📝 Summary:</span>
                          {log.summary}
                        </div>
                      )}

                      {/* Always-Visible Inline Audio Recording Player on Every Call Row */}
                      {log.recording_url && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="mt-2 flex flex-wrap items-center gap-2.5 bg-emerald-50/60 border border-emerald-200 rounded-xl px-3 py-1.5 max-w-xl"
                        >
                          <span className="text-[11px] font-bold text-emerald-800 flex items-center gap-1 shrink-0">
                            <Volume2 className="h-3.5 w-3.5 text-emerald-600" />
                            Recording:
                          </span>
                          <audio controls className="h-7 flex-1 min-w-[200px]">
                            <source src={`/api/Voice/Calls/audio?callId=${log.id}&providerCallId=${log.provider_call_id || ""}`} type="audio/wav" />
                            <source src={log.recording_url} type="audio/wav" />
                            <source src={log.recording_url} type="audio/mpeg" />
                          </audio>
                          <a
                            href={log.recording_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[10px] font-bold text-emerald-700 hover:underline flex items-center gap-1 shrink-0"
                          >
                            <Download className="h-3 w-3" /> Audio
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end md:self-auto">
                    <span
                      className={`text-[10px] font-bold px-3 py-1 rounded-full border capitalize ${
                        log.call_status === 'completed'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : log.call_status === 'failed'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}
                    >
                      {log.call_status}
                    </span>

                    <span className="text-xs font-mono font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
                      {log.duration_seconds ? `${log.duration_seconds}s` : '0s'}
                    </span>

                    <ChevronRight
                      className={`h-4 w-4 text-slate-400 transition-transform ${
                        isExpanded ? 'rotate-90' : ''
                      }`}
                    />
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50/70 p-5 space-y-4">
                    {/* Audio Player */}
                    {log.recording_url ? (
                      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-[0_1px_3px_0_rgba(15,23,42,0.06),0_1px_2px_-1px_rgba(15,23,42,0.04)] space-y-2.5">
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
                          <div className="flex items-center gap-2">
                            <Volume2 className="h-4 w-4 text-emerald-600" />
                            <span>Audio Call Recording Playback</span>
                          </div>
                          <a
                            href={log.recording_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] text-blue-600 hover:underline font-mono flex items-center gap-1"
                          >
                            <Download className="h-3 w-3" /> Download Audio
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

                    {/* AI Call Summary & Outcome */}
                    {log.summary && (
                      <div className="space-y-1.5">
                        <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                          AI Call Summary & Synthesized Outcome ({log.call_outcome || 'Completed'})
                        </div>
                        <p className="text-xs text-slate-700 bg-white border border-slate-200 p-3.5 rounded-2xl leading-relaxed shadow-[0_1px_3px_0_rgba(15,23,42,0.06),0_1px_2px_-1px_rgba(15,23,42,0.04)]">
                          {log.summary}
                        </p>
                      </div>
                    )}

                    {/* Scheduled Meeting & Google Meet Link Box */}
                    {meetUrl && (
                      <div className="p-4 rounded-2xl bg-indigo-50/80 border border-indigo-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="text-xs font-extrabold text-indigo-950 flex items-center gap-1.5">
                            <span>📅 Scheduled Meeting Outcome: {log.call_outcome}</span>
                          </div>
                          <div className="text-xs text-indigo-700 font-mono break-all">
                            🔗 {meetUrl}
                          </div>
                        </div>
                        <a
                          href={meetUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shrink-0 text-center shadow-[0_1px_3px_0_rgba(15,23,42,0.06),0_1px_2px_-1px_rgba(15,23,42,0.04)]"
                        >
                          🎥 Open Google Meet Room
                        </a>
                      </div>
                    )}

                    {/* WhatsApp Template & Payload Dispatched Box */}
                    {waDispatch && (
                      <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-2.5">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="text-xs font-extrabold text-emerald-950 flex items-center gap-1.5">
                            <span>📲 WhatsApp Template & Payload Dispatched</span>
                          </div>
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold font-mono">
                            Template: {waDispatch.template_name}
                          </span>
                        </div>
                        {waDispatch.message_body && (
                          <div className="text-xs text-slate-800 bg-white border border-emerald-200 rounded-xl p-3 whitespace-pre-wrap leading-relaxed">
                            {waDispatch.message_body}
                          </div>
                        )}
                        {waDispatch.payload && (
                          <details className="text-[11px] text-emerald-900">
                            <summary className="cursor-pointer font-bold hover:underline">
                              View Meta WhatsApp Cloud API Payload (JSON)
                            </summary>
                            <pre className="mt-2 p-3 rounded-xl bg-slate-900 text-emerald-300 font-mono text-[10px] overflow-x-auto">
                              {JSON.stringify(waDispatch.payload, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    )}

                    {/* Interactive Chat Bubble Dialogue Transcript */}
                    <div className="space-y-2">
                      <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5 text-slate-500" />
                        Full Dialogue Transcript
                      </div>
                      <div className="max-h-80 overflow-y-auto p-4 rounded-2xl bg-white border border-slate-200 shadow-[0_1px_3px_0_rgba(15,23,42,0.06),0_1px_2px_-1px_rgba(15,23,42,0.04)] space-y-2.5">
                        {log.transcript ? (
                          log.transcript.split('\n').map((line, idx) => {
                            const trimmed = line.trim();
                            if (!trimmed) return null;
                            const isAi =
                              trimmed.toLowerCase().startsWith('ai:') ||
                              trimmed.toLowerCase().startsWith('assistant:');
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
                                    {isAi ? `🤖 ${log.agent_name || 'AI Assistant'}` : `👤 ${log.customer_name || 'Customer'}`}
                                  </div>
                                  {trimmed.replace(/^(ai:|assistant:|customer:|user:)\s*/i, '')}
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <p className="text-xs text-slate-400 italic">No dialogue transcript captured.</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

