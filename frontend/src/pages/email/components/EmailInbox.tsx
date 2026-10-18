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
    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 h-[720px] rounded-2xl overflow-hidden glass border border-slate-800">
      {/* LEFT: Email Threads List */}
      <div className="md:col-span-5 border-r border-slate-800 flex flex-col bg-slate-950/40">
        <div className="p-4 border-b border-slate-800/80">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-100 flex items-center gap-2">
              <Mail className="h-4 w-4 text-indigo-400" />
              Two-Way Email Mailbox
            </h3>
            <Button variant="ghost" size="icon" onClick={fetchInbox} className="h-7 w-7">
              <RefreshCw className="h-3.5 w-3.5 text-slate-400" />
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <Input
              placeholder="Search sender, subject..."
              className="pl-9 h-9 text-xs"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-800/40">
          {filteredEmails.map((email) => {
            const isSelected = selectedEmail?.id === email.id;
            const isInbound = email.direction === 'inbound';
            return (
              <div
                key={email.id}
                onClick={() => setSelectedEmail(email)}
                className={`p-3.5 cursor-pointer transition-all hover:bg-slate-800/50 flex flex-col gap-1.5 ${
                  isSelected ? 'bg-indigo-950/30 border-l-4 border-indigo-500' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {isInbound ? (
                      <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <ArrowUpRight className="h-3.5 w-3.5 text-indigo-400" />
                    )}
                    <span className="text-xs font-semibold text-slate-200 truncate max-w-[180px]">
                      {isInbound ? email.from_email : `To: ${email.to_email}`}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 shrink-0">
                    {new Date(email.created_on).toLocaleDateString([], {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>

                <p className="text-xs font-medium text-white truncate">{email.subject}</p>
                <p className="text-xs text-slate-400 truncate">
                  {email.body_text || 'No preview available'}
                </p>

                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={isInbound ? 'success' : 'purple'} className="text-[10px] py-0">
                    {email.direction}
                  </Badge>
                  {email.is_ai_drafted && (
                    <Badge variant="purple" className="text-[10px] py-0 gap-1">
                      <Sparkles className="h-2.5 w-2.5" />
                      AI Copilot
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* RIGHT: Thread Reader & Preview */}
      <div className="md:col-span-7 flex flex-col bg-slate-900/20">
        {selectedEmail ? (
          <>
            <div className="p-5 border-b border-slate-800 flex items-start justify-between bg-slate-950/60 backdrop-blur-md">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">{selectedEmail.subject}</h3>
                <div className="flex flex-col text-xs text-slate-400 gap-0.5">
                  <p>
                    <span className="text-slate-500">From:</span> {selectedEmail.from_email}
                  </p>
                  <p>
                    <span className="text-slate-500">To:</span> {selectedEmail.to_email}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="emerald"
                  size="sm"
                  onClick={() => setReplyOpen(true)}
                  className="gap-1.5 text-xs"
                >
                  <Reply className="h-3.5 w-3.5" />
                  Reply with AI
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="p-5 rounded-2xl bg-slate-950/40 border border-slate-800/80 leading-relaxed text-sm text-slate-200 whitespace-pre-wrap font-sans">
                {selectedEmail.body_text || (
                  <div
                    dangerouslySetInnerHTML={{ __html: selectedEmail.body_html || '' }}
                  />
                )}
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Clock className="h-3.5 w-3.5" />
                <span>
                  Timestamp: {new Date(selectedEmail.created_on).toLocaleString()}
                </span>
                <span className="mx-2">•</span>
                <span>Delivery: {selectedEmail.delivery_status}</span>
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
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
            <Mail className="h-10 w-10 mb-2 opacity-40 text-indigo-400" />
            <p>Select an email thread from the inbox to read</p>
          </div>
        )}
      </div>
    </div>
  );
};
