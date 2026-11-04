import React, { useState, useEffect, useCallback } from 'react';
import { Customer360Response, TimelineJourneyItem } from '@/types/omnichannel';
import { omnichannelService } from '@/service/omnichannelService';
import {
  X,
  MessageSquare,
  Mail,
  Phone,
  Clock,
  User,
  Building,
  Sparkles,
  Paperclip,
  Play,
  Pause,
  ExternalLink,
  ArrowDownLeft,
  ArrowUpRight,
  Activity,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface Customer360ModalProps {
  customerId: string;
  onClose: () => void;
  onSelectConversation?: (conversationId: string) => void;
}

export const Customer360Modal: React.FC<Customer360ModalProps> = ({
  customerId,
  onClose,
  onSelectConversation,
}) => {
  const [data, setData] = useState<Customer360Response | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'all' | 'whatsapp' | 'email' | 'call'>('all');
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await omnichannelService.getCustomer360(customerId);
      setData(res);
    } catch {
      toast.error('Failed to load Customer 360 profile');
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleAudio = (id: string, url?: string | null) => {
    if (!url) {
      toast.error('No recording URL available');
      return;
    }
    const audioEl = document.getElementById(`audio-360-${id}`) as HTMLAudioElement | null;
    if (!audioEl) return;

    if (playingAudioId === id) {
      audioEl.pause();
      setPlayingAudioId(null);
    } else {
      audioEl.play().catch(() => toast.error('Audio playback error'));
      setPlayingAudioId(id);
    }
  };

  const filteredTimeline = (data?.timeline || []).filter((item) => {
    if (activeTab === 'all') return true;
    return item.channel === activeTab;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 sm:p-6 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-extrabold flex items-center justify-center text-xl shadow-md shadow-blue-500/20">
              {data?.customer?.name?.charAt(0).toUpperCase() || 'C'}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  {data?.customer?.name || 'Customer Profile'}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  {data?.customer?.tier || 'Customer 360°'}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400 mt-1">
                {data?.customer?.email && (
                  <span className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-blue-500" />
                    {data.customer.email}
                  </span>
                )}
                {data?.customer?.phone && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-500" />
                    {data.customer.phone}
                  </span>
                )}
                {data?.customer?.company_name && (
                  <span className="flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-slate-400" />
                    {data.customer.company_name}
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats Metrics Ribbon */}
        {data?.summary && (
          <div className="grid grid-cols-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 divide-x divide-slate-100 dark:divide-slate-800 text-center py-3">
            <div>
              <p className="text-[11px] font-medium text-slate-400">Total Touchpoints</p>
              <p className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                {(data.summary.totalMessages || 0) + (data.summary.totalCalls || 0)}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">WhatsApp Messages</p>
              <p className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                {data.summary.whatsappCount || 0}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-medium text-blue-600 dark:text-blue-400">Emails Exchanged</p>
              <p className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                {data.summary.emailCount || 0}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-medium text-amber-600 dark:text-amber-400">Calls Logged</p>
              <p className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                {data.summary.callCount || 0}
              </p>
            </div>
          </div>
        )}

        {/* Channel Navigation Tabs */}
        <div className="px-6 pt-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all border ${
                activeTab === 'all'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/20'
                  : 'text-slate-600 dark:text-slate-300 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              All Channels ({data?.timeline?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('whatsapp')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 border ${
                activeTab === 'whatsapp'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm shadow-emerald-500/20'
                  : 'text-slate-600 dark:text-slate-300 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>WhatsApp ({data?.summary?.whatsappCount || 0})</span>
            </button>
            <button
              onClick={() => setActiveTab('email')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 border ${
                activeTab === 'email'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/20'
                  : 'text-slate-600 dark:text-slate-300 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Email ({data?.summary?.emailCount || 0})</span>
            </button>
            <button
              onClick={() => setActiveTab('call')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 border ${
                activeTab === 'call'
                  ? 'bg-amber-600 text-white border-amber-600 shadow-sm shadow-amber-500/20'
                  : 'text-slate-600 dark:text-slate-300 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Call ({data?.summary?.callCount || 0})</span>
            </button>
          </div>
        </div>

        {/* Timeline Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 [scrollbar-width:thin]">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center text-slate-400">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-3"></div>
              <p className="text-xs">Aggregating multi-channel journey...</p>
            </div>
          ) : filteredTimeline.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <Activity className="w-8 h-8 mx-auto text-slate-300 mb-2 opacity-50" />
              <p className="text-xs">No records found for the selected channel.</p>
            </div>
          ) : (
            <div className="relative border-l-2 border-slate-200 dark:border-slate-800 ml-4 space-y-6">
              {filteredTimeline.map((item) => {
                const isWhatsApp = item.channel === 'whatsapp';
                const isEmail = item.channel === 'email';
                const isCall = item.channel === 'call';

                return (
                  <div key={item.id} className="relative pl-6">
                    {/* Channel Bullet Icon */}
                    <div
                      className={`absolute -left-3.5 top-1 w-7 h-7 rounded-full flex items-center justify-center text-white ring-4 ring-white dark:ring-slate-900 shadow-sm ${
                        isWhatsApp
                          ? 'bg-emerald-600'
                          : isEmail
                          ? 'bg-blue-600'
                          : 'bg-amber-600'
                      }`}
                    >
                      {isWhatsApp ? (
                        <MessageSquare className="w-3.5 h-3.5" />
                      ) : isEmail ? (
                        <Mail className="w-3.5 h-3.5" />
                      ) : (
                        <Phone className="w-3.5 h-3.5" />
                      )}
                    </div>

                    {/* Timeline Card */}
                    <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 transition-all hover:border-slate-300 dark:hover:border-slate-600">
                      <div className="flex items-center justify-between gap-2 border-b border-slate-200/60 dark:border-slate-700/60 pb-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              isWhatsApp
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : isEmail
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                            }`}
                          >
                            {item.channel}
                          </span>
                          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                            {item.title}
                          </span>
                        </div>

                        <span className="text-xs text-slate-400">
                          {item.timestamp
                            ? format(new Date(item.timestamp), 'MMM d, yyyy h:mm a')
                            : ''}
                        </span>
                      </div>

                      {/* Content Preview */}
                      {item.body && (
                        <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed mt-1">
                          {item.body}
                        </p>
                      )}

                      {/* Attachments */}
                      {item.attachments && item.attachments.length > 0 && (
                        <div className="mt-2.5 flex flex-wrap gap-2">
                          {item.attachments.map((att, idx) => (
                            <a
                              key={idx}
                              href={att.url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 border border-slate-200 dark:border-slate-600 hover:underline"
                            >
                              <Paperclip className="w-3.5 h-3.5" />
                              <span>{att.name || 'Attachment'}</span>
                            </a>
                          ))}
                        </div>
                      )}

                      {/* Call Audio & Details */}
                      {isCall && (
                        <div className="mt-3 space-y-2">
                          {item.ai_summary && (
                            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-xl p-2.5 text-xs text-amber-900 dark:text-amber-200">
                              <span className="font-bold flex items-center gap-1 mb-0.5">
                                <Sparkles className="w-3 h-3 text-amber-600" />
                                AI Call Summary:
                              </span>
                              {item.ai_summary}
                            </div>
                          )}

                          {item.recording_url && (
                            <div className="flex items-center justify-between bg-white dark:bg-slate-700/60 p-2 rounded-xl border border-slate-200 dark:border-slate-700">
                              <button
                                type="button"
                                onClick={() => toggleAudio(item.id, item.recording_url)}
                                className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-blue-600 cursor-pointer"
                              >
                                {playingAudioId === item.id ? (
                                  <Pause className="w-4 h-4 text-blue-600" />
                                ) : (
                                  <Play className="w-4 h-4 text-blue-600" />
                                )}
                                <span>{playingAudioId === item.id ? 'Pause Recording' : 'Play Audio Recording'}</span>
                              </button>
                              <audio
                                id={`audio-360-${item.id}`}
                                src={item.recording_url}
                                onEnded={() => setPlayingAudioId(null)}
                                className="hidden"
                              />
                              <a
                                href={item.recording_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                              >
                                <ExternalLink className="w-3 h-3" />
                                <span>Download</span>
                              </a>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Jump to Conversation Link */}
                      {item.conversation_id && onSelectConversation && (
                        <div className="mt-2.5 flex justify-end">
                          <button
                            onClick={() => {
                              onClose();
                              onSelectConversation(item.conversation_id!);
                            }}
                            className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                          >
                            <span>Open thread detail</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

