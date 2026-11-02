import React, { useState, useEffect } from 'react';
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
import { Mail, Sparkles, Eye, Code2, Plus, X, ArrowLeft, Save, LayoutTemplate } from 'lucide-react';
import { PdfTemplateSelector, OutcomeFilterSelector } from '@/components/PdfTemplateSelector';

interface Props {
  templateToEdit?: EmailTemplate | null;
  onBack: () => void;
  onSuccess?: () => void;
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
  interview_date: 'tomorrow at 3:00 PM IST',
  dashboard_url: 'https://app.sharyx.com',
  ticket_id: 'SHX-9941',
  issue_summary: 'Feature Inquiry',
  resolution_summary: 'Resolved by AI Copilot',
};

export const EmailTemplateEditorPage: React.FC<Props> = ({
  templateToEdit,
  onBack,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [previewMode, setPreviewMode] = useState<'edit' | 'preview'>('edit');
  const [variables, setVariables] = useState<string[]>([]);
  const [newVar, setNewVar] = useState('');

  const [form, setForm] = useState({
    name: '',
    category: 'General',
    subject: '',
    body_html: '',
    preview_text: '',
    outcome_filter: 'ALL',
    attach_pdf: false,
    pdf_template_type: '',
    pdf_title: '',
  });

  useEffect(() => {
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
      setVariables(templateToEdit.variables || []);
    } else {
      setForm({
        name: '',
        category: 'General',
        subject: 'Welcome to Sharyx AI — Your Account Details',
        body_html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; rounded: 12px;">
  <h2 style="color: #1e40af;">Hello {{lead_name}},</h2>
  <p>Thank you for reaching out to <strong>Sharyx Workforce</strong>. We have confirmed your session details:</p>
  <div style="background: #f8fafc; padding: 16px; border-radius: 8px; margin: 16px 0;">
    <p><strong>Position:</strong> {{job_title}}</p>
    <p><strong>Meeting Link:</strong> <a href="{{meeting_url}}" style="color: #2563eb;">{{meeting_url}}</a></p>
  </div>
  <p>Best regards,<br/><strong>{{sender_name}}</strong></p>
</div>`,
        preview_text: 'Your confirmed meeting details from Sharyx AI',
        outcome_filter: 'ALL',
        attach_pdf: false,
        pdf_template_type: '',
        pdf_title: '',
      });
      setVariables(['lead_name', 'job_title', 'meeting_url', 'sender_name']);
    }
  }, [templateToEdit]);

  const insertVariable = (variable: string) => {
    setForm(prev => ({ ...prev, body_html: prev.body_html + ' ' + variable }));
    const cleanVar = variable.replace(/[{}]/g, '');
    if (!variables.includes(cleanVar)) {
      setVariables(prev => [...prev, cleanVar]);
    }
  };

  const getRenderedPreview = () => {
    let html = form.body_html || '<p style="color:#94a3b8;">Empty email body...</p>';
    Object.entries(SAMPLE_VARS).forEach(([k, v]) => {
      html = html.replace(new RegExp(`{{${k}}}`, 'g'), `<span style="background:#fef08a;padding:1px 4px;border-radius:3px;">${v}</span>`);
    });
    return html;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Template Name is required');
      return;
    }
    if (!form.subject.trim()) {
      toast.error('Subject is required');
      return;
    }
    if (!form.body_html.trim()) {
      toast.error('Body HTML is required');
      return;
    }

    try {
      setLoading(true);
      if (templateToEdit?.id) {
        await emailService.updateEmailTemplate(templateToEdit.id, { ...form, variables });
        toast.success(`Template "${form.name}" updated successfully! ✅`);
      } else {
        await emailService.createEmailTemplate({ ...form, variables, is_active: true });
        toast.success(`Template "${form.name}" created successfully! 🚀`);
      }
      onSuccess?.();
      onBack();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save email template');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onBack}
            className="rounded-xl border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold"
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Templates
          </Button>
          <div className="h-6 w-px bg-slate-200 hidden sm:block" />
          <div>
            <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <LayoutTemplate className="h-5 w-5 text-indigo-600" />
              {templateToEdit ? 'Edit Email Template' : 'Create Rich HTML Email Template'}
            </h1>
            <p className="text-xs text-slate-500">
              Compose reusable emails with dynamic placeholders and automatic PDF attachments.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPreviewMode(previewMode === 'edit' ? 'preview' : 'edit')}
            className="rounded-xl border-slate-200 text-xs font-semibold gap-1.5"
          >
            {previewMode === 'edit' ? <Eye className="h-3.5 w-3.5 text-blue-600" /> : <Code2 className="h-3.5 w-3.5 text-blue-600" />}
            {previewMode === 'edit' ? 'Live Preview' : 'Edit HTML'}
          </Button>

          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs gap-1.5 shadow-sm"
          >
            <Save className="h-4 w-4" />
            {loading ? 'Saving...' : templateToEdit ? 'Update Template' : 'Save Template'}
          </Button>
        </div>
      </div>

      {/* Main Form & Preview Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Settings & Body (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">
                  Template Name <span className="text-red-500 font-bold ml-0.5">*</span>
                </Label>
                <Input
                  required
                  placeholder="e.g. Candidate Interview Confirmation"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="bg-white border-slate-200 text-xs rounded-xl h-10"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">
                  Category <span className="text-red-500 font-bold ml-0.5">*</span>
                </Label>
                <Select value={form.category} onValueChange={val => setForm({ ...form, category: val })}>
                  <SelectTrigger className="bg-white border-slate-200 text-xs rounded-xl h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">
                Email Subject Line <span className="text-red-500 font-bold ml-0.5">*</span>
              </Label>
              <Input
                required
                placeholder="e.g. Interview Scheduled: {{job_title}} at Sharyx"
                value={form.subject}
                onChange={e => setForm({ ...form, subject: e.target.value })}
                className="bg-white border-slate-200 text-xs rounded-xl h-10"
              />
            </div>

            {/* Variable Chips */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Sparkles className="h-3 w-3 text-purple-600" /> Insert Dynamic Placeholders (Click to Add):
              </Label>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {VARIABLE_CHIPS.map(chip => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => insertVariable(chip)}
                    className="text-[11px] font-mono px-2 py-0.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-colors"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>

            {/* Body HTML */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">
                HTML Email Body <span className="text-red-500 font-bold ml-0.5">*</span>
              </Label>
              {previewMode === 'edit' ? (
                <Textarea
                  required
                  rows={9}
                  value={form.body_html}
                  onChange={e => setForm({ ...form, body_html: e.target.value })}
                  className="font-mono text-xs rounded-2xl border-slate-200 p-3 leading-relaxed"
                />
              ) : (
                <div
                  className="p-4 rounded-2xl border border-slate-200 min-h-[220px] bg-slate-50 overflow-y-auto"
                  dangerouslySetInnerHTML={{ __html: getRenderedPreview() }}
                />
              )}
            </div>

            {/* Outcome Filter Selector */}
            <div className="pt-2 border-t border-slate-100">
              <OutcomeFilterSelector
                value={form.outcome_filter}
                onChange={(val: string) => setForm({ ...form, outcome_filter: val })}
              />
            </div>

            {/* Dynamic PDF Attachment Generator */}
            <div className="pt-2 border-t border-slate-100">
              <PdfTemplateSelector
                attachPdf={form.attach_pdf}
                pdfTemplateType={form.pdf_template_type}
                pdfTitle={form.pdf_title}
                onAttachPdfChange={(val) => setForm({ ...form, attach_pdf: val })}
                onPdfTemplateTypeChange={(val) => setForm({ ...form, pdf_template_type: val })}
                onPdfTitleChange={(val) => setForm({ ...form, pdf_title: val })}
              />
            </div>
          </form>
        </div>

        {/* Live Preview Column (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Eye className="h-4 w-4 text-blue-600" /> Live Recipient Mailbox Preview
              </span>
              <Badge className="bg-blue-100 text-blue-700 text-[10px]">Client Preview</Badge>
            </div>

            <div className="space-y-1.5 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
              <p><strong className="text-slate-800">To:</strong> rahul.sharma@megacorp.com</p>
              <p><strong className="text-slate-800">Subject:</strong> {form.subject || '(Subject line)'}</p>
            </div>

            <div
              className="p-4 rounded-2xl border border-slate-100 min-h-[280px] bg-white overflow-y-auto shadow-inner text-xs"
              dangerouslySetInnerHTML={{ __html: getRenderedPreview() }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
