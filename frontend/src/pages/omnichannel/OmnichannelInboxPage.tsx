import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'wouter';
import {
  OmnichannelConversation,
  OmnichannelChannel,
  OmnichannelStatus,
  Customer360Response,
  TimelineJourneyItem,
} from '@/types/omnichannel';
import { omnichannelService, ConversationFilterParams } from '@/service/omnichannelService';
import { TimelineItem, TimelineEventItem } from './components/TimelineItem';
import { OmniComposer } from './components/OmniComposer';
import { CustomerProfileCopilotPanel } from './components/CustomerProfileCopilotPanel';
import { LeadListPage } from './components/LeadListPage';
import { LeadDetailPage } from './components/LeadDetailPage';
import { UnifiedStreamWorkstation } from './components/UnifiedStreamWorkstation';
import {
  Search,
  MessageSquare,
  Mail,
  Phone,
  RefreshCw,
  Sparkles,
  Inbox,
  Filter,
  CheckCircle2,
  Clock,
  Flame,
  PanelRightClose,
  PanelRightOpen,
  Send,
  Zap,
  Users,
} from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { toast } from 'sonner';

export const OmnichannelInboxPage: React.FC = () => {
  const [location, setLocation] = useLocation();

  // Extract leadId from /admin/omnichannel/:leadId
  const match = location.match(/\/admin\/omnichannel\/([a-zA-Z0-9_-]+)/);
  const activeLeadId = match && match[1] && match[1] !== 'inbox' ? match[1] : null;

  // View mode: 'leads' (requested Lead List + Detail Timeline) or 'chat' (3-panel live inbox)
  const [viewMode, setViewMode] = useState<'leads' | 'chat'>('leads');

  const [conversations, setConversations] = useState<OmnichannelConversation[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

  // Active selected conversation details & unified multi-channel journey
  const [activeCustomer360, setActiveCustomer360] = useState<Customer360Response | null>(null);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);
  const [sendingReply, setSendingReply] = useState<boolean>(false);

  // Panel 3 collapse state
  const [showRightPanel, setShowRightPanel] = useState<boolean>(true);

  // Audio playback state
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);

  // Filters state
  const [channelFilter, setChannelFilter] = useState<'all' | 'whatsapp' | 'email' | 'call'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'new' | 'open' | 'pending' | 'resolved'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const timelineEndRef = useRef<HTMLDivElement>(null);

  // Render the Customer-Centric Omnichannel Unified Stream Workstation
  return <UnifiedStreamWorkstation initialLeadId={activeLeadId} />;

  // 1. Fetch conversations list
  const fetchConversations = useCallback(
    async (quiet = false) => {
      try {
        if (!quiet) setLoading(true);
        const params: ConversationFilterParams = {
          channel: channelFilter,
          status: statusFilter,
          search: searchQuery.trim() || undefined,
          limit: 50,
        };
        const res = await omnichannelService.getConversations(params);
        setConversations(res.items || []);
        setTotal(res.total || 0);

        // Auto-select first if none selected
        if (!selectedConversationId && res.items && res.items.length > 0) {
          setSelectedConversationId(res.items[0].id);
        }
      } catch {
        toast.error('Failed to load conversations');
      } finally {
        setLoading(false);
      }
    },
    [channelFilter, statusFilter, searchQuery, selectedConversationId]
  );

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // 2. Fetch full multi-channel timeline for active conversation & customer
  const loadActiveConversationDetail = useCallback(async (convId: string) => {
    try {
      setLoadingDetail(true);
      const detail = await omnichannelService.getConversationDetail(convId);
      const customerId = detail.conversation?.customer_id;

      if (customerId) {
        // Fetch 360 multi-channel journey (WhatsApp + Email + Voice Calls in 1 Thread)
        const c360 = await omnichannelService.getCustomer360(customerId);
        setActiveCustomer360(c360);
      } else {
        // Construct single-channel fallback
        setActiveCustomer360({
          customer: detail.conversation.customer || {
            id: 'temp',
            name: 'Customer',
          },
          summary: {
            totalConversations: 1,
            totalMessages: detail.messages.length,
            totalCalls: detail.calls.length,
            whatsappCount: detail.messages.filter((m) => m.direction === 'in').length,
            emailCount: 0,
            callCount: detail.calls.length,
          },
          conversations: [detail.conversation],
          timeline: [
            ...detail.messages.map((m) => ({
              id: m.id,
              channel: detail.conversation.channel as any,
              type: 'message',
              direction: m.direction,
              timestamp: m.timestamp,
              title: m.subject || 'Message',
              body: m.body,
              attachments: m.attachments,
              conversation_id: m.conversation_id,
            })),
            ...detail.calls.map((c) => ({
              id: c.id,
              channel: 'call' as const,
              type: 'call',
              direction: c.direction,
              timestamp: c.started_at,
              title: 'Voice Call',
              duration: c.duration,
              recording_url: c.recording_url,
              transcript: c.transcript,
              ai_summary: c.ai_summary,
              outcome: c.outcome,
              conversation_id: c.conversation_id,
            })),
          ],
          activities: detail.activities,
        });
      }
    } catch {
      toast.error('Failed to load conversation timeline');
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    if (selectedConversationId) {
      loadActiveConversationDetail(selectedConversationId);
    }
  }, [selectedConversationId, loadActiveConversationDetail]);

  // Real-time SSE listener
  useEffect(() => {
    const unsubscribe = omnichannelService.subscribeToStream((event) => {
      fetchConversations(true);
      if (selectedConversationId) {
        loadActiveConversationDetail(selectedConversationId);
      }
      if (event.type === 'message_received' || event.type === 'call_logged') {
        toast.info(`New interaction arrived on ${event.data?.channel || 'omnichannel'}`);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [fetchConversations, selectedConversationId, loadActiveConversationDetail]);

  const handleToggleAudio = (id: string, url: string | null | undefined) => {
    if (!url) {
      setPlayingAudioId(null);
      return;
    }
    const el = document.getElementById(`audio-${id}`) as HTMLAudioElement | null;
    if (!el) return;

    if (playingAudioId === id) {
      el.pause();
      setPlayingAudioId(null);
    } else {
      el.play().catch(() => toast.error('Audio playback error'));
      setPlayingAudioId(id);
    }
  };

  const handleSendReply = async (payload: {
    channel: 'whatsapp' | 'email' | 'call';
    body: string;
    subject?: string;
    attachments?: Array<{ name: string; url: string; mimeType?: string; size?: number }>;
  }) => {
    if (!selectedConversationId) return;

    try {
      setSendingReply(true);
      await omnichannelService.sendReply(selectedConversationId, payload);
      toast.success(`Dispatched on ${payload.channel.toUpperCase()}`);

      // Refresh current thread and inbox
      await loadActiveConversationDetail(selectedConversationId);
      fetchConversations(true);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to dispatch reply');
    } finally {
      setSendingReply(false);
    }
  };

  const handleStatusChange = async (newStatus: OmnichannelStatus) => {
    if (!selectedConversationId) return;
    try {
      await omnichannelService.updateConversation(selectedConversationId, {
        status: newStatus,
      });
      toast.success(`Status updated to ${newStatus}`);
      fetchConversations(true);
      loadActiveConversationDetail(selectedConversationId);
    } catch {
      toast.error('Failed to update status');
    }
  };

  const activeConv = conversations.find((c) => c.id === selectedConversationId);
  const activeCustomer = activeCustomer360?.customer || activeConv?.customer;

  // Unified chronological timeline sorted ascending for chat view
  const chronologicalTimeline: TimelineEventItem[] = (activeCustomer360?.timeline || [])
    .slice()
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .map((item) => ({
      id: item.id,
      channel: item.channel as any,
      direction: item.direction as any,
      timestamp: item.timestamp,
      title: item.title,
      body: item.body,
      subject: item.subject,
      duration: item.duration,
      recording_url: item.recording_url,
      transcript: item.transcript,
      ai_summary: item.ai_summary,
      outcome: item.outcome,
      attachments: item.attachments,
    }));

  const aiDraftText = `Hi ${activeCustomer?.name || 'there'}! Yes, 5 seats are included in the Pro tier with full omnichannel sync. Would you like me to share the checkout link or schedule an onboarding session?`;

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-5rem)] min-w-0 bg-[#eaedf2] dark:bg-slate-950 overflow-hidden font-sans">
      {/* ── TOP BAR: CHANNEL STATUS INDICATORS ── */}
      <div className="h-12 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 flex items-center justify-between shrink-0 shadow-2xs">
        <div className="flex items-center gap-3 sm:gap-6 overflow-x-auto [scrollbar-width:none]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              WhatsApp: <span className="text-emerald-600 dark:text-emerald-400 font-bold">Online 🟢</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Email: <span className="text-blue-600 dark:text-blue-400 font-bold">Synced 🟢</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Voice Agent: <span className="text-amber-600 dark:text-amber-400 font-bold">Ready 🟢</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {conversations.length === 0 && !loading && (
            <button
              onClick={() => omnichannelService.seedDemo().then(() => fetchConversations())}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors cursor-pointer"
            >
              Seed Demo
            </button>
          )}

          <button
            onClick={() => fetchConversations()}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
            title="Refresh inbox"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── 3-PANEL INFORMATION ARCHITECTURE ── */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* ── PANEL 1: INBOX STREAM (Left ~25-28%) ── */}
        <div className="w-full sm:w-[320px] lg:w-[360px] border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col shrink-0">
          {/* Filter Bar */}
          <div className="p-3 border-b border-slate-200 dark:border-slate-800 space-y-2.5">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search name, phone, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Quick Channel Filter Chips */}
            <div className="flex items-center gap-1 overflow-x-auto [scrollbar-width:none]">
              <button
                onClick={() => setChannelFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                  channelFilter === 'all'
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setChannelFilter('whatsapp')}
                className={`px-2 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0 ${
                  channelFilter === 'whatsapp'
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:text-emerald-600'
                }`}
              >
                <MessageSquare className="w-3 h-3" />
                <span>WhatsApp</span>
              </button>
              <button
                onClick={() => setChannelFilter('email')}
                className={`px-2 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0 ${
                  channelFilter === 'email'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:text-blue-600'
                }`}
              >
                <Mail className="w-3 h-3" />
                <span>Email</span>
              </button>
              <button
                onClick={() => setChannelFilter('call')}
                className={`px-2 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0 ${
                  channelFilter === 'call'
                    ? 'bg-amber-600 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:text-amber-600'
                }`}
              >
                <Phone className="w-3 h-3" />
                <span>Calls</span>
              </button>
            </div>
          </div>

          {/* Conversation Cards List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80 [scrollbar-width:thin]">
            {loading ? (
              <div className="py-16 text-center text-slate-400 text-xs">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                Loading triage stream...
              </div>
            ) : conversations.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-xs p-4">
                <Inbox className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                No conversations found.
              </div>
            ) : (
              conversations.map((conv) => {
                const isSelected = selectedConversationId === conv.id;
                const custName = conv.customer?.name || conv.customer?.phone || 'Customer';
                const isWA = conv.channel === 'whatsapp';
                const isEmail = conv.channel === 'email';

                return (
                  <div
                    key={conv.id}
                    onClick={() => setSelectedConversationId(conv.id)}
                    className={`p-3.5 transition-all cursor-pointer border-l-4 ${
                      isSelected
                        ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-600'
                        : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    {/* Header Row: Channel Badge, Customer Name, Unread / Time */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                            isWA
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                              : isEmail
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
                          }`}
                        >
                          {isWA ? (
                            <MessageSquare className="w-3.5 h-3.5" />
                          ) : isEmail ? (
                            <Mail className="w-3.5 h-3.5" />
                          ) : (
                            <Phone className="w-3.5 h-3.5" />
                          )}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {custName}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">
                            {conv.customer?.company_name || conv.customer?.phone || conv.customer?.email}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col items-end shrink-0">
                        <span className="text-[10px] text-slate-400 font-medium font-mono">
                          {conv.last_activity_at
                            ? (() => {
                                const d = new Date(conv.last_activity_at);
                                if (isNaN(d.getTime())) return '';
                                if (isToday(d)) return format(d, 'h:mm a');
                                if (isYesterday(d)) return 'Yesterday';
                                return format(d, 'd MMM');
                              })()
                            : ''}
                        </span>
                        <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 mt-1">
                          • 1 Unread
                        </span>
                      </div>
                    </div>

                    {/* One-Line Description / Activity snippet */}
                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-1 mt-2 leading-relaxed">
                      {conv.summary || 'Interaction recorded on channel.'}
                    </p>

                    {/* Metadata Footer: SLA & Lead Score */}
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[10px]">
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        SLA: 4m left
                      </span>
                      <span className="text-rose-600 dark:text-rose-400 font-bold flex items-center gap-0.5">
                        <Flame className="w-3 h-3" />
                        Hot Lead
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── PANEL 2: CHRONOLOGICAL UNIFIED TIMELINE (Center ~48-50%) ── */}
        <div className="flex-1 flex flex-col min-w-0 bg-slate-50/50 dark:bg-slate-950/50">
          {selectedConversationId && activeConv ? (
            <>
              {/* Timeline Header */}
              <div className="h-16 px-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-extrabold flex items-center justify-center text-sm shadow-xs shrink-0">
                    {activeCustomer?.name?.charAt(0).toUpperCase() || 'C'}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {activeCustomer?.name || 'Customer'}
                      </h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                        {activeCustomer?.tier || 'Pro Plan'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {activeCustomer?.phone || activeCustomer?.email || 'Unified Contact'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <select
                    value={activeConv?.status || 'open'}
                    onChange={(e) => handleStatusChange(e.target.value as any)}
                    className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
                  >
                    <option value="new">Status: New</option>
                    <option value="open">Status: Open</option>
                    <option value="pending">Status: Pending</option>
                    <option value="resolved">Status: Resolved</option>
                  </select>

                  <button
                    onClick={() => setShowRightPanel(!showRightPanel)}
                    title={showRightPanel ? 'Collapse 360 Copilot' : 'Expand 360 Copilot'}
                    className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                      showRightPanel
                        ? 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {showRightPanel ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Unified Multi-Channel Stream Body */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 [scrollbar-width:thin]">
                {loadingDetail ? (
                  <div className="py-20 text-center text-slate-400 text-xs">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Unifying timeline events across WhatsApp, Email & Calls...
                  </div>
                ) : chronologicalTimeline.length === 0 ? (
                  <div className="py-20 text-center text-slate-400 text-xs">
                    No timeline records logged yet.
                  </div>
                ) : (
                  <>
                    {chronologicalTimeline.map((item) => (
                      <TimelineItem
                        key={item.id}
                        item={item}
                        customerName={activeCustomer?.name}
                        playingAudioId={playingAudioId}
                        onToggleAudio={handleToggleAudio}
                      />
                    ))}

                    {/* AI DRAFT SUGGESTION - Ready for Approval */}
                    <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 dark:from-purple-950/30 dark:via-indigo-950/30 dark:to-blue-950/30 border border-purple-200 dark:border-purple-800/60 shadow-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-purple-900 dark:text-purple-200">
                          <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                          <span>AI DRAFT SUGGESTION • Ready for Approval</span>
                        </div>
                        <span className="text-[10px] uppercase font-bold text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/60 px-2 py-0.5 rounded-full">
                          WhatsApp Outbound
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 dark:text-slate-200 italic leading-relaxed">
                        "{aiDraftText}"
                      </p>
                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleSendReply({ channel: 'whatsapp', body: aiDraftText })}
                          className="px-3 py-1 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs cursor-pointer transition-colors"
                        >
                          Approve & Send (1-Click)
                        </button>
                      </div>
                    </div>

                    <div ref={timelineEndRef} />
                  </>
                )}
              </div>

              {/* ── PANEL 2B: OMNICHANNEL COMPOSER ── */}
              <OmniComposer
                initialChannel={activeConv?.channel === 'whatsapp' ? 'whatsapp' : activeConv?.channel === 'call' ? 'call' : 'email'}
                customerName={activeCustomer?.name}
                customerPhone={activeCustomer?.phone}
                customerEmail={activeCustomer?.email}
                aiSuggestedDraft={aiDraftText}
                onSend={handleSendReply}
                loading={sendingReply}
              />
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-400">
              <Inbox className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-2" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Select a conversation</p>
              <p className="text-xs text-slate-400 mt-1 text-center max-w-sm">
                Choose an inquiry from the left triage stream to load the unified cross-channel timeline.
              </p>
            </div>
          )}
        </div>

        {/* ── PANEL 3: 360° CUSTOMER PROFILE & AI COPILOT (Right ~25%) ── */}
        {showRightPanel && (
          <div className="w-full sm:w-[320px] lg:w-[360px] shrink-0 h-full">
            <CustomerProfileCopilotPanel
              customer={activeCustomer}
              journeyItems={activeCustomer360?.timeline || []}
              onApplyAiDraft={(draft) => {
                // Sent to composer
                toast.info('Draft copied to composer');
              }}
              onClose={() => setShowRightPanel(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
};
