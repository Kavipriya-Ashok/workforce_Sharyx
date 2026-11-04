import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  ArrowLeft,
  MessageSquare,
  Mail,
  Phone,
  PhoneCall,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Send,
  Play,
  Pause,
  Download,
  Paperclip,
  CheckCheck,
  Building2,
  Calendar,
  User,
  Users,
  Video,
  ExternalLink,
  RefreshCw,
  Copy,
  Check,
  Radio,
  FileText,
  ArrowUpDown,
  Filter,
  Search,
  CheckCircle2,
  CornerDownRight,
  ShieldCheck,
  Sparkle,
} from 'lucide-react';
import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns';
import { toast } from 'sonner';
import { omnichannelService } from '@/service/omnichannelService';
import {
  LeadTimelineResponse,
  OmnichannelCommunicationItem,
  OmnichannelChannel,
  OmnichannelDealInsights,
} from '@/types/omnichannel';

interface LeadDetailPageProps {
  leadId: string;
  onBack: () => void;
}

export const LeadDetailPage: React.FC<LeadDetailPageProps> = ({ leadId, onBack }) => {
  const [data, setData] = useState<LeadTimelineResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Time Series Constraints & Filters
  const [channelFilter, setChannelFilter] = useState<
    'all' | 'whatsapp' | 'email' | 'call' | 'meeting' | 'interview'
  >('all');
  const [directionFilter, setDirectionFilter] = useState<'all' | 'inbound' | 'outbound'>('all');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc'); // 'desc' = Newest first, 'asc' = Chronological Journey
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Expand / Collapse state
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  const [allExpanded, setAllExpanded] = useState<boolean>(true);

  // Audio player state with live scrubber
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [audioProgress, setAudioProgress] = useState<number>(0);
  const [audioCurrentTime, setAudioCurrentTime] = useState<number>(0);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Reply Composer State
  const [replyChannel, setReplyChannel] = useState<'whatsapp' | 'email' | 'call'>('whatsapp');
  const [replyBody, setReplyBody] = useState<string>('');
  const [replySubject, setReplySubject] = useState<string>('');
  const [sending, setSending] = useState<boolean>(false);
  const composerInputRef = useRef<HTMLTextAreaElement | null>(null);

  // Real-time sync tracker
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Card element refs for journey stepper navigation
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Fetch timeline data from server
  const fetchTimeline = useCallback(
    async (quiet = false) => {
      try {
        if (!quiet) setLoading(true);
        const res = await omnichannelService.getLeadTimeline(leadId, channelFilter);
        setData(res);
        setLastSyncTime(new Date());

        // Auto-expand all items on load
        setExpandedCards((prev) => {
          const next = { ...prev };
          res.timeline.forEach((item) => {
            if (next[item.id] === undefined) {
              next[item.id] = true;
            }
          });
          return next;
        });
      } catch (err: any) {
        if (!quiet) {
          toast.error('Failed to load lead timeline: ' + (err.message || 'Error'));
        }
      } finally {
        if (!quiet) setLoading(false);
      }
    },
    [leadId, channelFilter]
  );

  // Initial fetch on mount or channel filter change
  useEffect(() => {
    fetchTimeline();
  }, [fetchTimeline]);

  // LIVE REAL-TIME SSE SUBSCRIPTION + AUTOMATIC FALLBACK POLLING
  useEffect(() => {
    // 1. Subscribe to SSE real-time stream
    const unsubscribe = omnichannelService.subscribeToStream(
      (event) => {
        const eventLeadId = event.lead_id || event.data?.lead_id || event.communication?.lead_id;
        if (!eventLeadId || eventLeadId === leadId) {
          fetchTimeline(true);
        }
      },
      () => {
        // SSE error handled silently
      }
    );

    // 2. Fallback polling every 4 seconds to guarantee 100% live updates
    const pollInterval = setInterval(() => {
      fetchTimeline(true);
    }, 4000);

    return () => {
      unsubscribe();
      clearInterval(pollInterval);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [leadId, fetchTimeline]);

  // Filter and Sort Time Series with All Constraints
  const processedTimeline = useMemo(() => {
    if (!data?.timeline) return [];

    let items = [...data.timeline];

    // 1. Direction Filter
    if (directionFilter !== 'all') {
      items = items.filter((item) => item.direction === directionFilter);
    }

    // 2. Search Query filter (matches description, body, subject, transcript)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      items = items.filter((item) => {
        const descMatch = item.description?.toLowerCase().includes(q);
        const bodyMatch = item.content?.body?.toLowerCase().includes(q);
        const subjectMatch = item.content?.subject?.toLowerCase().includes(q);
        const transcriptMatch = item.content?.transcript?.toLowerCase().includes(q);
        const aiMatch = item.content?.ai_summary?.toLowerCase().includes(q);
        return descMatch || bodyMatch || subjectMatch || transcriptMatch || aiMatch;
      });
    }

    // 3. Chronological Time Series Sorting
    items.sort((a, b) => {
      const timeA = new Date(a.occurred_at).getTime();
      const timeB = new Date(b.occurred_at).getTime();
      return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
    });

    return items;
  }, [data?.timeline, directionFilter, searchQuery, sortOrder]);

  // Chronological Journey Milestones for Stepper Map (Always in chronological order 1 -> N)
  const journeyMilestones = useMemo(() => {
    if (!data?.timeline) return [];
    return [...data.timeline].sort(
      (a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime()
    );
  }, [data?.timeline]);

  // Grouped by Date for Clean Time Series Display
  const groupedTimeline = useMemo(() => {
    const groups: { dateLabel: string; items: OmnichannelCommunicationItem[] }[] = [];

    processedTimeline.forEach((item) => {
      const date = new Date(item.occurred_at);
      let label = format(date, 'EEEE, MMMM d, yyyy');
      if (isToday(date)) {
        label = `Today • ${format(date, 'MMMM d, yyyy')}`;
      } else if (isYesterday(date)) {
        label = `Yesterday • ${format(date, 'MMMM d, yyyy')}`;
      }

      const existingGroup = groups.find((g) => g.dateLabel === label);
      if (existingGroup) {
        existingGroup.items.push(item);
      } else {
        groups.push({ dateLabel: label, items: [item] });
      }
    });

    return groups;
  }, [processedTimeline]);

  // Expand / Collapse Single Card
  const toggleExpand = (id: string) => {
    setExpandedCards((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Expand / Collapse All Cards
  const toggleAllExpanded = () => {
    const nextState = !allExpanded;
    setAllExpanded(nextState);
    if (data?.timeline) {
      const updated: Record<string, boolean> = {};
      data.timeline.forEach((item) => {
        updated[item.id] = nextState;
      });
      setExpandedCards(updated);
    }
  };

  // Scroll to milestone card
  const scrollToMilestone = (id: string) => {
    setExpandedCards((prev) => ({ ...prev, [id]: true }));
    const element = cardRefs.current[id];
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.classList.add('ring-4', 'ring-blue-500/40');
      setTimeout(() => {
        element.classList.remove('ring-4', 'ring-blue-500/40');
      }, 2000);
    }
  };

  // Audio Playback Controls with Live Scrubber
  const toggleAudio = (id: string, url?: string | null) => {
    if (!url) {
      toast.info('No audio recording sample available for this call');
      return;
    }

    if (playingAudioId === id) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setPlayingAudioId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const audio = new Audio(url);
      audioRef.current = audio;
      setPlayingAudioId(id);
      setAudioProgress(0);
      setAudioCurrentTime(0);

      audio.onloadedmetadata = () => {
        setAudioDuration(audio.duration || 0);
      };

      audio.ontimeupdate = () => {
        if (audio.duration) {
          setAudioCurrentTime(audio.currentTime);
          setAudioProgress((audio.currentTime / audio.duration) * 100);
        }
      };

      audio.onended = () => {
        setPlayingAudioId(null);
        setAudioProgress(0);
        setAudioCurrentTime(0);
      };

      audio.play().catch(() => {
        toast.error('Unable to stream call audio recording');
        setPlayingAudioId(null);
      });
    }
  };

  // Scrubber Seek
  const handleSeekAudio = (e: React.ChangeEvent<HTMLInputElement>) => {
    const seekPercentage = parseFloat(e.target.value);
    if (audioRef.current && audioRef.current.duration) {
      const newTime = (seekPercentage / 100) * audioRef.current.duration;
      audioRef.current.currentTime = newTime;
      setAudioProgress(seekPercentage);
      setAudioCurrentTime(newTime);
    }
  };

  // Copy to clipboard
  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Send Reply with Instant Optimistic UI Injection
  const handleSendReply = async () => {
    if (!replyBody.trim()) {
      toast.warning('Please enter a message body or call notes');
      return;
    }
    if (replyChannel === 'email' && !replySubject.trim()) {
      toast.warning('Please provide an email subject line');
      return;
    }

    const outgoingBody = replyBody.trim();
    const outgoingSubject = replySubject.trim();
    const tempId = `optimistic-${Date.now()}`;

    // Optimistic item shown immediately in time series
    const optimisticItem: OmnichannelCommunicationItem = {
      id: tempId,
      lead_id: leadId,
      channel: replyChannel,
      direction: 'outbound',
      description:
        replyChannel === 'email'
          ? `${outgoingSubject}: ${outgoingBody}`
          : replyChannel === 'call'
          ? `Logged call notes: ${outgoingBody}`
          : outgoingBody,
      content: {
        body: outgoingBody,
        subject: replyChannel === 'email' ? outgoingSubject : undefined,
        to: replyChannel === 'email' ? data?.lead.email : data?.lead.phone,
        from: replyChannel === 'email' ? 'sales@sharyx.ai' : 'You (Agent)',
        thread_replies: [
          {
            sender: 'You (Agent)',
            body: outgoingBody,
            timestamp: new Date().toISOString(),
          },
        ],
      },
      duration: replyChannel === 'call' ? 60 : null,
      recording_url: null,
      occurred_at: new Date().toISOString(),
      status: 'delivered',
    };

    // 1. Immediately inject into timeline
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        stats: {
          ...prev.stats,
          total: prev.stats.total + 1,
          [replyChannel]: prev.stats[replyChannel] + 1,
        },
        timeline: [optimisticItem, ...prev.timeline],
      };
    });

    setExpandedCards((prev) => ({ ...prev, [tempId]: true }));
    setReplyBody('');
    setReplySubject('');

    try {
      setSending(true);
      await omnichannelService.sendLeadReply(leadId, {
        channel: replyChannel,
        body: outgoingBody,
        subject: replyChannel === 'email' ? outgoingSubject : undefined,
      });

      toast.success(
        `Dispatched reply on ${replyChannel.toUpperCase()} to ${data?.lead.name || 'lead'}!`
      );
      await fetchTimeline(true);
    } catch (err: any) {
      toast.error('Failed to dispatch reply: ' + (err.message || 'Error'));
      await fetchTimeline(true);
    } finally {
      setSending(false);
    }
  };

  const quickSwitchChannel = (channel: 'whatsapp' | 'email' | 'call') => {
    setReplyChannel(channel);
    setTimeout(() => {
      composerInputRef.current?.focus();
    }, 100);
  };

  const handleApplyNextStep = (insights: OmnichannelDealInsights) => {
    const ch = (insights.next_step.recommended_channel === 'whatsapp' || insights.next_step.recommended_channel === 'call')
      ? insights.next_step.recommended_channel
      : 'email';
    setReplyChannel(ch);
    if (insights.next_step.recommended_channel === 'email') {
      setReplySubject(
        `Re: Official 50% Advance Invoice & Payment Link - ${
          data?.lead.company_name || data?.lead.name
        }`
      );
    }
    setReplyBody(insights.next_step.suggested_reply);
    toast.success(
      `Applied AI recommended ${insights.next_step.recommended_channel.toUpperCase()} response into reply box!`
    );
    setTimeout(() => {
      composerInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      composerInputRef.current?.focus();
    }, 150);
  };

  const formatOccurredTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return {
        formatted: format(date, 'MMM d, yyyy • h:mm a'),
        timeOnly: format(date, 'h:mm a'),
        relative: formatDistanceToNow(date, { addSuffix: true }),
      };
    } catch {
      return { formatted: isoString, timeOnly: isoString, relative: '' };
    }
  };

  const formatDuration = (secs?: number | null) => {
    if (!secs) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const getChannelBadge = (channel: OmnichannelChannel) => {
    switch (channel) {
      case 'whatsapp':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-800 shadow-2xs">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <MessageSquare className="h-3.5 w-3.5" />
            WhatsApp
          </span>
        );
      case 'email':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-300 border border-sky-300/80 dark:border-sky-800 shadow-2xs">
            <span className="h-2 w-2 rounded-full bg-sky-500" />
            <Mail className="h-3.5 w-3.5" />
            Email
          </span>
        );
      case 'call':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300/80 dark:border-amber-800 shadow-2xs">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            <PhoneCall className="h-3.5 w-3.5" />
            Voice Call
          </span>
        );
      case 'meeting':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300 border border-purple-300/80 dark:border-purple-800 shadow-2xs">
            <span className="h-2 w-2 rounded-full bg-purple-500 animate-pulse" />
            <Calendar className="h-3.5 w-3.5" />
            Demo Meeting
          </span>
        );
      case 'interview':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300/80 dark:border-rose-800 shadow-2xs">
            <span className="h-2 w-2 rounded-full bg-rose-500" />
            <Users className="h-3.5 w-3.5" />
            Interview
          </span>
        );
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-100 dark:bg-slate-950 overflow-hidden font-sans">
      {/* 1. TOP HEADER BAR: LEAD PROFILE & LIVE SYNC METRICS */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 shrink-0 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Lead Identity Details */}
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-xs font-semibold shadow-2xs cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Leads</span>
            </button>

            <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />

            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 text-white font-bold text-base flex items-center justify-center uppercase shadow-md shadow-blue-500/20 shrink-0">
                {data?.lead.name ? data.lead.name.slice(0, 2) : 'LD'}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-bold text-slate-900 dark:text-white">
                    {data?.lead.name || 'Loading Lead...'}
                  </h1>
                  {data?.lead.status && (
                    <span className="text-[10px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                      {data.lead.status}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {data?.lead.phone && (
                    <span className="flex items-center gap-1 font-mono font-medium text-slate-700 dark:text-slate-300">
                      <Phone className="h-3 w-3 text-slate-400" />
                      {data.lead.phone}
                    </span>
                  )}
                  {data?.lead.email && (
                    <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                      <Mail className="h-3 w-3 text-slate-400" />
                      {data.lead.email}
                    </span>
                  )}
                  {data?.lead.company_name && (
                    <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400 font-medium">
                      <Building2 className="h-3 w-3 text-slate-400" />
                      {data.lead.company_name}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Live Sync Status & Fast Channel Dispatch Shortcuts */}
          <div className="flex items-center flex-wrap gap-2.5">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 shadow-2xs">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
              <span>Live Sync Active</span>
            </div>

            <button
              onClick={() => quickSwitchChannel('whatsapp')}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold hover:bg-emerald-100 dark:hover:bg-emerald-900 transition-colors shadow-2xs cursor-pointer"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span>WhatsApp</span>
            </button>

            <button
              onClick={() => quickSwitchChannel('email')}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 text-xs font-semibold hover:bg-sky-100 dark:hover:bg-sky-900 transition-colors shadow-2xs cursor-pointer"
            >
              <Mail className="h-3.5 w-3.5" />
              <span>Email</span>
            </button>

            <button
              onClick={() => quickSwitchChannel('call')}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-xs font-semibold hover:bg-amber-100 dark:hover:bg-amber-900 transition-colors shadow-2xs cursor-pointer"
            >
              <PhoneCall className="h-3.5 w-3.5" />
              <span>Log Call</span>
            </button>

            <button
              onClick={() => fetchTimeline()}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-2xs cursor-pointer"
              title="Force sync latest timeline"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
            </button>
          </div>
        </div>

        {/* 2. OMNICHANNEL TIME SERIES JOURNEY MAP (HORIZONTAL STEPPER) */}
        {journeyMilestones.length > 0 && (
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5 text-blue-500" />
                Customer Journey Flow ({journeyMilestones.length} Touchpoints across Channels)
              </span>
              <span className="text-[11px] text-slate-400">
                Click any milestone to jump directly to its card
              </span>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-2 [scrollbar-width:thin]">
              {journeyMilestones.map((m, idx) => {
                const timeInfo = formatOccurredTime(m.occurred_at);
                const isWa = m.channel === 'whatsapp';
                const isMail = m.channel === 'email';

                return (
                  <button
                    key={m.id}
                    onClick={() => scrollToMilestone(m.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium whitespace-nowrap transition-all shadow-2xs hover:scale-102 cursor-pointer ${
                      isWa
                        ? 'border-emerald-200 bg-emerald-50/70 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-200'
                        : isMail
                        ? 'border-sky-200 bg-sky-50/70 text-sky-900 dark:bg-sky-950/40 dark:border-sky-800 dark:text-sky-200'
                        : 'border-amber-200 bg-amber-50/70 text-amber-900 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-200'
                    }`}
                  >
                    <span className="font-bold text-[10px] px-1.5 py-0.2 rounded-md bg-white/80 dark:bg-black/40">
                      Step {idx + 1}
                    </span>
                    {isWa ? (
                      <MessageSquare className="h-3 w-3 text-emerald-600" />
                    ) : isMail ? (
                      <Mail className="h-3 w-3 text-sky-600" />
                    ) : (
                      <PhoneCall className="h-3 w-3 text-amber-600" />
                    )}
                    <span className="font-semibold capitalize">{m.channel}</span>
                    <span className="opacity-60 text-[10px]">{timeInfo.timeOnly}</span>
                    {idx < journeyMilestones.length - 1 && (
                      <span className="text-slate-300 dark:text-slate-700 ml-1">➔</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. TIME SERIES CONSTRAINTS & FILTER CONTROLS BAR */}
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Channel Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            <button
              onClick={() => setChannelFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                channelFilter === 'all'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              All Channels ({data?.stats.total || 0})
            </button>

            <button
              onClick={() => setChannelFilter('whatsapp')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                channelFilter === 'whatsapp'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50'
              }`}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              WhatsApp ({data?.stats.whatsapp || 0})
            </button>

            <button
              onClick={() => setChannelFilter('email')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                channelFilter === 'email'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-sky-700 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/50'
              }`}
            >
              <Mail className="h-3.5 w-3.5" />
              Email ({data?.stats.email || 0})
            </button>

            <button
              onClick={() => setChannelFilter('call')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                channelFilter === 'call'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/50'
              }`}
            >
              <PhoneCall className="h-3.5 w-3.5" />
              Voice Call ({data?.stats.call || 0})
            </button>

            <button
              onClick={() => setChannelFilter('meeting')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                channelFilter === 'meeting'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-purple-700 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/50'
              }`}
            >
              <Calendar className="h-3.5 w-3.5" />
              Demo Meeting ({data?.stats.meeting || 0})
            </button>

            <button
              onClick={() => setChannelFilter('interview')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                channelFilter === 'interview'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50'
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              Interview ({data?.stats.interview || 0})
            </button>
          </div>

          {/* Time Series Modifiers: Direction, Chronological Sort, Expand All */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Direction Filter */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
              <button
                onClick={() => setDirectionFilter('all')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  directionFilter === 'all'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setDirectionFilter('inbound')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  directionFilter === 'inbound'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                📥 Inbound
              </button>
              <button
                onClick={() => setDirectionFilter('outbound')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  directionFilter === 'outbound'
                    ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                📤 Outbound
              </button>
            </div>

            {/* Time Series Sort Order Toggle */}
            <button
              onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-2xs cursor-pointer"
              title="Toggle timeline sorting order"
            >
              <ArrowUpDown className="h-3.5 w-3.5 text-blue-500" />
              <span>{sortOrder === 'desc' ? 'Newest First' : 'Chronological (Oldest First)'}</span>
            </button>

            {/* Expand / Collapse All Toggle */}
            <button
              onClick={toggleAllExpanded}
              className="text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer px-2"
            >
              {allExpanded ? 'Collapse All' : 'Expand All'}
            </button>
          </div>
        </div>
      </div>

      {/* 4. MAIN TIME SERIES TIMELINE BODY */}
      <div className="flex-1 overflow-y-auto px-6 py-6 [scrollbar-width:thin]">
        <div className="max-w-4xl mx-auto space-y-6">
          {loading && !data ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="rounded-2xl bg-white dark:bg-slate-900 p-6 border border-slate-200 dark:border-slate-800 animate-pulse space-y-3"
                >
                  <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded" />
                  <div className="h-6 w-3/4 bg-slate-100 dark:bg-slate-800/60 rounded" />
                  <div className="h-16 w-full bg-slate-50 dark:bg-slate-800/40 rounded-xl" />
                </div>
              ))}
            </div>
          ) : groupedTimeline.length === 0 ? (
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-12 text-center shadow-xs">
              <Sparkles className="h-10 w-10 text-slate-400 mx-auto mb-3 opacity-60" />
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                No Communications Found
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
                No activity matches your active time series filters. Switch channel tabs, adjust
                direction filters, or type a reply below to log a new touchpoint.
              </p>
            </div>
          ) : (
            groupedTimeline.map((group, gIdx) => (
              <div key={gIdx} className="space-y-4">
                {/* Date Group Banner */}
                <div className="sticky top-0 z-10 flex items-center justify-center my-2">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-200/80 dark:bg-slate-800/80 backdrop-blur-md border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-xs">
                    <Calendar className="h-3.5 w-3.5 text-blue-500" />
                    <span>{group.dateLabel}</span>
                  </div>
                </div>

                {/* Timeline Line & Cards */}
                <div className="relative pl-6 sm:pl-8 space-y-6 before:content-[''] before:absolute before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-300 dark:before:bg-slate-800">
                  {group.items.map((item, index) => {
                    const isExpanded = expandedCards[item.id] !== false; // default open
                    const timeInfo = formatOccurredTime(item.occurred_at);

                    // Collect thread replies for WhatsApp or Email
                    const rawReplies = item.content?.thread_replies || [];
                    const hasReplies = rawReplies.length > 0;

                    return (
                      <div
                        key={item.id}
                        ref={(el) => {
                          cardRefs.current[item.id] = el;
                        }}
                        className="relative group transition-all"
                      >
                        {/* Visual Dot on Timeline */}
                        <div
                          className={`absolute -left-6 sm:-left-8 top-5 h-4 w-4 rounded-full border-2 border-white dark:border-slate-950 shadow-xs flex items-center justify-center transition-transform group-hover:scale-125 ${
                            item.channel === 'whatsapp'
                              ? 'bg-emerald-500 ring-4 ring-emerald-500/20'
                              : item.channel === 'email'
                              ? 'bg-sky-500 ring-4 ring-sky-500/20'
                              : item.channel === 'call'
                              ? 'bg-amber-500 ring-4 ring-amber-500/20'
                              : item.channel === 'meeting'
                              ? 'bg-purple-500 ring-4 ring-purple-500/20'
                              : 'bg-rose-500 ring-4 ring-rose-500/20'
                          }`}
                        />

                        {/* Timeline Card */}
                        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md transition-all overflow-hidden">
                          {/* CARD HEADER */}
                          <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-850/50">
                            <div className="flex flex-wrap items-center gap-2.5">
                              {getChannelBadge(item.channel)}

                              <span
                                className={`text-[11px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                                  item.direction === 'inbound'
                                    ? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                                    : 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                }`}
                              >
                                {item.direction === 'inbound' ? '📥 Incoming' : '📤 Outgoing'}
                              </span>

                              <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">
                                •
                              </span>

                              <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 font-medium font-mono">
                                <Clock className="h-3.5 w-3.5 text-slate-400" />
                                {timeInfo.formatted}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 self-end sm:self-auto">
                              {item.status && (
                                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full capitalize bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                  {item.status}
                                </span>
                              )}

                              <button
                                onClick={() => toggleExpand(item.id)}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                              >
                                <span>{isExpanded ? 'Hide Details' : 'View Details'}</span>
                                {isExpanded ? (
                                  <ChevronUp className="h-3.5 w-3.5" />
                                ) : (
                                  <ChevronDown className="h-3.5 w-3.5" />
                                )}
                              </button>
                            </div>
                          </div>

                          {/* CARD DESCRIPTION SUMMARY */}
                          <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-50/90 to-blue-50/20 dark:from-slate-900 dark:to-blue-950/20">
                            <div className="flex items-start gap-2.5">
                              <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 shrink-0 mt-0.5">
                                Summary
                              </span>
                              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-relaxed">
                                {item.description}
                              </p>
                            </div>
                          </div>

                          {/* EXPANDABLE FULL DETAILS FOR EVERY CHANNEL */}
                          {isExpanded && (
                            <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
                              {/* 1. WHATSAPP DETAILED THREAD */}
                              {item.channel === 'whatsapp' && (
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                                      <MessageSquare className="h-3.5 w-3.5 text-emerald-500" />
                                      WhatsApp Conversation Thread
                                    </h4>
                                    <span className="text-[11px] text-slate-400 font-medium">
                                      {hasReplies
                                        ? `${rawReplies.length} messages in sequence`
                                        : '1 message touchpoint'}
                                    </span>
                                  </div>

                                  <div className="space-y-2.5 max-w-2xl bg-slate-50/80 dark:bg-slate-950/80 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                                    {hasReplies ? (
                                      rawReplies.map((reply: any, rIdx: number) => {
                                        const isFromAgent =
                                          reply.sender === 'Agent' ||
                                          reply.sender === 'You (Agent)' ||
                                          reply.sender === 'Sharyx Assistant' ||
                                          reply.sender?.toLowerCase().includes('agent') ||
                                          reply.sender?.toLowerCase().includes('assistant');
                                        const isFromLead = !isFromAgent;

                                        return (
                                          <div
                                            key={rIdx}
                                            className={`flex flex-col ${
                                              isFromLead ? 'items-start' : 'items-end'
                                            }`}
                                          >
                                            <div
                                              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs shadow-xs leading-relaxed ${
                                                isFromLead
                                                  ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-tl-xs'
                                                  : 'bg-emerald-600 text-white rounded-tr-xs'
                                              }`}
                                            >
                                              <div
                                                className={`text-[10px] font-bold mb-1 flex items-center justify-between gap-2 ${
                                                  isFromLead
                                                    ? 'text-emerald-700 dark:text-emerald-400'
                                                    : 'text-emerald-100'
                                                }`}
                                              >
                                                <span>{reply.sender}</span>
                                                <span
                                                  className={`text-[9px] font-normal ${
                                                    isFromLead
                                                      ? 'text-slate-400'
                                                      : 'text-emerald-200'
                                                  }`}
                                                >
                                                  {reply.timestamp
                                                    ? formatOccurredTime(reply.timestamp).timeOnly
                                                    : ''}
                                                </span>
                                              </div>
                                              <div className="whitespace-pre-wrap">{reply.body}</div>
                                              <div
                                                className={`text-[9px] mt-1.5 text-right flex items-center justify-end gap-1 ${
                                                  isFromLead ? 'text-slate-400' : 'text-emerald-200'
                                                }`}
                                              >
                                                {isFromAgent && <CheckCheck className="h-3 w-3" />}
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })
                                    ) : (
                                      <div
                                        className={`flex flex-col ${
                                          item.direction === 'inbound' ? 'items-start' : 'items-end'
                                        }`}
                                      >
                                        <div
                                          className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs shadow-xs leading-relaxed ${
                                            item.direction === 'inbound'
                                              ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-tl-xs'
                                              : 'bg-emerald-600 text-white rounded-tr-xs'
                                          }`}
                                        >
                                          <div
                                            className={`text-[10px] font-bold mb-1 ${
                                              item.direction === 'inbound'
                                                ? 'text-emerald-700 dark:text-emerald-400'
                                                : 'text-emerald-100'
                                            }`}
                                          >
                                            {item.direction === 'inbound'
                                              ? data?.lead.name || 'Customer'
                                              : 'You (Agent)'}
                                          </div>
                                          <div className="whitespace-pre-wrap">
                                            {item.content?.body || item.description}
                                          </div>
                                          <div
                                            className={`text-[9px] mt-1.5 text-right flex items-center justify-end gap-1 ${
                                              item.direction === 'inbound'
                                                ? 'text-slate-400'
                                                : 'text-emerald-200'
                                            }`}
                                          >
                                            <span>{timeInfo.timeOnly}</span>
                                            {item.direction === 'outbound' && (
                                              <CheckCheck className="h-3 w-3" />
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* 2. EMAIL DETAILED VIEW WITH FULL THREAD REPLIES */}
                              {item.channel === 'email' && (
                                <div className="space-y-3.5">
                                  {item.content?.subject && (
                                    <div className="p-3.5 rounded-xl bg-sky-50/70 dark:bg-sky-950/40 border border-sky-200/70 dark:border-sky-900/60">
                                      <div className="text-[10px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                                        Email Subject
                                      </div>
                                      <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                                        {item.content.subject}
                                      </div>
                                    </div>
                                  )}

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800">
                                    <div>
                                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                                        From:
                                      </span>{' '}
                                      {item.content?.from || data?.lead.email}
                                    </div>
                                    <div>
                                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                                        To:
                                      </span>{' '}
                                      {item.content?.to || 'sales@sharyx.ai'}
                                    </div>
                                  </div>

                                  {/* Primary Email Body */}
                                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/80">
                                    <div className="text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                                      {item.content?.body || 'No email body text provided'}
                                    </div>
                                  </div>

                                  {/* Email Thread Sequence / Conversation Dialogue */}
                                  {item.content?.thread_replies &&
                                    item.content.thread_replies.length > 0 && (
                                      <div className="space-y-2 pt-1">
                                        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                          <Mail className="h-3.5 w-3.5 text-sky-500" />
                                          Email Conversation Thread ({item.content.thread_replies.length} replies)
                                        </div>
                                        <div className="space-y-2.5 border-l-2 border-sky-300 dark:border-sky-800 pl-3">
                                          {item.content.thread_replies.map(
                                            (reply: any, rIdx: number) => (
                                              <div
                                                key={rIdx}
                                                className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs shadow-2xs"
                                              >
                                                <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                                                  <span className="flex items-center gap-1">
                                                    <User className="h-3 w-3 text-sky-500" />
                                                    {reply.sender}
                                                  </span>
                                                  <span className="text-[10px] text-slate-400 font-normal">
                                                    {reply.timestamp
                                                      ? formatOccurredTime(reply.timestamp).formatted
                                                      : ''}
                                                  </span>
                                                </div>
                                                <div className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                                                  {reply.body}
                                                </div>
                                              </div>
                                            )
                                          )}
                                        </div>
                                      </div>
                                    )}

                                  {/* Email Attachments */}
                                  {item.content?.attachments &&
                                    item.content.attachments.length > 0 && (
                                      <div className="space-y-2 pt-1">
                                        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                          <Paperclip className="h-3 w-3 text-slate-400" />
                                          Attachments ({item.content.attachments.length})
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                          {item.content.attachments.map((att, aIdx) => (
                                            <a
                                              key={aIdx}
                                              href={att.url}
                                              target="_blank"
                                              rel="noreferrer"
                                              className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-blue-600 dark:text-blue-400 hover:border-blue-400 transition-colors shadow-2xs"
                                            >
                                              <Download className="h-3.5 w-3.5" />
                                              <span>{att.name}</span>
                                              {att.size && (
                                                <span className="text-[10px] text-slate-400">
                                                  ({Math.round(att.size / 1024)} KB)
                                                </span>
                                              )}
                                            </a>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                </div>
                              )}

                              {/* 4. DEMO MEETING CARD */}
                              {item.channel === 'meeting' && (
                                <div className="space-y-4">
                                  <div className="p-4 rounded-2xl bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200/80 dark:border-purple-900/80 space-y-3">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                      <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-md">
                                          <Video className="h-5 w-5" />
                                        </div>
                                        <div>
                                          <div className="text-xs font-bold text-slate-900 dark:text-white">
                                            {item.content?.subject || item.description || 'Google Meet Demo Meeting'}
                                          </div>
                                          <div className="text-[11px] text-purple-700 dark:text-purple-300 font-medium flex items-center gap-2 mt-0.5">
                                            <span className="flex items-center gap-1">
                                              <Clock className="h-3 w-3" />
                                              {item.content?.duration_minutes ? `${item.content.duration_minutes} Minutes` : '45 Minutes'}
                                            </span>
                                            <span>•</span>
                                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                              Completed & Approved
                                            </span>
                                          </div>
                                        </div>
                                      </div>

                                      {item.content?.meet_url && (
                                        <a
                                          href={item.content.meet_url}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-xs transition-colors"
                                        >
                                          <Video className="h-3.5 w-3.5" />
                                          Open Google Meet
                                          <ExternalLink className="h-3 w-3 ml-0.5" />
                                        </a>
                                      )}
                                    </div>

                                    {item.content?.metadata?.attendees && (
                                      <div className="pt-2 border-t border-purple-200/60 dark:border-purple-900/60">
                                        <div className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 mb-1">
                                          Key Attendees:
                                        </div>
                                        <div className="flex flex-wrap gap-1.5">
                                          {(item.content.metadata.attendees as string[]).map((att: string, i: number) => (
                                            <span
                                              key={i}
                                              className="px-2.5 py-0.5 rounded-md bg-white dark:bg-purple-900/60 border border-purple-200 dark:border-purple-800 text-[11px] font-medium text-purple-900 dark:text-purple-200"
                                            >
                                              {att}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {item.content?.body && (
                                      <p className="text-xs text-purple-950 dark:text-purple-200 leading-relaxed font-sans pt-1">
                                        {item.content.body}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* 5. RECRUITMENT INTERVIEW CARD */}
                              {item.channel === 'interview' && (
                                <div className="space-y-4">
                                  <div className="p-4 rounded-2xl bg-rose-50/70 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/80 space-y-3">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                      <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-md">
                                          <Users className="h-5 w-5" />
                                        </div>
                                        <div>
                                          <div className="text-xs font-bold text-slate-900 dark:text-white">
                                            {item.content?.subject || item.description || 'Candidate Interview Session'}
                                          </div>
                                          <div className="text-[11px] text-rose-700 dark:text-rose-300 font-medium flex items-center gap-2 mt-0.5">
                                            {item.content?.stage && (
                                              <span className="font-semibold px-2 py-0.5 rounded bg-rose-200/60 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200">
                                                Stage: {item.content.stage}
                                              </span>
                                            )}
                                            {item.content?.score && (
                                              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                                Evaluation: {item.content.score}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </div>

                                      {item.content?.interview_link && (
                                        <a
                                          href={item.content.interview_link}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-colors"
                                        >
                                          <Video className="h-3.5 w-3.5" />
                                          Interview Room
                                          <ExternalLink className="h-3 w-3 ml-0.5" />
                                        </a>
                                      )}
                                    </div>

                                    {item.content?.body && (
                                      <p className="text-xs text-rose-950 dark:text-rose-200 leading-relaxed font-sans">
                                        {item.content.body}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* 3. VOICE CALL DETAILED VIEW WITH SCRUBBER & TRANSCRIPT */}
                              {item.channel === 'call' && (
                                <div className="space-y-4">
                                  {/* Audio Player Card */}
                                  <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900 space-y-3">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                      <div className="flex items-center gap-3">
                                        <button
                                          onClick={() => toggleAudio(item.id, item.recording_url)}
                                          className={`h-11 w-11 rounded-2xl flex items-center justify-center text-white shadow-md transition-all cursor-pointer ${
                                            playingAudioId === item.id
                                              ? 'bg-amber-600 scale-105 ring-4 ring-amber-500/30'
                                              : 'bg-amber-500 hover:bg-amber-600'
                                          }`}
                                        >
                                          {playingAudioId === item.id ? (
                                            <Pause className="h-5 w-5" />
                                          ) : (
                                            <Play className="h-5 w-5 ml-0.5" />
                                          )}
                                        </button>
                                        <div>
                                          <div className="text-xs font-bold text-amber-950 dark:text-amber-200 flex items-center gap-2">
                                            <span>Voice Call Audio Recording</span>
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-200/80 dark:bg-amber-900/80 text-amber-800 dark:text-amber-300">
                                              Total: {formatDuration(item.duration)}
                                            </span>
                                          </div>
                                          <p className="text-[11px] text-amber-800/80 dark:text-amber-400/80 mt-0.5 flex items-center gap-1.5">
                                            {playingAudioId === item.id ? (
                                              <>
                                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                                                <span>
                                                  Playing • {formatDuration(audioCurrentTime)} /{' '}
                                                  {formatDuration(audioDuration || item.duration)}
                                                </span>
                                              </>
                                            ) : (
                                              'Click Play to listen to recorded call sample'
                                            )}
                                          </p>
                                        </div>
                                      </div>

                                      {item.recording_url && (
                                        <a
                                          href={item.recording_url}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100/50 transition-colors self-start sm:self-auto shadow-2xs"
                                        >
                                          <Download className="h-3.5 w-3.5" />
                                          Download MP3
                                        </a>
                                      )}
                                    </div>

                                    {/* Live Scrubber Bar */}
                                    {playingAudioId === item.id && (
                                      <div className="pt-2 flex items-center gap-3">
                                        <span className="text-[11px] font-mono text-amber-800 dark:text-amber-300 w-10 text-right">
                                          {formatDuration(audioCurrentTime)}
                                        </span>
                                        <input
                                          type="range"
                                          min="0"
                                          max="100"
                                          value={audioProgress}
                                          onChange={handleSeekAudio}
                                          className="flex-1 h-2 bg-amber-200 dark:bg-amber-900/70 rounded-lg appearance-none cursor-pointer accent-amber-600"
                                        />
                                        <span className="text-[11px] font-mono text-amber-800 dark:text-amber-300 w-10">
                                          {formatDuration(audioDuration || item.duration)}
                                        </span>
                                      </div>
                                    )}
                                  </div>

                                  {/* AI Call Summary */}
                                  {item.content?.ai_summary && (
                                    <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-900/80">
                                      <div className="flex items-center justify-between mb-1.5">
                                        <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-300">
                                          <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                                          AI Call Summary & Action Outcomes
                                        </div>
                                        <button
                                          onClick={() =>
                                            handleCopyText(
                                              item.content.ai_summary || '',
                                              `summary-${item.id}`
                                            )
                                          }
                                          className="text-[11px] flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                                        >
                                          {copiedId === `summary-${item.id}` ? (
                                            <>
                                              <Check className="h-3 w-3" /> Copied
                                            </>
                                          ) : (
                                            <>
                                              <Copy className="h-3 w-3" /> Copy Summary
                                            </>
                                          )}
                                        </button>
                                      </div>
                                      <p className="text-xs text-indigo-950 dark:text-indigo-200 leading-relaxed font-medium">
                                        {item.content.ai_summary}
                                      </p>
                                    </div>
                                  )}

                                  {/* Complete Call Transcript */}
                                  {item.content?.transcript && (
                                    <div className="space-y-1.5">
                                      <div className="flex items-center justify-between">
                                        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                          <FileText className="h-3 w-3" />
                                          Complete Call Dialogue Transcript
                                        </div>
                                        <button
                                          onClick={() =>
                                            handleCopyText(item.content.transcript || '', `tr-${item.id}`)
                                          }
                                          className="text-[11px] flex items-center gap-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                                        >
                                          {copiedId === `tr-${item.id}` ? (
                                            <>
                                              <Check className="h-3 w-3 text-emerald-500" /> Copied
                                            </>
                                          ) : (
                                            <>
                                              <Copy className="h-3 w-3" /> Copy Transcript
                                            </>
                                          )}
                                        </button>
                                      </div>
                                      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed font-sans max-h-64 overflow-y-auto">
                                        {item.content.transcript}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* 4. DEMO MEETING CARD */}
                              {item.channel === 'meeting' && (
                                <div className="space-y-4">
                                  <div className="p-4 rounded-2xl bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200/80 dark:border-purple-900/80 space-y-3">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                      <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-md">
                                          <Video className="h-5 w-5" />
                                        </div>
                                        <div>
                                          <div className="text-xs font-bold text-slate-900 dark:text-white">
                                            {item.content?.subject || item.description || 'Google Meet Demo Meeting'}
                                          </div>
                                          <div className="text-[11px] text-purple-700 dark:text-purple-300 font-medium flex items-center gap-2 mt-0.5">
                                            <span className="flex items-center gap-1">
                                              <Clock className="h-3 w-3" />
                                              {item.content?.duration_minutes ? `${item.content.duration_minutes} Minutes` : '45 Minutes'}
                                            </span>
                                            <span>•</span>
                                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                              Completed & Approved
                                            </span>
                                          </div>
                                        </div>
                                      </div>

                                      {item.content?.meet_url && (
                                        <a
                                          href={item.content.meet_url}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-xs transition-colors"
                                        >
                                          <Video className="h-3.5 w-3.5" />
                                          Open Google Meet
                                          <ExternalLink className="h-3 w-3 ml-0.5" />
                                        </a>
                                      )}
                                    </div>

                                    {item.content?.metadata?.attendees && (
                                      <div className="pt-2 border-t border-purple-200/60 dark:border-purple-900/60">
                                        <div className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 mb-1">
                                          Key Attendees:
                                        </div>
                                        <div className="flex flex-wrap gap-1.5">
                                          {(item.content.metadata.attendees as string[]).map((att: string, i: number) => (
                                            <span
                                              key={i}
                                              className="px-2.5 py-0.5 rounded-md bg-white dark:bg-purple-900/60 border border-purple-200 dark:border-purple-800 text-[11px] font-medium text-purple-900 dark:text-purple-200"
                                            >
                                              {att}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {item.content?.body && (
                                      <p className="text-xs text-purple-950 dark:text-purple-200 leading-relaxed font-sans pt-1">
                                        {item.content.body}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* 5. RECRUITMENT INTERVIEW CARD */}
                              {item.channel === 'interview' && (
                                <div className="space-y-4">
                                  <div className="p-4 rounded-2xl bg-rose-50/70 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/80 space-y-3">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                      <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-md">
                                          <Users className="h-5 w-5" />
                                        </div>
                                        <div>
                                          <div className="text-xs font-bold text-slate-900 dark:text-white">
                                            {item.content?.subject || item.description || 'Candidate Interview Session'}
                                          </div>
                                          <div className="text-[11px] text-rose-700 dark:text-rose-300 font-medium flex items-center gap-2 mt-0.5">
                                            {item.content?.stage && (
                                              <span className="font-semibold px-2 py-0.5 rounded bg-rose-200/60 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200">
                                                Stage: {item.content.stage}
                                              </span>
                                            )}
                                            {item.content?.score && (
                                              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                                Evaluation: {item.content.score}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </div>

                                      {item.content?.interview_link && (
                                        <a
                                          href={item.content.interview_link}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-colors"
                                        >
                                          <Video className="h-3.5 w-3.5" />
                                          Interview Room
                                          <ExternalLink className="h-3 w-3 ml-0.5" />
                                        </a>
                                      )}
                                    </div>

                                    {item.content?.body && (
                                      <p className="text-xs text-rose-950 dark:text-rose-200 leading-relaxed font-sans">
                                        {item.content.body}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
