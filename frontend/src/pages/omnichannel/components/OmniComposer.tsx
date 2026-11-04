import React, { useState } from 'react';
import {
  MessageSquare,
  Mail,
  Phone,
  Send,
  Paperclip,
  FileText,
  Sparkles,
  Smile,
  ShieldCheck,
  PhoneCall,
  Clock,
  Mic,
} from 'lucide-react';
import { toast } from 'sonner';

interface OmniComposerProps {
  initialChannel?: 'whatsapp' | 'email' | 'call';
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  aiSuggestedDraft?: string | null;
  onSend: (payload: {
    channel: 'whatsapp' | 'email' | 'call';
    body: string;
    subject?: string;
    attachments?: Array<{ name: string; url: string; mimeType?: string; size?: number }>;
  }) => Promise<void>;
  loading?: boolean;
}

export const OmniComposer: React.FC<OmniComposerProps> = ({
  initialChannel = 'whatsapp',
  customerName = 'Customer',
  customerPhone,
  customerEmail,
  aiSuggestedDraft,
  onSend,
  loading = false,
}) => {
  const [selectedChannel, setSelectedChannel] = useState<'whatsapp' | 'email' | 'call'>(initialChannel);

  // Draft safety state per channel
  const [drafts, setDrafts] = useState<{
    whatsapp: string;
    email: string;
    call: string;
    emailSubject: string;
    callOutcome: string;
  }>({
    whatsapp: '',
    email: '',
    call: '',
    emailSubject: '',
    callOutcome: 'completed',
  });

  const [attachments, setAttachments] = useState<Array<{ name: string; url: string }>>([]);

  const currentText = drafts[selectedChannel];

  const updateCurrentText = (text: string) => {
    setDrafts((prev) => ({
      ...prev,
      [selectedChannel]: text,
    }));
  };

  const handleApplyAiDraft = () => {
    if (aiSuggestedDraft) {
      updateCurrentText(aiSuggestedDraft);
      toast.success('AI response draft applied to composer');
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentText.trim() && selectedChannel !== 'call') return;

    try {
      await onSend({
        channel: selectedChannel,
        body: currentText.trim() || `Outbound phone follow-up logged: ${drafts.callOutcome}`,
        subject: selectedChannel === 'email' ? drafts.emailSubject || 'Follow-up regarding inquiry' : undefined,
        attachments: attachments.length > 0 ? attachments : undefined,
      });

      // Clear draft for this channel
      setDrafts((prev) => ({
        ...prev,
        [selectedChannel]: '',
        ...(selectedChannel === 'email' ? { emailSubject: '' } : {}),
      }));
      setAttachments([]);
    } catch {
      // Error handled by parent
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-3 sm:p-4 shrink-0 space-y-3">
      {/* ── AI DRAFT SUGGESTION BANNER (Tab to complete) ── */}
      {aiSuggestedDraft && !currentText && (
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/40 dark:to-purple-950/40 border border-indigo-200/80 dark:border-indigo-800/60 text-xs animate-in fade-in">
          <div className="flex items-center gap-2 min-w-0 pr-2">
            <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span className="font-semibold text-indigo-950 dark:text-indigo-200 shrink-0">
              AI Copilot Draft:
            </span>
            <span className="text-slate-600 dark:text-slate-300 truncate">
              "{aiSuggestedDraft}"
            </span>
          </div>

          <button
            type="button"
            onClick={handleApplyAiDraft}
            className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-[11px] shrink-0 shadow-xs cursor-pointer transition-colors"
          >
            Insert Draft (Tab)
          </button>
        </div>
      )}

      {/* ── CHANNEL SELECTOR & METADATA BAR ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80">
          <button
            type="button"
            onClick={() => setSelectedChannel('whatsapp')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              selectedChannel === 'whatsapp'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-emerald-600'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>WhatsApp</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedChannel('email')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              selectedChannel === 'email'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-blue-600'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Email</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedChannel('call')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              selectedChannel === 'call'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-amber-600'
            }`}
          >
            <Phone className="w-3.5 h-3.5" />
            <span>Voice Call</span>
          </button>
        </div>

        {/* Channel Status Cue */}
        {selectedChannel === 'whatsapp' && (
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800/60">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>24h Service Window Active</span>
          </div>
        )}
        {selectedChannel === 'email' && (
          <div className="text-[11px] text-slate-500 font-medium">
            From: <span className="font-semibold text-slate-700 dark:text-slate-300">support@sharyx.ai</span>
          </div>
        )}
        {selectedChannel === 'call' && (
          <div className="flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-400 font-semibold bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-lg border border-amber-200 dark:border-amber-800/60">
            <Mic className="w-3.5 h-3.5" />
            <span>Vapi Telephony Softphone Ready</span>
          </div>
        )}
      </div>

      {/* ── EMAIL SUBJECT LINE (Conditional) ── */}
      {selectedChannel === 'email' && (
        <input
          type="text"
          placeholder="Email Subject Line..."
          value={drafts.emailSubject}
          onChange={(e) => setDrafts((prev) => ({ ...prev, emailSubject: e.target.value }))}
          className="w-full text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      )}

      {/* ── CALL LOG CONTROLS (Conditional) ── */}
      {selectedChannel === 'call' && (
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">Call Outcome:</span>
          <select
            value={drafts.callOutcome}
            onChange={(e) => setDrafts((prev) => ({ ...prev, callOutcome: e.target.value }))}
            className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-700 dark:text-slate-200 font-medium"
          >
            <option value="completed">Completed Conversation</option>
            <option value="busy">Busy / Engaged</option>
            <option value="no-answer">No Answer</option>
            <option value="left-voicemail">Left Voicemail</option>
          </select>
        </div>
      )}

      {/* ── COMPOSER TEXTAREA ── */}
      <div className="relative">
        <textarea
          rows={selectedChannel === 'email' ? 3 : 2}
          value={currentText}
          onChange={(e) => updateCurrentText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Tab' && aiSuggestedDraft && !currentText) {
              e.preventDefault();
              handleApplyAiDraft();
            } else if (e.key === 'Enter' && !e.shiftKey && selectedChannel !== 'email') {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder={
            selectedChannel === 'whatsapp'
              ? `Message ${customerName} on WhatsApp (${customerPhone || 'phone'})... [Press Tab to use AI suggestion]`
              : selectedChannel === 'email'
              ? `Write email reply to ${customerEmail || customerName}...`
              : `Enter call debrief notes or details before triggering softphone dial...`
          }
          className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none font-sans leading-relaxed"
        />
      </div>

      {/* ── COMPOSER TOOLBAR & DISPATCH BUTTON ── */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            title="Attach file"
            onClick={() => {
              const url = prompt('Enter public URL of attachment:');
              if (url) {
                setAttachments((prev) => [...prev, { name: 'Attached_File.pdf', url }]);
                toast.success('File attached');
              }
            }}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-xs flex items-center gap-1"
          >
            <Paperclip className="w-3.5 h-3.5" />
            <span className="text-[11px] font-medium hidden sm:inline">Attach</span>
          </button>

          {selectedChannel === 'whatsapp' && (
            <button
              type="button"
              onClick={() => {
                updateCurrentText('Hello! Thanks for reaching out to Sharyx Workforce. How can we assist your business today?');
                toast.info('Meta WhatsApp Template applied');
              }}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-xs flex items-center gap-1"
            >
              <FileText className="w-3.5 h-3.5" />
              <span className="text-[11px] font-medium hidden sm:inline">Template</span>
            </button>
          )}

          {attachments.length > 0 && (
            <span className="text-[10px] bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full font-bold">
              {attachments.length} attached
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => handleSend()}
          disabled={loading || (!currentText.trim() && selectedChannel !== 'call')}
          className={`h-9 px-4 rounded-xl font-bold text-xs flex items-center gap-2 shadow-xs transition-all disabled:opacity-50 cursor-pointer ${
            selectedChannel === 'whatsapp'
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20'
              : selectedChannel === 'email'
              ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20'
              : 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-500/20'
          }`}
        >
          {loading ? (
            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : selectedChannel === 'call' ? (
            <PhoneCall className="w-3.5 h-3.5" />
          ) : (
            <Send className="w-3.5 h-3.5" />
          )}
          <span>
            {loading
              ? 'Dispatching...'
              : selectedChannel === 'whatsapp'
              ? 'Send WhatsApp'
              : selectedChannel === 'email'
              ? 'Send Email'
              : 'Log Call / Dial'}
          </span>
        </button>
      </div>
    </div>
  );
};

