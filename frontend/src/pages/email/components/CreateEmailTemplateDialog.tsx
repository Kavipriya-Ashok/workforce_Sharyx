import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { emailService } from '@/service/emailService';
import { EmailTemplate } from '@/types/email';
import { Mail, Sparkles, Eye, Code2, Plus, X } from 'lucide-react';
import { PdfTemplateSelector, OutcomeFilterSelector } from '@/components/PdfTemplateSelector';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  templateToEdit?: EmailTemplate | null;
}

const CATEGORIES = ['Sales', 'Recruitment', 'Onboarding', 'Follow-up', 'Support', 'General'];

const VARIABLE_CHIPS = [
  '{{lead_name}}', '{{company}}', '{{job_title}}', '{{meeting_url}}',
  '{{sender_name}}', '{{interview_date}}', '{{dashboard_url}}',
  '{{ticket_id}}', '{{issue_summary}}', '{{resolution_summary}}',
];

const SAMPLE_VARS: Record<string, string> = {
  lead_name: 'Rahul Sharma',
  company: 'MegaCorp Ltd',
  job_title: 'Senior Developer',
  meeting_url: 'https://meet.google.com/abc-xyz',
  sender_name: 'Kavya (Sharyx AI)',
  interview_date: '22nd Oct at 3:00 PM',
  dashboard_url: 'https://app.sharyx.com',
  ticket_id: 'TKT-20241020',
  issue_summary: 'Login issue with OAuth provider',
  resolution_summary: 'OAuth tokens refreshed successfully',
};

export const CreateEmailTemplateDialog: React.FC<Props> = ({
  open,
  onOpenChange,
  onSuccess,
  templateToEdit,
}) => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');

  const [form, setForm] = useState({
    name: '',
    category: 'General',
    subject: '',
    body_html: '<p>Hi <strong>{{lead_name}}</strong>,</p>\n<p>Thank you for reaching out!</p>\n<p>Best regards,<br/><strong>{{sender_name}}</strong><br/>Sharyx AI</p>',
    preview_text: '',
    outcome_filter: 'ALL',
    attach_pdf: false,
    pdf_template_type: '',
    pdf_title: '',
  });

  React.useEffect(() => {
    if (open) {
      if (templateToEdit) {
        setForm({
          name: templateToEdit.name || '',
          category: templateToEdit.category || 'General',
          subject: templateToEdit.subject || '',
          body_html: templateToEdit.body_html || '',
          preview_text: templateToEdit.preview_text || '',
          outcome_filter: (templateToEdit as any).outcome_filter || 'ALL',
          attach_pdf: (templateToEdit as any).attach_pdf || false,
          pdf_template_type: (templateToEdit as any).pdf_template_type || '',
          pdf_title: (templateToEdit as any).pdf_title || '',
        });
      } else {
        setForm({
          name: '',
          category: 'General',
          subject: '',
          body_html: '<p>Hi <strong>{{lead_name}}</strong>,</p>\n<p>Thank you for reaching out!</p>\n<p>Best regards,<br/><strong>{{sender_name}}</strong><br/>Sharyx AI</p>',
          preview_text: '',
          outcome_filter: 'ALL',
          attach_pdf: false,
          pdf_template_type: '',
          pdf_title: '',
        });
      }
      setActiveTab('editor');
    }
  }, [open, templateToEdit]);

  const insertVariable = (v: string) => {
    setForm(prev => ({ ...prev, body_html: prev.body_html + ' ' + v }));
  };

  const insertSubjectVariable = (v: string) => {
    setForm(prev => ({ ...prev, subject: prev.subject + ' ' + v }));
  };

  const renderPreview = (html: string) => {
    let result = html;
    for (const [key, val] of Object.entries(SAMPLE_VARS)) {
      result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'gi'), val);
    }
    return result;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.subject.trim() || !form.body_html.trim()) {
      toast.error('Name, Subject, and Body are required');
      return;
    }

    try {
      setLoading(true);
      // Extract variables from body + subject
      const allText = form.body_html + ' ' + form.subject;
      const matches = allText.match(/\{\{([^}]+)\}\}/g) || [];
      const variables = [...new Set(matches.map(m => m.replace(/\{\{|\}\}/g, '').trim()))];

      if (templateToEdit?.id) {
        await emailService.updateEmailTemplate(templateToEdit.id, { ...form, variables });
        toast.success(`Template "${form.name}" updated! ✅`);
      } else {
        await emailService.createEmailTemplate({ ...form, variables, is_active: true });
        toast.success(`Template "${form.name}" created! 🚀`);
      }

      if (onSuccess) onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save template');
    } finally {
      setLoading(false);
    }
  };

  const categoryColor: Record<string, string> = {
    Sales: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    Recruitment: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    Onboarding: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    'Follow-up': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    Support: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    General: 'bg-slate-700 text-slate-300 border-slate-600',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto bg-slate-900 border-slate-800 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-white">
            <Mail className="h-5 w-5 text-indigo-400" />
            {templateToEdit ? 'Edit Email Template' : 'Create Email Template'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Top Row: Name, Category */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 space-y-1.5">
              <Label className="text-xs text-slate-300">Template Name *</Label>
              <Input
                placeholder="e.g. Demo Invite"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="bg-slate-950 border-slate-700 text-white"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Category</Label>
              <Select value={form.category} onValueChange={val => setForm({ ...form, category: val })}>
                <SelectTrigger className="bg-slate-950 border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700 text-white">
                  {CATEGORIES.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Subject */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-slate-300">Subject Line *</Label>
              <div className="flex gap-1 flex-wrap justify-end max-w-sm">
                {['{{lead_name}}', '{{company}}', '{{job_title}}'].map(v => (
                  <button
                    type="button"
                    key={v}
                    onClick={() => insertSubjectVariable(v)}
                    className="text-[10px] px-1.5 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded hover:bg-indigo-500/30 font-mono transition-colors"
                  >
                    + {v}
                  </button>
                ))}
              </div>
            </div>
            <Input
              placeholder="e.g. {{lead_name}}, Let's schedule your Sharyx demo 🚀"
              value={form.subject}
              onChange={e => setForm({ ...form, subject: e.target.value })}
              className="bg-slate-950 border-slate-700 text-white"
              required
            />
          </div>

          {/* Preview Text */}
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-300">Email Pre-header (Preview Text)</Label>
            <Input
              placeholder="e.g. Book your personalised demo in 2 minutes..."
              value={form.preview_text}
              onChange={e => setForm({ ...form, preview_text: e.target.value })}
              className="bg-slate-950 border-slate-700 text-white"
            />
          </div>

          {/* Body Editor / Preview Tabs */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-slate-300">Email Body (HTML) *</Label>
              <div className="flex items-center gap-2">
                {/* Variable chips */}
                <div className="flex gap-1 flex-wrap max-w-xs justify-end">
                  {VARIABLE_CHIPS.slice(0, 5).map(v => (
                    <button
                      type="button"
                      key={v}
                      onClick={() => insertVariable(v)}
                      className="text-[10px] px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded hover:bg-emerald-500/30 font-mono transition-colors"
                    >
                      + {v}
                    </button>
                  ))}
                </div>
                {/* Tab switcher */}
                <div className="flex bg-slate-800 rounded-lg p-0.5 gap-0.5">
                  <button
                    type="button"
                    onClick={() => setActiveTab('editor')}
                    className={`flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-md font-medium transition-all ${activeTab === 'editor' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
                  >
                    <Code2 className="h-3 w-3" /> Editor
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('preview')}
                    className={`flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-md font-medium transition-all ${activeTab === 'preview' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
                  >
                    <Eye className="h-3 w-3" /> Preview
                  </button>
                </div>
              </div>
            </div>

            {activeTab === 'editor' ? (
              <Textarea
                rows={12}
                value={form.body_html}
                onChange={e => setForm({ ...form, body_html: e.target.value })}
                placeholder="Write HTML email body here..."
                className="bg-slate-950 border-slate-700 text-white font-mono text-xs leading-relaxed"
                required
              />
            ) : (
              <div className="rounded-xl border border-slate-700 bg-white overflow-hidden min-h-[280px]">
                {/* Email Client Simulator */}
                <div className="bg-slate-100 px-4 py-2 border-b border-slate-200">
                  <div className="text-xs text-slate-500 flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-slate-400" />
                    <span className="font-semibold text-slate-700">{renderPreview(form.subject) || 'Your Subject Line'}</span>
                  </div>
                  {form.preview_text && (
                    <p className="text-[11px] text-slate-400 mt-0.5">{renderPreview(form.preview_text)}</p>
                  )}
                </div>
                <div
                  className="p-6 text-sm text-slate-800 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: renderPreview(form.body_html) }}
                />
              </div>
            )}
          </div>

          {/* More variable chips */}
          <div className="flex gap-1 flex-wrap">
            <span className="text-[11px] text-slate-500 mr-1 self-center">More variables:</span>
            {VARIABLE_CHIPS.slice(5).map(v => (
              <button
                type="button"
                key={v}
                onClick={() => insertVariable(v)}
                className="text-[10px] px-1.5 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded hover:bg-indigo-500/30 font-mono transition-colors"
              >
                + {v}
              </button>
            ))}
          </div>

          {/* Outcome Filter + PDF — side by side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <OutcomeFilterSelector
              value={form.outcome_filter}
              onChange={(val) => setForm({ ...form, outcome_filter: val })}
            />
            <div />
          </div>

          <PdfTemplateSelector
            attachPdf={form.attach_pdf}
            pdfTemplateType={form.pdf_template_type}
            pdfTitle={form.pdf_title}
            onAttachPdfChange={(val) => setForm({ ...form, attach_pdf: val })}
            onPdfTemplateTypeChange={(val) => setForm({ ...form, pdf_template_type: val })}
            onPdfTitleChange={(val) => setForm({ ...form, pdf_title: val })}
          />

          <DialogFooter className="border-t border-slate-800 pt-3">
            <div className="flex items-center gap-2 mr-auto">
              <Badge
                variant="outline"
                className={`text-[11px] ${categoryColor[form.category] || categoryColor['General']}`}
              >
                {form.category}
              </Badge>
              <span className="text-[11px] text-slate-500">
                {(form.body_html.match(/\{\{([^}]+)\}\}/g) || []).length} variables detected
              </span>
            </div>
            <Button variant="ghost" type="button" onClick={() => onOpenChange(false)} className="text-slate-400 hover:text-white">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2">
              <Sparkles className="h-4 w-4" />
              {loading ? 'Saving...' : templateToEdit ? 'Update Template' : 'Save Template'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
