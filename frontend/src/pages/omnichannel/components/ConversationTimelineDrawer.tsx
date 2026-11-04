import React, { useState } from 'react';
import {
  OmnichannelConversation,
  OmnichannelMessage,
  OmnichannelCall,
  OmnichannelActivityLog,
  OmnichannelStatus,
} from '@/types/omnichannel';
import { omnichannelService } from '@/service/omnichannelService';
import {
  X,
  Send,
  Phone,
  Mail,
  MessageSquare,
  Clock,
  User,
  Paperclip,
  Check,
  CheckCheck,
  Play,
  Pause,
  Volume2,
  FileText,
  Sparkles,
  ExternalLink,
  ChevronDown,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldAlert,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface ConversationTimelineDrawerProps {
  conversationId: string;
  onClose: () => void;
  onOpenCustomer360: (customerId: string) => void;
  onConversationUpdated?: () => void;
}

export const ConversationTimelineDrawer: React.FC<ConversationTimelineDrawerProps> = ({
  conversationId,
  onClose,
  onOpenCustomer360,
  onConversationUpdated,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [conversation, setConversation] = useState<OmnichannelConversation | null>(null);
  const [messages, setMessages] = useState<OmnichannelMessage[]>([]);
  const [calls, setCalls] = useState<OmnichannelCall[]>([]);
  const [activities, setActivities] = useState<OmnichannelActivityLog[]>([]);

  // Reply box state
  const [replyBody, setReplyBody] = useState<string>('');
  const [replySubject, setReplySubject] = useState<string>('');
  const [sendingReply, setSendingReply] = useState<boolean>(false);
  const [updatingStatus, setUpdatingStatus] = useState<boolean>(false);

  // Audio player state
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);

  const fetchDetail = React.useCallback(async () => {
    try {
      setLoading(true);
      const data = await omnichannelService.getConversationDetail(conversationId);
      setConversation(data.conversation);
      setMessages(data.messages || []);
      setCalls(data.calls || []);
      setActivities(data.activities || []);
    } catch (err: any) {
      toast.error('Failed to load conversation timeline');
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  React.useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyBody.trim()) return;

    try {
      setSendingReply(true);
      await omnichannelService.sendReply(conversationId, {
        body: replyBody.trim(),
        subject: replySubject.trim() || undefined,
      });
      toast.success('Reply dispatched successfully');
      setReplyBody('');
      setReplySubject('');
      await fetchDetail();
      onConversationUpdated?.();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to send reply');
    } finally {
      setSendingReply(false);
    }
  };

  const handleStatusChange = async (newStatus: OmnichannelStatus) => {
    try {
      setUpdatingStatus(true);
      const updated = await omnichannelService.updateConversation(conversationId, {
        status: newStatus,
      });
      setConversation((prev) => (prev ? { ...prev, status: updated.status } : prev));
      toast.success(`Status changed to ${newStatus}`);
      onConversationUpdated?.();
    } catch (err: any) {
      toast.error('Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const toggleAudio = (id: string, url?: string | null) => {
    if (!url) {
      toast.error('No recording audio URL available for this call');
      return;
    }
    const audioEl = document.getElementById(`audio-${id}`) as HTMLAudioElement | null;
    if (!audioEl) return;

    if (playingAudioId === id) {
      audioEl.pause();
      setPlayingAudioId(null);
    } else {
      audioEl.play().catch(() => toast.error('Playback error'));
      setPlayingAudioId(id);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 bg-card border-l border-border">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-sm text-muted-foreground">Loading channel timeline...</p>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 bg-card border-l border-border text-center">
        <p className="text-sm text-muted-foreground mb-4">Conversation not found</p>
        <button
          onClick={onClose}
          className="px-4 py-2 text-xs font-medium rounded-lg bg-secondary text-secondary-foreground"
        >
          Close Drawer
        </button>
      </div>
    );
  }

  const { customer, channel } = conversation;
  const customerName = customer?.name || customer?.phone || 'Customer';

  return (
    <div className="h-full flex flex-col bg-card border-l border-border overflow-hidden">
      {/* ── TOP HEADER ── */}
      <div className="p-4 border-b border-border bg-background/50 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-sm shrink-0 border border-primary/20">
            {customerName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-foreground truncate">{customerName}</h3>
              <span className="text-xs font-mono text-muted-foreground">
                #{conversation.id.slice(0, 8)}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {customer?.email && <span>{customer.email}</span>}
              {customer?.email && customer?.phone && <span>•</span>}
              {customer?.phone && <span>{customer.phone}</span>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Status selector */}
          <select
            value={conversation.status}
            onChange={(e) => handleStatusChange(e.target.value as OmnichannelStatus)}
            disabled={updatingStatus}
            className="text-xs font-medium bg-background border border-border rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
          >
            <option value="new">Status: New</option>
            <option value="open">Status: Open</option>
            <option value="pending">Status: Pending</option>
            <option value="resolved">Status: Resolved</option>
          </select>

          {/* Customer 360 Button */}
          {customer && (
            <button
              onClick={() => onOpenCustomer360(customer.id)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors border border-primary/20"
              title="View full multi-channel history"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Customer 360</span>
            </button>
          )}

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* ── CHANNEL TIMELINE CONTENT ── */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Latest Activity Summary Banner */}
        {conversation.summary && (
          <div className="bg-muted/40 border border-border/80 rounded-xl p-3 text-xs flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-foreground/90">AI Activity Summary</p>
              <p className="text-muted-foreground mt-0.5">{conversation.summary}</p>
            </div>
          </div>
        )}

        {/* WHATSAPP TIMELINE VIEW */}
        {channel === 'whatsapp' && (
          <div className="space-y-3">
            {messages.length === 0 ? (
              <p className="text-center text-xs text-muted-foreground py-8">
                No WhatsApp messages recorded yet.
              </p>
            ) : (
              messages.map((msg) => {
                const isOutbound = msg.direction === 'out';
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isOutbound ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-2.5 shadow-sm text-sm ${isOutbound
                          ? 'bg-emerald-600 text-white rounded-tr-none dark:bg-emerald-700'
                          : 'bg-muted border border-border text-foreground rounded-tl-none'
                        }`}
                    >
                      <p className="whitespace-pre-wrap leading-relaxed">{msg.body}</p>

                      {/* Attachments preview */}
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {msg.attachments.map((att, idx) => (
                            <a
                              key={idx}
                              href={att.url}
                              target="_blank"
                              rel="noreferrer"
                              className={`flex items-center gap-1.5 text-xs underline ${isOutbound ? 'text-emerald-100' : 'text-primary'
                                }`}
                            >
                              <Paperclip className="w-3.5 h-3.5" />
                              <span>{att.name || 'Attachment'}</span>
                            </a>
                          ))}
                        </div>
                      )}

                      <div
                        className={`flex items-center justify-end gap-1 mt-1.5 text-[10px] ${isOutbound ? 'text-emerald-100/90' : 'text-muted-foreground'
                          }`}
                      >
                        <span>
                          {msg.timestamp
                            ? format(new Date(msg.timestamp), 'h:mm a')
                            : ''}
                        </span>
                        {isOutbound && (
                          <span>
                            {msg.status === 'read' ? (
                              <CheckCheck className="w-3.5 h-3.5 text-sky-200" />
                            ) : msg.status === 'delivered' ? (
                              <CheckCheck className="w-3.5 h-3.5 text-emerald-200" />
                            ) : (
                              <Check className="w-3.5 h-3.5" />
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* EMAIL TIMELINE VIEW */}
        {channel === 'email' && (
          <div className="space-y-4">
            {messages.length === 0 ? (
              <p className="text-center text-xs text-muted-foreground py-8">
                No Email messages recorded yet.
              </p>
            ) : (
              messages.map((email) => {
                const isOutbound = email.direction === 'out';
                return (
                  <div
                    key={email.id}
                    className="border border-border rounded-xl bg-card p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2 border-b border-border/60 pb-3 mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${isOutbound
                                ? 'bg-primary/10 text-primary'
                                : 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                              }`}
                          >
                            {isOutbound ? 'Sent by Agent' : 'From Customer'}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {email.sender_info}
                          </span>
                        </div>
                        <h4 className="text-sm font-semibold text-foreground mt-1.5">
                          {email.subject || '(No Subject)'}
                        </h4>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {email.timestamp
                          ? format(new Date(email.timestamp), 'MMM d, h:mm a')
                          : ''}
                      </span>
                    </div>

                    <div className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
                      {email.body}
                    </div>

                    {email.attachments && email.attachments.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-border/50 flex flex-wrap gap-2">
                        {email.attachments.map((att, idx) => (
                          <a
                            key={idx}
                            href={att.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-muted hover:bg-muted/80 text-foreground transition-colors border border-border"
                          >
                            <Paperclip className="w-3.5 h-3.5 text-muted-foreground" />
                            <span>{att.name || 'Attachment'}</span>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* CALL TIMELINE VIEW */}
        {channel === 'call' && (
          <div className="space-y-4">
            {calls.length === 0 ? (
              <p className="text-center text-xs text-muted-foreground py-8">
                No Call logs recorded yet.
              </p>
            ) : (
              calls.map((call) => {
                const isInbound = call.direction === 'inbound';
                const durMin = Math.floor(call.duration / 60);
                const durSec = call.duration % 60;
                const durStr = `${durMin > 0 ? `${durMin}m ` : ''}${durSec}s`;

                return (
                  <div
                    key={call.id}
                    className="border border-border rounded-xl bg-card p-4 shadow-sm space-y-3.5"
                  >
                    {/* Call Meta Header */}
                    <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-3">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center ${isInbound
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                              : 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400'
                            }`}
                        >
                          {isInbound ? (
                            <ArrowDownLeft className="w-4 h-4" />
                          ) : (
                            <ArrowUpRight className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-foreground">
                            {isInbound ? 'Inbound Call' : 'Outbound Call'}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            Duration: {durStr} • Outcome: {call.outcome || 'completed'}
                          </p>
                        </div>
                      </div>

                      <span className="text-xs text-muted-foreground">
                        {call.started_at
                          ? format(new Date(call.started_at), 'MMM d, h:mm a')
                          : format(new Date(call.created_at || Date.now()), 'MMM d, h:mm a')}
                      </span>
                    </div>

                    {/* Audio Player */}
                    {call.recording_url ? (
                      <div className="bg-muted/50 border border-border rounded-lg p-2.5 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <button
                            type="button"
                            onClick={() => toggleAudio(call.id, call.recording_url)}
                            className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-sm shrink-0 hover:bg-primary/90 transition-colors"
                          >
                            {playingAudioId === call.id ? (
                              <Pause className="w-4 h-4" />
                            ) : (
                              <Play className="w-4 h-4 ml-0.5" />
                            )}
                          </button>
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-foreground truncate">
                              Call Audio Recording
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {playingAudioId === call.id ? 'Playing...' : `Length: ${durStr}`}
                            </p>
                          </div>
                        </div>

                        <audio
                          id={`audio-${call.id}`}
                          src={call.recording_url}
                          onEnded={() => setPlayingAudioId(null)}
                          className="hidden"
                        />

                        <a
                          href={call.recording_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-primary hover:underline flex items-center gap-1 shrink-0"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Download</span>
                        </a>
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground italic bg-muted/20 p-2 rounded-lg">
                        No audio recording link provided.
                      </div>
                    )}

                    {/* AI Summary */}
                    {call.ai_summary && (
                      <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-800 dark:text-amber-300 mb-1">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>AI Call Summary</span>
                        </div>
                        <p className="text-xs text-foreground/90 leading-relaxed">
                          {call.ai_summary}
                        </p>
                      </div>
                    )}

                    {/* Speech Transcript */}
                    {call.transcript && (
                      <details className="text-xs border border-border/80 rounded-lg p-2.5 bg-muted/30">
                        <summary className="font-medium text-foreground cursor-pointer select-none">
                          View Speech Transcript
                        </summary>
                        <div className="mt-2.5 text-muted-foreground whitespace-pre-wrap leading-relaxed font-mono text-[11px] bg-background/60 p-2.5 rounded border border-border/40 max-h-48 overflow-y-auto">
                          {call.transcript}
                        </div>
                      </details>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* ── CHANNEL REPLY BOX ── */}
      <div className="p-4 border-t border-border bg-background/80 shrink-0">
        <form onSubmit={handleSendReply} className="space-y-2.5">
          {/* Email Subject input */}
          {channel === 'email' && (
            <input
              type="text"
              placeholder="Subject..."
              value={replySubject}
              onChange={(e) => setReplySubject(e.target.value)}
              className="w-full text-xs bg-card border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          )}

          <div className="flex items-end gap-2">
            <textarea
              rows={2}
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              placeholder={
                channel === 'whatsapp'
                  ? `Reply via WhatsApp to ${customer?.phone || 'customer'}...`
                  : channel === 'email'
                    ? `Write email reply to ${customer?.email || 'customer'}...`
                    : `Enter call notes or trigger outbound call to ${customer?.phone || 'customer'}...`
              }
              className="flex-1 text-xs bg-card border border-border rounded-lg p-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendReply(e);
                }
              }}
            />

            <button
              type="submit"
              disabled={sendingReply || !replyBody.trim()}
              className="h-10 px-4 rounded-lg bg-primary text-primary-foreground font-medium text-xs flex items-center justify-center gap-1.5 hover:bg-primary/90 disabled:opacity-50 transition-colors shrink-0 shadow-sm"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{sendingReply ? 'Sending...' : 'Send'}</span>
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Press <kbd className="px-1 py-0.5 rounded bg-muted text-[10px] border border-border">Enter</kbd> to send, <kbd className="px-1 py-0.5 rounded bg-muted text-[10px] border border-border">Shift+Enter</kbd> for newline
          </p>
        </form>
      </div>
    </div>
  );
};
