import React, { useState } from 'react';
import {
  MessageSquare,
  Mail,
  Phone,
  Paperclip,
  Check,
  CheckCheck,
  Play,
  Pause,
  ExternalLink,
  ArrowDownLeft,
  ArrowUpRight,
  Sparkles,
  Bot,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export interface TimelineEventItem {
  id: string;
  channel: 'whatsapp' | 'email' | 'call' | 'system' | 'activity';
  direction?: 'in' | 'out' | 'inbound' | 'outbound';
  timestamp: string | Date;
  title?: string;
  body?: string;
  subject?: string;
  sender_info?: string;
  status?: string;
  duration?: number;
  recording_url?: string | null;
  transcript?: string | null;
  ai_summary?: string | null;
  outcome?: string | null;
  attachments?: Array<{ name: string; url: string; mimeType?: string; size?: number }>;
}

interface TimelineItemProps {
  item: TimelineEventItem;
  customerName?: string;
  playingAudioId: string | null;
  onToggleAudio: (id: string, url: string | null | undefined) => void;
}

export const TimelineItem: React.FC<TimelineItemProps> = ({
  item,
  customerName = 'Customer',
  playingAudioId,
  onToggleAudio,
}) => {
  const [showTranscript, setShowTranscript] = useState(false);
  const [emailExpanded, setEmailExpanded] = useState(true);

  const formattedTime = item.timestamp
    ? format(new Date(item.timestamp), 'h:mm a')
    : '';

  // 1. VOICE CALL CARD
  if (item.channel === 'call') {
    const isInbound = item.direction === 'inbound';
    const durMin = Math.floor((item.duration || 0) / 60);
    const durSec = (item.duration || 0) % 60;
    const durStr = `${durMin > 0 ? `${durMin}m ` : ''}${durSec}s`;

    return (
      <div className="bg-white dark:bg-slate-900 border border-amber-200/80 dark:border-amber-900/40 rounded-2xl p-4 shadow-xs space-y-3 transition-all hover:border-amber-300 dark:hover:border-amber-800">
        {/* Header Ribbon */}
        <div className="flex items-center justify-between gap-3 border-b border-amber-100 dark:border-amber-900/30 pb-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center font-bold">
              <Phone className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  {isInbound ? 'Voice Call Inbound' : 'Outbound Voice Call'}
                </span>
                <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                  {durStr}
                </span>
                {item.outcome && (
                  <span className="text-[10px] uppercase font-bold text-slate-400">
                    • {item.outcome}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                Connected with {customerName}
              </p>
            </div>
          </div>
          <span className="text-xs text-slate-400 font-medium">{formattedTime}</span>
        </div>

        {/* AI Summary Banner */}
        {item.ai_summary && (
          <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 text-xs text-amber-950 dark:text-amber-200 leading-relaxed">
            <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-300 mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Call Summary</span>
            </div>
            {item.ai_summary}
          </div>
        )}

        {/* Audio Player */}
        {item.recording_url && (
          <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => onToggleAudio(item.id, item.recording_url)}
                className="w-8 h-8 rounded-full bg-amber-600 hover:bg-amber-700 text-white flex items-center justify-center transition-colors shadow-xs cursor-pointer"
              >
                {playingAudioId === item.id ? (
                  <Pause className="w-3.5 h-3.5" />
                ) : (
                  <Play className="w-3.5 h-3.5 ml-0.5" />
                )}
              </button>
              <div>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Call Audio Recording
                </p>
                <p className="text-[10px] text-slate-400">
                  {playingAudioId === item.id ? 'Playing audio...' : `Audio Length: ${durStr}`}
                </p>
              </div>
            </div>

            <audio
              id={`audio-${item.id}`}
              src={item.recording_url}
              onEnded={() => onToggleAudio(item.id, null)}
              className="hidden"
            />

            <a
              href={item.recording_url}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-amber-600 dark:text-amber-400 hover:underline inline-flex items-center gap-1 font-medium"
            >
              <ExternalLink className="w-3 h-3" />
              <span>Download</span>
            </a>
          </div>
        )}

        {/* Transcript Accordion */}
        {item.transcript && (
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowTranscript(!showTranscript)}
              className="text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 cursor-pointer"
            >
              <span>{showTranscript ? 'Hide Full Transcript' : 'View Full Transcript'}</span>
              {showTranscript ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showTranscript && (
              <div className="mt-2 text-xs font-mono text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700 max-h-56 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                {item.transcript}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // 2. EMAIL THREAD CARD
  if (item.channel === 'email') {
    const isOutbound = item.direction === 'out';

    return (
      <div className="bg-white dark:bg-slate-900 border border-blue-200/80 dark:border-blue-900/40 rounded-2xl p-4 shadow-xs space-y-3 transition-all hover:border-blue-300 dark:hover:border-blue-800">
        <div className="flex items-start justify-between gap-3 border-b border-blue-100 dark:border-blue-900/30 pb-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 flex items-center justify-center font-bold shrink-0">
              <Mail className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                  {isOutbound ? 'Email Sent • Auto Pilot' : 'Email Inbound'}
                </span>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">
                  {item.sender_info || (isOutbound ? 'Support Desk' : customerName)}
                </span>
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate mt-1">
                {item.subject || '(No Subject)'}
              </h4>
            </div>
          </div>
          <span className="text-xs text-slate-400 font-medium shrink-0">{formattedTime}</span>
        </div>

        {/* Email Body */}
        {emailExpanded && (
          <div className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed bg-slate-50/50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
            {item.body}
          </div>
        )}

        {/* Attachments */}
        {item.attachments && item.attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
            {item.attachments.map((att, idx) => (
              <a
                key={idx}
                href={att.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 transition-colors font-medium"
              >
                <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                <span>{att.name || 'Attachment'}</span>
              </a>
            ))}
          </div>
        )}
      </div>
    );
  }

  // 3. WHATSAPP CHAT BUBBLE
  if (item.channel === 'whatsapp') {
    const isOutbound = item.direction === 'out';

    return (
      <div className={`flex flex-col ${isOutbound ? 'items-end' : 'items-start'} my-1`}>
        <div
          className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-2.5 shadow-xs text-xs space-y-1.5 ${
            isOutbound
              ? 'bg-emerald-600 text-white rounded-tr-none'
              : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-tl-none'
          }`}
        >
          {/* Sender header for incoming */}
          {!isOutbound && (
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mb-0.5">
              <MessageSquare className="w-3 h-3" />
              <span>{customerName} (WhatsApp)</span>
            </div>
          )}

          <p className="whitespace-pre-wrap leading-relaxed text-xs">{item.body}</p>

          {/* Attachments */}
          {item.attachments && item.attachments.length > 0 && (
            <div className="space-y-1 pt-1">
              {item.attachments.map((att, idx) => (
                <a
                  key={idx}
                  href={att.url}
                  target="_blank"
                  rel="noreferrer"
                  className={`flex items-center gap-1.5 text-xs underline font-medium ${
                    isOutbound ? 'text-emerald-100' : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  <Paperclip className="w-3.5 h-3.5" />
                  <span>{att.name || 'Attachment'}</span>
                </a>
              ))}
            </div>
          )}

          {/* Bottom Timestamp & Delivery Ticks */}
          <div
            className={`flex items-center justify-end gap-1 text-[10px] pt-0.5 ${
              isOutbound ? 'text-emerald-100/90' : 'text-slate-400'
            }`}
          >
            <span>{formattedTime}</span>
            {isOutbound && (
              <span>
                {item.status === 'read' ? (
                  <CheckCheck className="w-3.5 h-3.5 text-sky-200" />
                ) : item.status === 'delivered' ? (
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
  }

  // 4. SYSTEM DIVIDER / LOG
  return (
    <div className="flex items-center justify-center my-3">
      <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-500 font-medium">
        <Bot className="w-3 h-3 text-indigo-500" />
        <span>{item.body || item.title || 'System action logged'}</span>
        <span className="text-slate-400">• {formattedTime}</span>
      </div>
    </div>
  );
};

