import React, { useState, useEffect } from 'react';
import { EmailLog } from '@/types/email';
import { emailService } from '@/service/emailService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Mail,
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  Sparkles,
  Reply,
  RefreshCw,
  Clock,
  User,
} from 'lucide-react';
import { ComposeEmailDialog } from './ComposeEmailDialog';

const formatDate = (dateStr?: string | Date) => {
  if (!dateStr) return 'Recently';
  const d = new Date(dateStr);
  return isNaN(d.getTime())
    ? 'Recently'
    : d.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

const formatFullDate = (dateStr?: string | Date) => {
  if (!dateStr) return 'Recently';
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? 'Recently' : d.toLocaleString();
};

export const EmailInbox: React.FC = () => {
  const [emails, setEmails] = useState<EmailLog[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<EmailLog | null>(null);
  const [search, setSearch] = useState('');
  const [replyOpen, setReplyOpen] = useState(false);

  const fetchInbox = async () => {
    try {
      const data = await emailService.getInbox();
      const list = Array.isArray(data) ? data : [];
      setEmails(list);
      if (!selectedEmail && list.length > 0) {
        setSelectedEmail(list[0]);
      }
    } catch {
      setEmails([]);
    }
  };

  useEffect(() => {
    fetchInbox();
    const interval = setInterval(fetchInbox, 15000);
    return () => clearInterval(interval);
  }, []);

  const emailList = Array.isArray(emails) ? emails : [];
  const filteredEmails = emailList.filter(
    (e) =>
      e?.subject?.toLowerCase().includes(search.toLowerCase()) ||
      e?.from_email?.toLowerCase().includes(search.toLowerCase()) ||
      e?.to_email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-0 h-[calc(100vh-140px)] min-h-[580px] rounded-2xl overflow-hidden bg-white border border-slate-200 shadow-xs">
      {/* LEFT: Email Threads List */}
      <div className="md:col-span-5 border-r border-slate-200 flex flex-col h-full bg-slate-50/50 overflow-hidden">
        <div className="shrink-0 p-4 border-b border-slate-200 bg-white">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Mail className="h-4 w-4 text-blue-600" />
              Two-Way Email Mailbox
            </h3>
            <Button
              variant="outline"
              size="icon"
              onClick={fetchInbox}
              className="h-7 w-7 rounded-lg border-slate-200 text-slate-600 hover:text-slate-900"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search sender, subject..."
              className="pl-9 h-9 text-xs bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-500 rounded-xl"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {filteredEmails.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No email conversations found
            </div>
          ) : (
            filteredEmails.map((email) => {
              const isSelected = selectedEmail?.id === email.id;
              const isInbound = email.direction === 'inbound';
              return (
                <div
                  key={email.id}
                  onClick={() => setSelectedEmail(email)}
                  className={`p-3.5 cursor-pointer transition-all flex flex-col gap-1.5 ${
                    isSelected
                      ? 'bg-blue-50/90 border-l-4 border-blue-600 shadow-xs'
                      : 'hover:bg-slate-100/70'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {isInbound ? (
                        <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      ) : (
                        <ArrowUpRight className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                      )}
                      <span className="text-xs font-bold text-slate-900 truncate max-w-[190px]">
                        {isInbound ? email.from_email : `To: ${email.to_email}`}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0 font-medium">
                      {formatDate(email.created_on)}
                    </span>
                  </div>

                  <p className="text-xs font-semibold text-slate-800 truncate">{email.subject}</p>
                  <p className="text-xs text-slate-500 truncate leading-relaxed">
                    {email.body_text || 'No preview available'}
                  </p>

                  <div className="flex items-center gap-2 mt-0.5">
                    <span
                      className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                        isInbound
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                      }`}
                    >
                      {email.direction}
                    </span>
                    {email.is_ai_drafted && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1">
                        <Sparkles className="h-2.5 w-2.5 text-purple-600" />
                        AI Copilot
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT: Thread Reader & Preview */}
      <div className="md:col-span-7 flex flex-col h-full bg-white overflow-hidden">
        {selectedEmail ? (
          <>
            <div className="shrink-0 p-5 border-b border-slate-200 flex items-start justify-between bg-slate-50/60">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">{selectedEmail.subject}</h3>
                <div className="flex flex-col text-xs text-slate-600 gap-0.5 font-medium">
                  <p>
                    <span className="text-slate-400">From:</span> {selectedEmail.from_email}
                  </p>
                  <p>
                    <span className="text-slate-400">To:</span> {selectedEmail.to_email}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => setReplyOpen(true)}
                  className="gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white shadow-sm font-semibold rounded-xl"
                >
                  <Reply className="h-3.5 w-3.5" />
                  Reply with AI
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0 bg-white">
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 leading-relaxed text-sm text-slate-800 whitespace-pre-wrap font-sans shadow-xs">
                {selectedEmail.body_text || (
                  <div
                    dangerouslySetInnerHTML={{ __html: selectedEmail.body_html || '' }}
                  />
                )}
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                <Clock className="h-3.5 w-3.5 text-slate-400" />
                <span>
                  Timestamp: {formatFullDate(selectedEmail.created_on)}
                </span>
                <span className="mx-1">•</span>
                <span className="capitalize">Delivery: {selectedEmail.delivery_status}</span>
              </div>
            </div>

            {/* Quick Reply Trigger Dialog */}
            <ComposeEmailDialog
              open={replyOpen}
              onOpenChange={setReplyOpen}
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
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <Mail className="h-10 w-10 mb-2 opacity-30 text-blue-500" />
            <p className="text-xs font-medium">Select an email thread from the inbox to read</p>
          </div>
        )}
      </div>
    </div>
  );
};
