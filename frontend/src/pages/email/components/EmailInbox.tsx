import React, { useState, useEffect } from 'react';
import { EmailLog } from '@/types/email';
import { emailService } from '@/service/emailService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Mail,
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  Sparkles,
  Reply,
  RefreshCw,
  Clock,
  Inbox,
  Send,
  Loader2,
  Copy,
  Check,
  Forward,
  Star,
  Archive,
  Trash2,
  FileEdit,
  MoreVertical,
  Filter,
} from 'lucide-react';
import { ComposeEmailDialog } from './ComposeEmailDialog';
import { toast } from 'sonner';

interface EmailInboxProps {
  onOpenCompose?: () => void;
}

type MailboxFolder = 'inbox' | 'sent' | 'drafts' | 'starred' | 'archive' | 'trash';

const formatSmartDate = (dateStr?: string | Date) => {
  if (!dateStr) return 'Recently';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'Recently';

  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours < 24 && now.getDate() === d.getDate()) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (yesterday.getDate() === d.getDate() && yesterday.getMonth() === d.getMonth()) {
    return 'Yesterday';
  }

  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

const formatFullDate = (dateStr?: string | Date) => {
  if (!dateStr) return 'Recently';
  const d = new Date(dateStr);
  return isNaN(d.getTime())
    ? 'Recently'
    : d.toLocaleString([], {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
};

export const EmailInbox: React.FC<EmailInboxProps> = ({ onOpenCompose }) => {
  const [emails, setEmails] = useState<EmailLog[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<EmailLog | null>(null);
  const [search, setSearch] = useState('');
  const [activeFolder, setActiveFolder] = useState<MailboxFolder>('inbox');
  const [starredIds, setStarredIds] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [composeModalOpen, setComposeModalOpen] = useState(false);

  // In-pane Quick Reply state
  const [replyBody, setReplyBody] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [draftingAI, setDraftingAI] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  const fetchInbox = async () => {
    try {
      setLoading(true);
      const data = await emailService.getInbox();
      const list = Array.isArray(data) ? data : [];
      setEmails(list);

      // Select first or maintain current selection
      if (list.length > 0) {
        setSelectedEmail((prev) => {
          if (!prev) return list[0];
          const found = list.find((item) => item.id === prev.id);
          return found || list[0];
        });
      }
    } catch {
      setEmails([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInbox();
    const interval = setInterval(fetchInbox, 20000);
    return () => clearInterval(interval);
  }, []);

  const emailList = Array.isArray(emails) ? emails : [];

  // Filter based on active folder & search keyword
  const filteredEmails = emailList.filter((e) => {
    const matchesFolder =
      activeFolder === 'inbox'
        ? e.direction === 'inbound' || (!e.direction && !e.is_ai_drafted)
        : activeFolder === 'sent'
        ? e.direction === 'outbound'
        : activeFolder === 'drafts'
        ? Boolean(e.is_ai_drafted)
        : activeFolder === 'starred'
        ? Boolean(starredIds[e.id])
        : true;

    const query = search.toLowerCase().trim();
    const matchesSearch =
      !query ||
      e?.subject?.toLowerCase().includes(query) ||
      e?.from_email?.toLowerCase().includes(query) ||
      e?.to_email?.toLowerCase().includes(query) ||
      e?.body_text?.toLowerCase().includes(query);

    return matchesFolder && matchesSearch;
  });

  // Calculate folder counts
  const inboxCount = emailList.filter((e) => e.direction === 'inbound' || !e.direction).length;
  const sentCount = emailList.filter((e) => e.direction === 'outbound').length;
  const draftsCount = emailList.filter((e) => e.is_ai_drafted).length;
  const starredCount = Object.values(starredIds).filter(Boolean).length;

  const toggleStar = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setStarredIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Handle Quick Reply in reading pane
  const handleQuickSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmail || !replyBody.trim()) return;

    const recipient =
      selectedEmail.direction === 'inbound'
        ? selectedEmail.from_email
        : selectedEmail.to_email;

    const replySubject = selectedEmail.subject.startsWith('Re:')
      ? selectedEmail.subject
      : `Re: ${selectedEmail.subject}`;

    setSendingReply(true);
    try {
      await emailService.sendEmail({
        to: recipient,
        subject: replySubject,
        html: `<p>${replyBody.replace(/\n/g, '<br/>')}</p>`,
      });
      toast.success(`Reply dispatched to ${recipient}!`);
      setReplyBody('');
      await fetchInbox();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to dispatch email reply');
    } finally {
      setSendingReply(false);
    }
  };

  // Generate AI Draft in quick reply
  const handleGenerateAIDraft = async () => {
    if (!selectedEmail) return;
    setDraftingAI(true);
    try {
      const recipient =
        selectedEmail.direction === 'inbound'
          ? selectedEmail.from_email
          : selectedEmail.to_email;

      const res = await emailService.generateAIDraft({
        from_email: recipient,
        subject: selectedEmail.subject,
        incoming_body: selectedEmail.body_text || selectedEmail.body_html || 'Inquiry',
      });

      if (res?.draft) {
        setReplyBody(res.draft);
        toast.success('AI response drafted! Review and send.');
      }
    } catch {
      toast.error('Failed to generate AI response draft');
    } finally {
      setDraftingAI(false);
    }
  };

  const copyEmailContent = () => {
    if (!selectedEmail) return;
    const content = `Subject: ${selectedEmail.subject}\nFrom: ${selectedEmail.from_email}\nTo: ${selectedEmail.to_email}\nDate: ${formatFullDate(selectedEmail.created_on)}\n\n${selectedEmail.body_text || ''}`;
    navigator.clipboard.writeText(content);
    setCopiedId(true);
    toast.success('Email thread copied to clipboard');
    setTimeout(() => setCopiedId(false), 2000);
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-215px)] min-h-[480px] rounded-xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-[0_1px_3px_0_rgba(15,23,42,0.06),0_1px_2px_-1px_rgba(15,23,42,0.04)] transition-colors">
      {/* ── PANEL 1: Email Folders Navigation Rail (~180px) ── */}
      <div className="w-full lg:w-48 shrink-0 border-b lg:border-b-0 lg:border-r border-slate-300 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/90 p-3 flex flex-row lg:flex-col justify-between overflow-x-auto">
        <div className="space-y-1 w-full flex flex-row lg:flex-col gap-1 lg:gap-1">
          <button
            onClick={() => setActiveFolder('inbox')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeFolder === 'inbox'
                ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Inbox className="h-4 w-4" />
              <span>Inbox</span>
            </div>
            {inboxCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold">
                {inboxCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveFolder('sent')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeFolder === 'sent'
                ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Send className="h-4 w-4" />
              <span>Sent</span>
            </div>
            {sentCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                {sentCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveFolder('drafts')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeFolder === 'drafts'
                ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <FileEdit className="h-4 w-4" />
              <span>Drafts</span>
            </div>
            {draftsCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold">
                {draftsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveFolder('starred')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeFolder === 'starred'
                ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Star className="h-4 w-4" />
              <span>Starred</span>
            </div>
            {starredCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 font-bold">
                {starredCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveFolder('archive')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeFolder === 'archive'
                ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Archive className="h-4 w-4" />
              <span>Archive</span>
            </div>
          </button>

          <button
            onClick={() => setActiveFolder('trash')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeFolder === 'trash'
                ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Trash2 className="h-4 w-4" />
              <span>Trash</span>
            </div>
          </button>
        </div>
      </div>

      {/* ── PANEL 2: Conversation List Stream (~340px) ── */}
      <div className="w-full lg:w-80 shrink-0 flex flex-col h-full border-r border-slate-300 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 overflow-hidden">
        {/* Search & Refresh */}
        <div className="p-3 border-b border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
            <Input
              placeholder="Search emails..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-900 rounded-xl"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-2 text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                Clear
              </button>
            )}
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={fetchInbox}
            disabled={loading}
            title="Refresh emails"
            className="h-8 w-8 rounded-xl border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 shrink-0"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-blue-600 dark:text-blue-400' : ''}`} />
          </Button>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-200 dark:[&::-webkit-scrollbar-thumb]:bg-slate-700 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
          {filteredEmails.length === 0 ? (
            <div className="m-4 p-6 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 text-center space-y-2 text-slate-400 dark:text-slate-500">
              <Mail className="h-8 w-8 mx-auto opacity-30 text-blue-500" />
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {search ? 'No matching emails found' : 'No emails in this folder'}
              </p>
              <p className="text-[11px]">
                {search
                  ? 'Try refining your search keyword.'
                  : 'New incoming IMAP messages and outgoing emails will show here.'}
              </p>
            </div>
          ) : (
            filteredEmails.map((email) => {
              const isSelected = selectedEmail?.id === email.id;
              const isInbound = email.direction === 'inbound';
              const displayContact = isInbound ? email.from_email : email.to_email;
              const isStarred = Boolean(starredIds[email.id]);

              return (
                <div
                  key={email.id}
                  onClick={() => setSelectedEmail(email)}
                  className={`p-3 cursor-pointer transition-all flex items-start gap-2.5 ${
                    isSelected
                      ? 'bg-blue-50/90 dark:bg-blue-950/40 border-l-4 border-blue-600 shadow-2xs'
                      : 'hover:bg-slate-100/70 dark:hover:bg-slate-800/40'
                  }`}
                >
                  {/* Contact Avatar Circle */}
                  <div
                    className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 font-bold text-xs shadow-2xs ${
                      isSelected
                        ? 'bg-blue-600 text-white'
                        : 'bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60'
                    }`}
                  >
                    {displayContact ? displayContact[0].toUpperCase() : 'E'}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p
                        className={`text-xs truncate font-bold ${
                          isSelected ? 'text-blue-950 dark:text-blue-200' : 'text-slate-900 dark:text-slate-100'
                        }`}
                      >
                        {displayContact}
                      </p>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 shrink-0 font-medium">
                        {formatSmartDate(email.created_on)}
                      </span>
                    </div>

                    <p
                      className={`text-xs font-semibold truncate mt-0.5 ${
                        isSelected ? 'text-blue-900 dark:text-blue-300' : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {email.subject || '(No subject)'}
                    </p>

                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 leading-snug mt-0.5">
                      {email.body_text || 'No preview available'}
                    </p>
                  </div>

                  <button
                    onClick={(e) => toggleStar(email.id, e)}
                    className="shrink-0 p-1 text-slate-300 dark:text-slate-600 hover:text-amber-400"
                    title={isStarred ? 'Starred' : 'Star message'}
                  >
                    <Star
                      className={`h-3.5 w-3.5 ${
                        isStarred ? 'text-amber-400 fill-amber-400' : ''
                      }`}
                    />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── PANEL 3: Email Reading / Detail Pane (Flex-1) ── */}
      <div className="flex-1 flex flex-col h-full bg-white dark:bg-slate-900 overflow-hidden min-w-0">
        {selectedEmail ? (
          <>
            {/* Thread Header with Subject and Toolbar */}
            <div className="shrink-0 p-4 border-b border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 truncate leading-snug">
                  {selectedEmail.subject || '(No subject)'}
                </h3>
              </div>

              {/* Action Icons */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => toggleStar(selectedEmail.id)}
                  title="Star email"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <Star
                    className={`h-4 w-4 ${
                      starredIds[selectedEmail.id] ? 'text-amber-400 fill-amber-400' : ''
                    }`}
                  />
                </button>

                <button
                  onClick={() => setComposeModalOpen(true)}
                  title="Reply"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <Reply className="h-4 w-4" />
                </button>

                <button
                  onClick={copyEmailContent}
                  title="Copy email thread"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  {copiedId ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                </button>

                <button
                  onClick={() => setComposeModalOpen(true)}
                  title="Forward"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <Forward className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Sender / Recipient Information Card */}
            <div className="shrink-0 px-4 py-3 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/60 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-9 w-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs shrink-0">
                  {selectedEmail.from_email ? selectedEmail.from_email[0].toUpperCase() : 'E'}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                      {selectedEmail.from_email}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    To: {selectedEmail.to_email}
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-slate-400 dark:text-slate-500 shrink-0 font-medium">
                {formatFullDate(selectedEmail.created_on)}
              </div>
            </div>

            {/* Email Message Content Surface */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 min-h-0 bg-slate-50/30 dark:bg-slate-950/20">
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 leading-relaxed text-sm text-slate-800 dark:text-slate-200 shadow-2xs font-sans">
                {selectedEmail.body_html ? (
                  <div
                    className="prose prose-sm dark:prose-invert max-w-none break-words"
                    dangerouslySetInnerHTML={{ __html: selectedEmail.body_html }}
                  />
                ) : (
                  <p className="whitespace-pre-wrap font-sans text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
                    {selectedEmail.body_text || 'No message content available.'}
                  </p>
                )}
              </div>
            </div>

            {/* In-Pane Quick Reply Box */}
            <form onSubmit={handleQuickSend} className="shrink-0 p-3 sm:p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Reply className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                  Quick Reply
                </span>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateAIDraft}
                  disabled={draftingAI}
                  className="h-7 text-[11px] gap-1.5 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/80 bg-blue-50/60 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg"
                >
                  {draftingAI ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span>Drafting...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3 w-3 text-blue-500" />
                      <span>Reply with AI</span>
                    </>
                  )}
                </Button>
              </div>

              <Textarea
                placeholder="Type your response here..."
                rows={3}
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                className="w-full text-xs font-sans bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 focus:bg-white dark:focus:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 rounded-xl"
              />

              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] text-slate-400 dark:text-slate-500 hidden sm:inline">
                  Sent via authenticated Nodemailer / IMAP provider.
                </span>

                <div className="flex items-center gap-2 ml-auto">
                  {replyBody && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setReplyBody('')}
                      className="h-8 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    >
                      Clear
                    </Button>
                  )}

                  <Button
                    type="submit"
                    disabled={sendingReply || !replyBody.trim()}
                    className="h-8 px-4 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs gap-1.5"
                  >
                    {sendingReply ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-3.5 w-3.5" />
                        <span>Send Reply</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </form>

            {/* Compose / Full Reply Modal */}
            <ComposeEmailDialog
              open={composeModalOpen}
              onOpenChange={setComposeModalOpen}
              defaultTo={
                selectedEmail.direction === 'inbound'
                  ? selectedEmail.from_email
                  : selectedEmail.to_email
              }
              defaultSubject={
                selectedEmail.subject.startsWith('Re:')
                  ? selectedEmail.subject
                  : `Re: ${selectedEmail.subject}`
              }
              onSent={fetchInbox}
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center p-6 bg-slate-100/70 dark:bg-slate-950/40"><div className="p-8 rounded-2xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm text-center max-w-sm mx-auto space-y-3.5">
            <div className="h-12 w-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/60 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-2xs">
              <Mail className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Select an Email Conversation
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Choose an email from the left mailbox list to read its contents, generate AI replies, or dispatch responses.
              </p>
            </div>
            {onOpenCompose && (
              <Button
                size="sm"
                onClick={onOpenCompose}
                className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl gap-1.5 shadow-xs"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Compose New Message</span>
              </Button>
            )}
          </div></div>
        )}
      </div>
    </div>
  );
};
