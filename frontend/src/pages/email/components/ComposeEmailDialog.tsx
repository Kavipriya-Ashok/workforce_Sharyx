import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { emailService } from '@/service/emailService';
import { Mail, Sparkles, Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTo?: string;
  defaultSubject?: string;
  onSent?: () => void;
}

export const ComposeEmailDialog: React.FC<Props> = ({
  open,
  onOpenChange,
  defaultTo = '',
  defaultSubject = '',
  onSent,
}) => {
  const [to, setTo] = useState(defaultTo);
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [drafting, setDrafting] = useState(false);

  useEffect(() => {
    if (open) {
      setTo(defaultTo);
      setSubject(defaultSubject);
      setBody('');
    }
  }, [open, defaultTo, defaultSubject]);

  const handleGenerateAIDraft = async () => {
    if (!to && !subject) {
      toast.info('Enter recipient or subject so the AI knows what to draft about.');
    }
    setDrafting(true);
    try {
      const res = await emailService.generateAIDraft({
        from_email: to,
        subject: subject || 'Partnership inquiry',
        incoming_body: body || 'Interested in learning more about your enterprise plans.',
      });
      if (res?.draft) {
        setBody(res.draft);
        if (!subject && res.subject) setSubject(res.subject);
        toast.success('AI draft generated successfully!');
      }
    } catch {
      toast.error('Failed to generate AI draft');
    } finally {
      setDrafting(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!to || !subject || !body) {
      toast.error('Please fill in recipient, subject, and message body');
      return;
    }

    setSending(true);
    try {
      await emailService.sendEmail({
        to: to.trim(),
        subject: subject.trim(),
        html: `<p>${body.replace(/\n/g, '<br/>')}</p>`,
      });
      toast.success(`Email sent to ${to}!`);
      onOpenChange(false);
      setTo('');
      setSubject('');
      setBody('');
      if (onSent) onSent();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to dispatch email');
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400">
            <Mail className="h-5 w-5" />
            <DialogTitle>Compose Email</DialogTitle>
          </div>
          <DialogDescription>
            Dispatch outbound emails or use the AI Copilot to generate an executive draft.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSend} className="space-y-4 mt-2">
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Recipient Email
            </label>
            <Input
              type="email"
              placeholder="client@company.com"
              className="mt-1"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Subject
            </label>
            <Input
              placeholder="e.g. Sharyx Workforce Enterprise Proposal"
              className="mt-1"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Email Message
              </label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleGenerateAIDraft}
                disabled={drafting}
                className="h-7 text-xs text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/50"
              >
                {drafting ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Drafting...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-1.5 h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                    Auto-Draft with AI
                  </>
                )}
              </Button>
            </div>
            <Textarea
              rows={8}
              placeholder="Dear Client..."
              className="font-sans text-xs sm:text-sm"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
            />
          </div>

          <div className="pt-2 flex justify-end space-x-2 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            >
              Discard
            </Button>
            <Button
              type="submit"
              disabled={sending}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs"
            >
              {sending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send Email
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
