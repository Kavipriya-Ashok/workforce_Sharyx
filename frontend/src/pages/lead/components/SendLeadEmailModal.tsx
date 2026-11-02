import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Mail,
  Sparkles,
  Send,
  Loader2,
  Building,
  Eye,
  Edit3,
  Bot,
  ShieldCheck,
  AlertTriangle,
  MessageSquare,
} from 'lucide-react';
import { emailService } from '@/service/emailService';
import { EmailValidationResult } from '@/types/email';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    company_name?: string;
    lead_status?: string;
    notes?: string;
  };
  onEmailSent?: () => void;
}

export const SendLeadEmailModal: React.FC<Props> = ({
  open,
  onOpenChange,
  lead,
  onEmailSent,
}) => {
  const [subject, setSubject] = useState(`Following up: ${lead.company_name || lead.name}`);
  const [body, setBody] = useState(
    `Hi ${lead.name},\n\nI hope you're having a productive week.\n\nI wanted to follow up on our previous touchpoint and check if you had a few minutes for a quick 15-minute sync regarding how Sharyx can support ${lead.company_name || 'your team'}.\n\nLooking forward to hearing from you!\n\nBest regards,\nTeam Sharyx`
  );
  const [customPrompt, setCustomPrompt] = useState('');
  const [intent, setIntent] = useState('Follow up after initial touchpoint');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isPreview, setIsPreview] = useState(false);
  const [wasAiDrafted, setWasAiDrafted] = useState(false);

  // 5-Layer Email Validation State
  const [validationResult, setValidationResult] = useState<EmailValidationResult | null>(null);
  const [validatingEmail, setValidatingEmail] = useState(false);

  // Validate email deliverability on modal open
  useEffect(() => {
    if (open && lead.email) {
      setValidatingEmail(true);
      emailService
        .validateEmail(lead.email)
        .then((res) => setValidationResult(res))
        .catch(() => {})
        .finally(() => setValidatingEmail(false));
    } else {
      setValidationResult(null);
    }
  }, [open, lead.email]);

  // AI Follow-up Draft Generator
  const handleAiDraft = async () => {
    try {
      setIsGenerating(true);
      const res = await emailService.generateLeadAiDraft({
        lead_id: lead.id,
        customPrompt: customPrompt.trim() || 'Write a personalized, warm follow-up email proposing a quick 15-minute call.',
        intent,
      });

      if (res?.subject) setSubject(res.subject);
      if (res?.body_html) {
        // Strip HTML tags for clean textarea editing
        const plainText = res.body_html
          .replace(/<br\s*[\/]?>/gi, '\n')
          .replace(/<\/p>/gi, '\n\n')
          .replace(/<[^>]+>/g, '')
          .trim();
        setBody(plainText);
        setWasAiDrafted(true);
      }
      toast.success('AI Draft Generated! You can edit the text before sending.');
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'AI Draft generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  // Dispatch Email
  const handleSend = async () => {
    if (!subject.trim()) {
      toast.error('Email subject cannot be empty.');
      return;
    }
    if (!body.trim()) {
      toast.error('Email message body cannot be empty.');
      return;
    }
    if (!lead.email) {
      toast.error('This lead has no valid email address.');
      return;
    }

    // Deliverability Gatekeeper check
    if (validationResult && !validationResult.isValid) {
      toast.error(
        `Sending blocked: ${validationResult.reason} (Score: ${validationResult.score}%). Use WhatsApp instead to protect your domain.`
      );
      return;
    }

    try {
      setIsSending(true);

      const formattedHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #1e293b;">
          ${body
            .split('\n\n')
            .map((p) => `<p style="margin: 0 0 12px 0;">${p.replace(/\n/g, '<br/>')}</p>`)
            .join('')}
        </div>
      `.trim();

      await emailService.sendLeadEmail({
        lead_id: lead.id,
        to: lead.email,
        subject: subject.trim(),
        html: formattedHtml,
        isAiDrafted: wasAiDrafted,
      });

      toast.success(`Email successfully delivered to ${lead.email}!`);
      onOpenChange(false);
      if (onEmailSent) onEmailSent();
    } catch (err: any) {
      toast.error(
        err.response?.data?.message ||
          err.message ||
          'Failed to deliver email. Please check your Gmail connection in Email Settings.'
      );
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader className="border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/60 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <Mail className="h-4 w-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold flex items-center gap-2">
                  Send Email to {lead.name}
                  {lead.lead_status && (
                    <Badge variant="outline" className="border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-normal">
                      {lead.lead_status}
                    </Badge>
                  )}
                </DialogTitle>
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  <span className="font-mono text-blue-600 dark:text-blue-400">{lead.email}</span>
                  {lead.company_name && (
                    <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                      • <Building className="h-3 w-3" /> {lead.company_name}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsPreview(!isPreview)}
              className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            >
              {isPreview ? <Edit3 className="h-3.5 w-3.5 mr-1" /> : <Eye className="h-3.5 w-3.5 mr-1" />}
              {isPreview ? 'Edit' : 'Preview'}
            </Button>
          </div>
        </DialogHeader>

        {/* ── 5-LAYER EMAIL VALIDATION & DELIVERABILITY GATEKEEPER ──── */}
        {validatingEmail ? (
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600 dark:text-blue-400" />
            <span>Validating DNS MX records, syntax, and mailbox deliverability...</span>
          </div>
        ) : validationResult ? (
          validationResult.isValid ? (
            <div className="flex items-center justify-between px-3 py-2 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800/60 text-xs">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                <ShieldCheck className="h-4 w-4" />
                <span>
                  <strong>Deliverability Score: {validationResult.score}%</strong> • Active MX ({validationResult.mxHost || 'Verified'})
                </span>
              </div>
              <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold">Safe to send</span>
            </div>
          ) : (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-800/60 text-xs space-y-2">
              <div className="flex items-start gap-2 text-rose-700 dark:text-rose-300">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold">
                    Deliverability Warning (Score: {validationResult.score}%)
                  </div>
                  <div className="text-[11px] text-rose-600 dark:text-rose-400">{validationResult.reason}</div>
                </div>
              </div>

              {lead.phone && (
                <div className="flex items-center justify-between pt-1 border-t border-rose-200 dark:border-rose-800/60">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">Omnichannel Fallback Recommended:</span>
                  <a
                    href={`https://wa.me/${lead.phone.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 transition-colors"
                  >
                    <MessageSquare className="h-3 w-3" /> Route via WhatsApp Instead
                  </a>
                </div>
              )}
            </div>
          )
        ) : null}

        {/* ── AI DRAFT ASSISTANT BOX ─────────────────────────────────── */}
        <div className="rounded-2xl border border-indigo-200 dark:border-indigo-800/60 bg-gradient-to-b from-indigo-50/70 to-blue-50/40 dark:from-indigo-950/40 dark:to-slate-900/40 p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
              <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              AI Follow-up Copilot
            </span>
            <Button
              size="sm"
              onClick={handleAiDraft}
              disabled={isGenerating}
              className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl shadow-xs"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
                  Drafting with AI...
                </>
              ) : (
                <>
                  <Bot className="h-3.5 w-3.5 mr-1.5" />
                  Draft with AI
                </>
              )}
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <Input
                placeholder="e.g. Mention 10% discount this month, offer quick 15-min zoom..."
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                className="h-8 text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 rounded-xl"
              />
            </div>
            <div>
              <Input
                placeholder="Goal: Quick demo sync"
                value={intent}
                onChange={(e) => setIntent(e.target.value)}
                className="h-8 text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 rounded-xl"
              />
            </div>
          </div>
        </div>

        {/* ── MESSAGE FORM ─────────────────────────────────────────── */}
        <div className="space-y-3 pt-1">
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 block">Subject Line</label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Quick follow-up regarding our conversation"
              className="bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs h-9 rounded-xl"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 block">
              {isPreview ? 'Email Preview' : 'Message Body'}
            </label>
            {isPreview ? (
              <div className="min-h-[180px] p-4 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-xl border border-slate-200 dark:border-slate-800 font-sans text-xs leading-relaxed overflow-y-auto max-h-[260px]">
                {body.split('\n\n').map((paragraph, idx) => (
                  <p key={idx} className="mb-3 whitespace-pre-wrap">
                    {paragraph}
                  </p>
                ))}
              </div>
            ) : (
              <Textarea
                rows={8}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Type your email message here..."
                className="bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs leading-relaxed font-sans resize-none rounded-xl"
              />
            )}
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between border-t border-slate-100 dark:border-slate-800 pt-3 mt-1">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Sent via authenticated Gmail / Mailbox
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSend}
              disabled={isSending || (validationResult !== null && !validationResult.isValid)}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold h-9 px-4 rounded-xl shadow-xs shadow-blue-600/20 disabled:opacity-50"
            >
              {isSending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5 mr-1.5" />
                  Send Email
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
