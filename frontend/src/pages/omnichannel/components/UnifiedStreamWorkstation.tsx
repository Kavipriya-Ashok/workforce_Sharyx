import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useLocation } from 'wouter';
import {
  Search,
  MessageSquare,
  Mail,
  Phone,
  PhoneCall,
  Calendar,
  Users,
  Video,
  Sparkles,
  RefreshCw,
  Send,
  Play,
  Pause,
  Download,
  Paperclip,
  CheckCheck,
  Building2,
  Clock,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Copy,
  Check,
  ArrowRight,
  MoreHorizontal,
  ChevronRight,
  Filter,
  CheckCircle2,
  CornerDownRight,
  Briefcase,
  User,
  PanelRightClose,
  PanelRightOpen,
  Volume2,
} from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { toast } from 'sonner';
import { ChannelInteractionDetailDrawer } from './ChannelInteractionDetailDrawer';
import { omnichannelService } from '@/service/omnichannelService';
import {
  OmnichannelLeadItem,
  OmnichannelChannel,
  LeadTimelineResponse,
  OmnichannelCommunicationItem,
  CustomerIntelligenceReport,
} from '@/types/omnichannel';

interface UnifiedStreamWorkstationProps {
  initialLeadId?: string | null;
}

export const UnifiedStreamWorkstation: React.FC<UnifiedStreamWorkstationProps> = ({
  initialLeadId,
}) => {
  const [, setLocation] = useLocation();

  // ──────────────────────────────────────────────────────────────────────────
  // PANEL 1: CUSTOMER DIRECTORY STATE
  // ──────────────────────────────────────────────────────────────────────────
  const [leads, setLeads] = useState<OmnichannelLeadItem[]>([]);
  const [totalLeads, setTotalLeads] = useState<number>(0);
  const [loadingLeads, setLoadingLeads] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(initialLeadId || null);

  // ──────────────────────────────────────────────────────────────────────────
  // PANEL 2: ACTIVE CUSTOMER WORKSPACE & TIMELINE STATE
  // ──────────────────────────────────────────────────────────────────────────
  const [timelineData, setTimelineData] = useState<LeadTimelineResponse | null>(null);
  const [loadingTimeline, setLoadingTimeline] = useState<boolean>(false);
  const [channelFilterTab, setChannelFilterTab] = useState<
    'all' | 'whatsapp' | 'email' | 'call' | 'meeting' | 'interview' | 'ai'
  >('all');
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  const [highlightedEventId, setHighlightedEventId] = useState<string | null>(null);
  const [selectedDrawerEvent, setSelectedDrawerEvent] = useState<any | null>(null);

  // Audio player state with live scrubber
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [audioProgress, setAudioProgress] = useState<number>(0);
  const [audioCurrentTime, setAudioCurrentTime] = useState<number>(0);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Multi-Channel Composer State
  const [replyChannel, setReplyChannel] = useState<'whatsapp' | 'email' | 'call'>('whatsapp');
  const [replyBody, setReplyBody] = useState<string>('');
  const [replySubject, setReplySubject] = useState<string>('');
  const [sendingReply, setSendingReply] = useState<boolean>(false);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);

  // Panel 3 collapse toggle for small screens
  const [showRightPanel, setShowRightPanel] = useState<boolean>(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Scroll target refs for journey milestones
  const eventCardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // ──────────────────────────────────────────────────────────────────────────
  // 1. FETCH CUSTOMER DIRECTORY
  // ──────────────────────────────────────────────────────────────────────────
  const fetchDirectory = useCallback(async (quiet = false) => {
    try {
      if (!quiet) setLoadingLeads(true);
      const res = await omnichannelService.getLeads({
        search: searchQuery.trim() || undefined,
        limit: 50,
      });
      const items = res.items || [];
      setLeads(items);
      setTotalLeads(res.total || items.length);

      // Auto-select first lead if none selected
      if (!selectedLeadId && items.length > 0) {
        setSelectedLeadId(items[0].id);
        setLocation(`/admin/omnichannel/${items[0].id}`);
      }
    } catch (err: any) {
      toast.error('Failed to load customer directory: ' + (err.message || 'Error'));
    } finally {
      setLoadingLeads(false);
    }
  }, [searchQuery, selectedLeadId, setLocation]);

  useEffect(() => {
    fetchDirectory();
  }, [fetchDirectory]);

  // Sync if initialLeadId prop changes from URL
  useEffect(() => {
    if (initialLeadId && initialLeadId !== selectedLeadId) {
      setSelectedLeadId(initialLeadId);
    }
  }, [initialLeadId]);

  // ──────────────────────────────────────────────────────────────────────────
  // 2. FETCH TIMELINE & AI INSIGHTS FOR SELECTED LEAD
  // ──────────────────────────────────────────────────────────────────────────
  const fetchActiveTimeline = useCallback(async (leadId: string, quiet = false) => {
    try {
      if (!quiet) setLoadingTimeline(true);
      const res = await omnichannelService.getLeadTimeline(leadId);
      setTimelineData(res);
    } catch (err: any) {
      toast.error('Failed to load customer timeline: ' + (err.message || 'Error'));
    } finally {
      setLoadingTimeline(false);
    }
  }, []);

  useEffect(() => {
    if (selectedLeadId) {
      fetchActiveTimeline(selectedLeadId);
    }
  }, [selectedLeadId, fetchActiveTimeline]);

  // Handle customer selection from Directory
  const handleSelectCustomer = (id: string) => {
    setSelectedLeadId(id);
    setLocation(`/admin/omnichannel/${id}`);
  };

  // ──────────────────────────────────────────────────────────────────────────
  // 3. AUDIO PLAYBACK CONTROLS (Browser SpeechSynthesis for HIPAA / Local Audio)
  // ──────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const togglePlayAudio = (id: string, url?: string, transcriptText?: string) => {
    if (playingAudioId === id) {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      audioRef.current?.pause();
      setPlayingAudioId(null);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    const isPrivateR2 = Boolean(url && (url.includes('r2.cloudflarestorage.com') || url.includes('hipaa')));

    if (isPrivateR2 || !url) {
      const speech = transcriptText || 'Call completed with customer. Full transcript logged.';
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(speech);
        utterance.rate = 0.95;
        utterance.onend = () => {
          setPlayingAudioId(null);
          setAudioProgress(0);
        };
        utterance.onerror = () => {
          setPlayingAudioId(null);
        };
        window.speechSynthesis.speak(utterance);
        setPlayingAudioId(id);
        toast.success('🗣️ Playing voice agent call dialogue (Verified STT Transcript)');
      } else {
        toast.info('Full STT conversation transcript is logged in details.');
      }
      return;
    }

    try {
      const audio = new Audio(url);
      audioRef.current = audio;
      setPlayingAudioId(id);
      audio.play().catch(() => {
        toast.info('Audio preview not supported by browser.');
        setPlayingAudioId(null);
      });

      audio.ontimeupdate = () => {
        if (audio.duration) {
          setAudioProgress((audio.currentTime / audio.duration) * 100);
          setAudioCurrentTime(audio.currentTime);
          setAudioDuration(audio.duration);
        }
      };

      audio.onended = () => {
        setPlayingAudioId(null);
        setAudioProgress(0);
        setAudioCurrentTime(0);
      };
    } catch {
      setPlayingAudioId(null);
    }
  };

  const handleSeekAudio = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setAudioProgress(val);
    if (audioRef.current && audioRef.current.duration) {
      audioRef.current.currentTime = (val / 100) * audioRef.current.duration;
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // 4. SEND MULTI-CHANNEL REPLY
  // ──────────────────────────────────────────────────────────────────────────
  const handleSendReply = async () => {
    if (!selectedLeadId || !replyBody.trim()) {
      toast.error('Please enter a message response');
      return;
    }
    try {
      setSendingReply(true);
      await omnichannelService.sendLeadReply(selectedLeadId, {
        channel: replyChannel,
        body: replyBody.trim(),
        subject: replySubject.trim() || undefined,
      });
      toast.success(`Sent reply via ${replyChannel.toUpperCase()} successfully!`);
      setReplyBody('');
      setReplySubject('');
      await fetchActiveTimeline(selectedLeadId, true);
    } catch (err: any) {
      toast.error('Failed to dispatch reply: ' + (err.message || 'Error'));
    } finally {
      setSendingReply(false);
    }
  };

  // 1-Click apply Next Best Action proposal into composer
  const handleApplyNextBestAction = () => {
    if (!timelineData?.insights?.next_step) return;
    const nextStep = timelineData.insights.next_step;
    const ch = nextStep.recommended_channel === 'whatsapp' || nextStep.recommended_channel === 'call'
      ? nextStep.recommended_channel
      : 'email';
    setReplyChannel(ch);
    if (nextStep.recommended_channel === 'email') {
      setReplySubject(
        `Proposal & Commercial Invoice - ${timelineData.lead.company_name || timelineData.lead.name}`
      );
    }
    setReplyBody(nextStep.suggested_reply || '');
    toast.success('Applied AI recommended response into reply box!');
    setTimeout(() => {
      composerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      composerRef.current?.focus();
    }, 150);
  };

  // ──────────────────────────────────────────────────────────────────────────
  // 5. CLICK-TO-SCROLL JOURNEY MILESTONE & OPEN DETAIL DRAWER
  // ──────────────────────────────────────────────────────────────────────────
  const handleScrollToMilestone = (eventId?: string) => {
    if (!eventId) return;
    const el = eventCardRefs.current[eventId];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedEventId(eventId);
      setTimeout(() => setHighlightedEventId(null), 2500);
    }
    const targetItem = timelineData?.timeline.find((t) => t.id === eventId);
    if (targetItem) {
      setSelectedDrawerEvent(targetItem);
    } else {
      toast.info('Milestone event is visible in the timeline');
    }
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  // ──────────────────────────────────────────────────────────────────────────
  // 6. FILTERING & GROUPING DATA
  // ──────────────────────────────────────────────────────────────────────────
  const filteredTimeline = useMemo(() => {
    if (!timelineData?.timeline) return [];
    if (channelFilterTab === 'all' || channelFilterTab === 'ai') {
      return timelineData.timeline;
    }
    return timelineData.timeline.filter((item) => item.channel === channelFilterTab);
  }, [timelineData, channelFilterTab]);

  // Group timeline by date (Today, Yesterday, or formatted date)
  const groupedTimeline = useMemo(() => {
    const groups: Record<string, OmnichannelCommunicationItem[]> = {};
    filteredTimeline.forEach((item) => {
      const date = new Date(item.occurred_at || new Date());
      let dateKey = format(date, 'd MMM yyyy');
      if (isToday(date)) dateKey = `Today, ${format(date, 'd MMM yyyy')}`;
      else if (isYesterday(date)) dateKey = `Yesterday, ${format(date, 'd MMM yyyy')}`;

      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(item);
    });
    return groups;
  }, [filteredTimeline]);

  // Directory leads
  const filteredDirectoryLeads = useMemo(() => {
    return leads;
  }, [leads]);

  // Helper formatting
  const formatDirectoryTime = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return '';
      if (isToday(d)) {
        return format(d, 'h:mm a');
      }
      if (isYesterday(d)) {
        return 'Yesterday';
      }
      return format(d, 'd MMM');
    } catch {
      return '';
    }
  };

  const formatTime = (isoString?: string) => {
    if (!isoString) return '';
    try {
      return format(new Date(isoString), 'h:mm a');
    } catch {
      return '';
    }
  };

  const formatDuration = (secs?: number | null) => {
    if (!secs) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // ──────────────────────────────────────────────────────────────────────────
  // 7. REAL DATABASE-DERIVED CUSTOMER JOURNEY MILESTONES
  // ──────────────────────────────────────────────────────────────────────────
  const dynamicJourneyMilestones = useMemo<
    Array<{
      id: string;
      title: string;
      dateStr: string;
      channel: string;
      status: 'completed' | 'pending';
      eventId?: string;
    }>
  >(() => {
    if (!timelineData?.timeline || timelineData.timeline.length === 0) {
      return [
        {
          id: 'lead-created',
          title: 'Lead Registered',
          dateStr: timelineData?.lead?.created_at
            ? format(new Date(timelineData.lead.created_at), 'd MMM, h:mm a')
            : 'Initiated',
          channel: 'lead',
          status: 'completed',
        },
        {
          id: 'closure-pending',
          title: 'Pricing & Closure',
          dateStr: 'Pending',
          channel: 'pending',
          status: 'pending',
        },
      ];
    }

    // Sort ascending (earliest interaction first)
    const sorted = [...timelineData.timeline].sort(
      (a, b) => new Date(a.occurred_at || 0).getTime() - new Date(b.occurred_at || 0).getTime()
    );

    const milestones: Array<{
      id: string;
      title: string;
      dateStr: string;
      channel: string;
      status: 'completed' | 'pending';
      eventId?: string;
    }> = [];

    const channelNameMap: Record<string, string> = {
      whatsapp: 'WhatsApp',
      email: 'Email',
      call: 'Voice Call',
      meeting: 'Demo Meeting',
      interview: 'Interview',
    };

    // 1. First Touchpoint
    const first = sorted[0];
    const firstDate = new Date(first.occurred_at || new Date());
    milestones.push({
      id: `m-first-${first.id}`,
      title: `First Contact (${channelNameMap[first.channel] || 'Outreach'})`,
      dateStr: format(firstDate, 'd MMM, h:mm a'),
      channel: first.channel,
      status: 'completed',
      eventId: first.id,
    });

    // 2. Intermediate Milestones across distinct channels
    const seenChannels = new Set<string>([first.channel]);
    for (let i = 1; i < sorted.length; i++) {
      const it = sorted[i];
      if (!seenChannels.has(it.channel) || it.channel === 'meeting' || it.channel === 'interview') {
        seenChannels.add(it.channel);
        const itDate = new Date(it.occurred_at || new Date());
        let title = `${channelNameMap[it.channel] || it.channel}`;
        if (it.channel === 'meeting') title = 'Demo Meeting';
        else if (it.channel === 'email') title = it.direction === 'inbound' ? 'Email Received' : 'Demo Email Sent';
        else if (it.channel === 'call') title = 'Follow-up Call';
        else if (it.channel === 'interview') title = 'Interview';

        milestones.push({
          id: `m-channel-${it.id}`,
          title,
          dateStr: format(itDate, 'd MMM, h:mm a'),
          channel: it.channel,
          status: 'completed',
          eventId: it.id,
        });

        if (milestones.length >= 4) break;
      }
    }

    // 3. Latest Touchpoint (if not already the first or only)
    const latest = sorted[sorted.length - 1];
    if (latest.id !== first.id && !milestones.some((m) => m.eventId === latest.id)) {
      const latestDate = new Date(latest.occurred_at || new Date());
      milestones.push({
        id: `m-latest-${latest.id}`,
        title: `Latest Touchpoint (${channelNameMap[latest.channel] || latest.channel})`,
        dateStr: format(latestDate, 'd MMM, h:mm a'),
        channel: latest.channel,
        status: 'completed',
        eventId: latest.id,
      });
    }

    // 4. Pending Final Stage
    milestones.push({
      id: 'm-closure-pending',
      title: 'Pricing & Closure',
      dateStr: 'Pending',
      channel: 'pending',
      status: 'pending',
    });

    return milestones;
  }, [timelineData]);

  return (
    <div className="flex-1 min-h-0 flex flex-col h-full bg-slate-50 dark:bg-slate-950 overflow-hidden font-sans">
      {/* ═════════════════════════════════════════════════════════════════════════ */}
      {/* GLOBAL HEADER BAR: SHARYX UNIFIED STREAM TITLE & CONTROLS                */}
      {/* ═════════════════════════════════════════════════════════════════════════ */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-3 shrink-0 flex items-center justify-between shadow-2xs">
        <div>
          <h1 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <span>Unified Stream</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            All customer conversations across WhatsApp, Email, Calls, Meetings & Interviews
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (selectedLeadId) fetchActiveTimeline(selectedLeadId, false);
              fetchDirectory(false);
            }}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-2xs cursor-pointer"
            title="Refresh active stream"
          >
            <RefreshCw
              className={`h-4 w-4 ${loadingTimeline || loadingLeads ? 'animate-spin text-purple-600' : ''}`}
            />
          </button>

          <button
            onClick={() => setShowRightPanel((prev) => !prev)}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-2xs cursor-pointer"
            title={showRightPanel ? 'Hide AI Intelligence' : 'Show AI Intelligence'}
          >
            {showRightPanel ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* ═════════════════════════════════════════════════════════════════════════ */}
      {/* MAIN 3-PANEL WORKSPACE                                                   */}
      {/* ═════════════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* ─────────────────────────────────────────────────────────────────────── */}
        {/* PANEL 1: CUSTOMER DIRECTORY (LEFT COMPACT 260-280PX)                     */}
        {/* ─────────────────────────────────────────────────────────────────────── */}
        <div className="w-64 xl:w-72 shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col h-full min-h-0 overflow-hidden">
          {/* Search Box */}
          <div className="p-3.5 border-b border-slate-100 dark:border-slate-800/80">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search customer (name, phone, email)"
                className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500"
              />
              <Filter className="h-3.5 w-3.5 absolute right-3 top-3 text-slate-400 cursor-pointer" />
            </div>
          </div>

          {/* Customer Stream List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 [scrollbar-width:thin]">
            {loadingLeads ? (
              <div className="p-6 space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-3 animate-pulse">
                    <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 w-28 bg-slate-200 dark:bg-slate-800 rounded" />
                      <div className="h-2.5 w-40 bg-slate-200 dark:bg-slate-800 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredDirectoryLeads.length === 0 ? (
              <div className="p-8 text-center text-slate-400 space-y-2">
                <Users className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-700" />
                <p className="text-xs font-semibold">No customers found</p>
              </div>
            ) : (
              filteredDirectoryLeads.map((item) => {
                const isSelected = item.id === selectedLeadId;
                const unreadCount = item.communication_counts?.whatsapp || 0;
                return (
                  <div
                    key={item.id}
                    onClick={() => handleSelectCustomer(item.id)}
                    className={`p-3.5 flex items-start gap-3 cursor-pointer transition-all border-l-3 ${
                      isSelected
                        ? 'bg-purple-50/70 dark:bg-purple-950/40 border-purple-600 shadow-2xs'
                        : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    {/* Customer Initials / Avatar */}
                    <div className="relative shrink-0">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                        {item.name?.slice(0, 2).toUpperCase() || 'CU'}
                      </div>
                    </div>

                    {/* Customer Info & Snippet */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span
                          className={`text-xs font-bold truncate ${
                            isSelected ? 'text-purple-900 dark:text-purple-200' : 'text-slate-900 dark:text-white'
                          }`}
                        >
                          {item.name}
                        </span>
                        <span className="text-[10px] text-slate-400 shrink-0 font-medium font-mono">
                          {formatDirectoryTime(item.last_activity_at)}
                        </span>
                      </div>

                      {/* Channel snippet */}
                      <div className="flex items-center gap-1.5 mt-1 text-slate-500 dark:text-slate-400 text-[11px] truncate">
                        {item.last_channel === 'whatsapp' && (
                          <MessageSquare className="h-3 w-3 text-emerald-500 shrink-0" />
                        )}
                        {item.last_channel === 'email' && (
                          <Mail className="h-3 w-3 text-sky-500 shrink-0" />
                        )}
                        {item.last_channel === 'call' && (
                          <Phone className="h-3 w-3 text-purple-500 shrink-0" />
                        )}
                        <span className="truncate">{item.last_description || 'Active interaction'}</span>
                      </div>
                    </div>

                    {/* Unread Pill Badge */}
                    {unreadCount > 0 && (
                      <div className="shrink-0">
                        <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-purple-600 text-white text-[10px] font-bold shadow-2xs">
                          {unreadCount}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────────────── */}
        {/* PANEL 2: CUSTOMER 360° WORKSPACE & TIMELINE (CENTER FLEX)               */}
        {/* ─────────────────────────────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 min-h-0 flex flex-col h-full bg-slate-50 dark:bg-slate-950 overflow-hidden">
          {timelineData ? (
            <>
              {/* 1. CUSTOMER IDENTITY HEADER & QUICK ACTIONS */}
              <div className="bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 px-6 py-4 shrink-0 shadow-2xs">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  {/* Avatar & Contact Info */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-12 h-12 shrink-0 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-violet-600 text-white font-extrabold flex items-center justify-center text-base shadow-sm shadow-purple-500/25">
                      {timelineData.lead.name?.slice(0, 2).toUpperCase() || 'CU'}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h2 className="text-lg font-extrabold text-slate-900 dark:text-white truncate tracking-tight">
                          {timelineData.lead.name}
                        </h2>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300/70">
                          {timelineData.lead.status || 'Active Customer'}
                        </span>
                      </div>

                      <div className="flex items-center gap-3.5 text-xs text-slate-500 dark:text-slate-400 mt-1 flex-wrap font-medium">
                        {timelineData.lead.phone && (
                          <span className="flex items-center gap-1.5 font-mono text-slate-700 dark:text-slate-300">
                            <Phone className="h-3 w-3 text-purple-500" />
                            {timelineData.lead.phone}
                          </span>
                        )}
                        {timelineData.lead.email && (
                          <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                            <Mail className="h-3 w-3 text-sky-500" />
                            {timelineData.lead.email}
                          </span>
                        )}
                        {timelineData.lead.company_name && (
                          <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 font-medium">
                            <Building2 className="h-3 w-3 text-slate-400" />
                            {timelineData.lead.company_name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Clean Cohesive Quick Actions */}
                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    <button
                      onClick={() => setReplyChannel('call')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-purple-300 hover:text-purple-600 dark:hover:border-purple-600 transition-all shadow-2xs cursor-pointer"
                    >
                      <Phone className="h-3.5 w-3.5 text-purple-600" />
                      <span>Call</span>
                    </button>

                    <button
                      onClick={() => setReplyChannel('whatsapp')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-emerald-300 hover:text-emerald-600 dark:hover:border-emerald-600 transition-all shadow-2xs cursor-pointer"
                    >
                      <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
                      <span>WhatsApp</span>
                    </button>

                    <button
                      onClick={() => setReplyChannel('email')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-sky-300 hover:text-sky-600 dark:hover:border-sky-600 transition-all shadow-2xs cursor-pointer"
                    >
                      <Mail className="h-3.5 w-3.5 text-sky-600" />
                      <span>Email</span>
                    </button>

                    <button
                      onClick={() => window.open('https://meet.google.com/new', '_blank')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-indigo-300 hover:text-indigo-600 dark:hover:border-indigo-600 transition-all shadow-2xs cursor-pointer"
                    >
                      <Calendar className="h-3.5 w-3.5 text-indigo-600" />
                      <span>Schedule Meeting</span>
                    </button>
                  </div>
                </div>

                {/* 2. MODERN LIVE CHANNEL FILTER TABS WITH COUNTERS (NO TEXT TRUNCATION) */}
                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 overflow-x-auto [scrollbar-width:none]">
                  {[
                    { key: 'all', label: 'All Interactions', count: timelineData.stats.total, icon: Clock, color: 'text-purple-600' },
                    { key: 'whatsapp', label: 'WhatsApp', count: timelineData.stats.whatsapp, icon: MessageSquare, color: 'text-emerald-500' },
                    { key: 'email', label: 'Email', count: timelineData.stats.email, icon: Mail, color: 'text-sky-500' },
                    { key: 'call', label: 'Voice Calls', count: timelineData.stats.call, icon: Phone, color: 'text-violet-500' },
                    { key: 'meeting', label: 'Meetings', count: timelineData.stats.meeting || 0, icon: Calendar, color: 'text-indigo-500' },
                    { key: 'interview', label: 'Interviews', count: timelineData.stats.interview || 0, icon: Briefcase, color: 'text-amber-500' },
                  ].map((tab) => {
                    const Icon = tab.icon;
                    const isActive = channelFilterTab === tab.key;
                    return (
                      <button
                        key={tab.key}
                        onClick={() => setChannelFilterTab(tab.key as any)}
                        className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                          isActive
                            ? 'bg-purple-600 text-white shadow-xs font-bold'
                            : 'bg-slate-100/80 hover:bg-slate-200/70 dark:bg-slate-800/80 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-white' : tab.color}`} />
                        <span>{tab.label}</span>
                        <span
                          className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                            isActive
                              ? 'bg-purple-700/80 text-white'
                              : 'bg-slate-200/90 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                          }`}
                        >
                          {tab.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4. CHRONOLOGICAL TIMELINE STREAM */}
              <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 [scrollbar-width:thin] space-y-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-purple-600" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    Communication Timeline
                  </h3>
                </div>

                {Object.keys(groupedTimeline).length === 0 ? (
                  <div className="p-12 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <MessageSquare className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                    <p className="text-xs font-semibold">No communications logged for this filter</p>
                  </div>
                ) : (
                  Object.entries(groupedTimeline).map(([dateLabel, items]) => (
                    <div key={dateLabel} className="space-y-4">
                      {/* Sticky Date Header */}
                      <div className="inline-block px-3 py-1 rounded-full bg-slate-200/80 dark:bg-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-300 shadow-2xs">
                        {dateLabel}
                      </div>

                      {/* Timeline Events in Date Group */}
                      <div className="space-y-3 relative">
                        {items.map((item) => {
                          const isHighlighted = highlightedEventId === item.id;

                          return (
                            <div
                              key={item.id}
                              ref={(el) => {
                                eventCardRefs.current[item.id] = el;
                              }}
                              className="flex items-center gap-3 group"
                            >
                              {/* Left Track Dot + Timestamp */}
                              <div className="w-20 shrink-0 flex items-center gap-2 text-slate-400 group-hover:text-purple-600 transition-colors">
                                <span className="w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-600 group-hover:bg-purple-600 ring-2 ring-white dark:ring-slate-950 transition-colors shrink-0" />
                                <span className="text-[11px] font-mono font-medium">{formatTime(item.occurred_at)}</span>
                              </div>

                              {/* Sleek Event Card (Click opens Full Detail Drawer) */}
                              <div
                                onClick={() => setSelectedDrawerEvent(item)}
                                className={`flex-1 rounded-2xl bg-white dark:bg-slate-900 border transition-all cursor-pointer shadow-xs hover:shadow-md ${
                                  isHighlighted
                                    ? 'ring-4 ring-purple-500/40 border-purple-500 bg-purple-50/20'
                                    : 'border-slate-200 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-700'
                                }`}
                              >
                                <div className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                  <div className="flex items-center gap-3 min-w-0">
                                    {/* Channel Icon Badge */}
                                    <div
                                      className={`w-9 h-9 rounded-full flex items-center justify-center text-white shrink-0 shadow-2xs ${
                                        item.channel === 'whatsapp'
                                          ? 'bg-emerald-500'
                                          : item.channel === 'email'
                                          ? 'bg-sky-500'
                                          : item.channel === 'call'
                                          ? 'bg-purple-500'
                                          : item.channel === 'meeting'
                                          ? 'bg-purple-600'
                                          : 'bg-rose-500'
                                      }`}
                                    >
                                      {item.channel === 'whatsapp' && <MessageSquare className="h-4 w-4" />}
                                      {item.channel === 'email' && <Mail className="h-4 w-4" />}
                                      {item.channel === 'call' && <Phone className="h-4 w-4" />}
                                      {item.channel === 'meeting' && <Calendar className="h-4 w-4" />}
                                      {item.channel === 'interview' && <Users className="h-4 w-4" />}
                                    </div>

                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-slate-900 dark:text-white capitalize">
                                          {item.channel === 'whatsapp'
                                            ? `WhatsApp — ${item.direction === 'inbound' ? 'Inbound' : 'Outbound'}`
                                            : item.channel === 'email'
                                            ? `Email — ${item.direction === 'inbound' ? 'Inbound' : 'Outbound'}`
                                            : item.channel === 'call'
                                            ? `Call — ${item.direction === 'inbound' ? 'Inbound' : 'Outbound'}`
                                            : item.channel === 'meeting'
                                            ? 'Demo Meeting — Completed'
                                            : 'Interview — Completed'}
                                        </span>
                                      </div>
                                      <p className="text-xs text-slate-600 dark:text-slate-300 truncate mt-0.5">
                                        {item.description}
                                      </p>
                                    </div>
                                  </div>

                                  {/* Right Status / Audio Playback Badges */}
                                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                                    {item.channel === 'whatsapp' && (
                                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                                        ✓✓ Read
                                      </span>
                                    )}
                                    {item.channel === 'email' && (
                                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-300">
                                        Opened
                                      </span>
                                    )}
                                    {item.channel === 'meeting' && (
                                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300 flex items-center gap-1">
                                        <Users className="h-3 w-3" />
                                        45 min
                                      </span>
                                    )}
                                    {item.channel === 'call' && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          togglePlayAudio(
                                            item.id,
                                            item.recording_url || undefined,
                                            item.content?.transcript || item.description
                                          );
                                        }}
                                        className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                                          playingAudioId === item.id
                                            ? 'bg-purple-600 text-white shadow-xs'
                                            : 'bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200/70 dark:border-purple-800/70'
                                        }`}
                                      >
                                        {playingAudioId === item.id ? (
                                          <Pause className="h-3 w-3 text-white" />
                                        ) : (
                                          <Play className="h-3 w-3 text-purple-600 fill-purple-600" />
                                        )}
                                        <span>
                                          {item.duration && item.duration > 0
                                            ? formatDuration(item.duration)
                                            : 'Dialogue Audio'}
                                        </span>
                                        {item.duration && item.duration > 0 && (
                                          <div className="flex items-center gap-0.5 ml-0.5">
                                            <span className="w-0.5 h-2.5 bg-purple-400 rounded-full" />
                                            <span className="w-0.5 h-3.5 bg-purple-500 rounded-full" />
                                            <span className="w-0.5 h-2 bg-purple-400 rounded-full" />
                                          </div>
                                        )}
                                      </button>
                                    )}
                                    {item.channel === 'interview' && (
                                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                                        Met
                                      </span>
                                    )}

                                    <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-purple-600 transition-colors" />
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-400">
              <Users className="h-12 w-12 text-slate-300 dark:text-slate-700 mb-2" />
              <p className="text-sm font-semibold">Select a customer to view their 360° timeline</p>
            </div>
          )}
        </div>

        {/* ─────────────────────────────────────────────────────────────────────── */}
        {/* PANEL 3: AI CUSTOMER INTELLIGENCE & COPILOT (RIGHT COMPACT 280-320PX)   */}
        {/* ─────────────────────────────────────────────────────────────────────── */}
        {showRightPanel && (
          <div className="w-72 xl:w-80 shrink-0 bg-white dark:bg-slate-900 border-l border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 overflow-y-auto [scrollbar-width:thin] space-y-5 min-h-0">
            {/* Card 1: AI Deal Intelligence Summary */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                <Sparkles className="h-4 w-4 text-purple-600" />
                <span>AI Conversation Summary</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-purple-50/70 via-indigo-50/40 to-slate-50 dark:from-purple-950/40 dark:via-indigo-950/30 dark:to-slate-900 border border-purple-200/60 dark:border-purple-800/50 text-xs text-slate-700 dark:text-slate-200 leading-relaxed font-medium shadow-2xs">
                {timelineData?.insights?.conversation_ended_summary ||
                  `${timelineData?.lead?.name || 'The customer'} is actively engaging across communication channels. Latest discussion resolved inquiries with ${timelineData?.stats?.total || 0} total touchpoints logged.`}
              </div>
            </div>

            {/* Card 2: Customer Journey (Vertical Milestone Stepper) */}
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                <ArrowRight className="h-4 w-4 text-purple-600" />
                <span>Customer Journey</span>
              </div>

              <div className="space-y-3 relative pl-5 border-l-2 border-emerald-500/80 ml-3">
                {dynamicJourneyMilestones.map((milestone) => {
                  const isCompleted = milestone.status === 'completed';
                  return (
                    <div
                      key={milestone.id}
                      onClick={() => milestone.eventId && handleScrollToMilestone(milestone.eventId)}
                      className={`space-y-0.5 ${milestone.eventId ? 'cursor-pointer group' : ''}`}
                    >
                      <div className="flex items-center gap-2">
                        {isCompleted ? (
                          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 -ml-[25.5px] ring-4 ring-white dark:ring-slate-900 group-hover:scale-125 transition-transform shrink-0" />
                        ) : (
                          <div className="w-2.5 h-2.5 rounded-full border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 -ml-[25.5px] shrink-0" />
                        )}
                        <span
                          className={`text-xs font-bold transition-colors truncate ${
                            isCompleted
                              ? 'text-slate-900 dark:text-white group-hover:text-purple-600'
                              : 'text-slate-500'
                          }`}
                        >
                          {milestone.title}
                        </span>
                      </div>
                      <p
                        className={`text-[10px] pl-2 ${
                          isCompleted
                            ? 'text-slate-400 font-mono'
                            : 'text-amber-600 font-semibold'
                        }`}
                      >
                        {milestone.dateStr}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Card 3: Next Best Action & 1-Click CTA */}
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                <CheckCircle2 className="h-4 w-4 text-purple-600" />
                <span>Next Best Action</span>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 shadow-2xs space-y-3">
                <p className="text-xs text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
                  {timelineData?.insights?.next_step?.action ||
                    'Share pricing proposal and onboarding timeline.'}
                </p>

                <button
                  type="button"
                  onClick={handleApplyNextBestAction}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  <span>Create Follow-up</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── INTERACTION DETAIL DRAWER (WHATSAPP, EMAIL, CALL, MEETING, INTERVIEW) ── */}
      {selectedDrawerEvent && (
        <ChannelInteractionDetailDrawer
          eventId={selectedDrawerEvent.id}
          channel={selectedDrawerEvent.channel}
          customerName={timelineData?.lead?.name}
          customerPhone={timelineData?.lead?.phone}
          customerEmail={timelineData?.lead?.email}
          initialItem={selectedDrawerEvent}
          onClose={() => setSelectedDrawerEvent(null)}
        />
      )}
    </div>
  );
};

