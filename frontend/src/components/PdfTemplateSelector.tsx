import React from 'react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { FileText, Paperclip, X } from 'lucide-react';

export const PDF_TEMPLATE_TYPES = [
  {
    value: 'executive_proposal',
    label: 'Executive Proposal',
    description: 'Dark premium proposal for sales outreach',
    color: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
  },
  {
    value: 'corporate_gold',
    label: 'Corporate Gold',
    description: 'Formal serif gold-accent corporate proposal',
    color: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  },
  {
    value: 'call_summary',
    label: 'Call Summary Report',
    description: 'AI-generated call summary with outcome chips',
    color: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
  },
  {
    value: 'candidate_report',
    label: 'Candidate Report',
    description: 'Recruitment screening report',
    color: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  },
  {
    value: 'invoice',
    label: 'Invoice',
    description: 'Professional invoice with line items',
    color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  },
  {
    value: 'onboarding_kit',
    label: 'Onboarding Kit',
    description: 'Welcome kit with setup steps',
    color: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
  },
];

export const OUTCOME_FILTERS = [
  'ALL',
  'Interested',
  'Demo Booked',
  'Not Interested',
  'Price Objection',
  'Callback Requested',
  'Proposal Requested',
  'Deal Won',
  'Lead Qualified',
  'Site Visit Confirmed',
  'Invoice Sent',
  'Onboarding Started',
  'Candidate Screened',
  'Interview Scheduled',
];

interface PdfTemplateSelectorProps {
  attachPdf: boolean;
  pdfTemplateType: string;
  pdfTitle: string;
  onAttachPdfChange: (val: boolean) => void;
  onPdfTemplateTypeChange: (val: string) => void;
  onPdfTitleChange: (val: string) => void;
}

export const PdfTemplateSelector: React.FC<PdfTemplateSelectorProps> = ({
  attachPdf,
  pdfTemplateType,
  pdfTitle,
  onAttachPdfChange,
  onPdfTemplateTypeChange,
  onPdfTitleChange,
}) => {
  const selected = PDF_TEMPLATE_TYPES.find(t => t.value === pdfTemplateType);

  return (
    <div className="space-y-3 p-4 rounded-xl bg-slate-950 border border-slate-800">
      {/* Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Paperclip className="h-4 w-4 text-indigo-400" />
          <Label className="text-sm font-semibold text-white cursor-pointer" htmlFor="attach-pdf-toggle">
            Attach PDF to this template
          </Label>
        </div>
        <button
          type="button"
          id="attach-pdf-toggle"
          onClick={() => onAttachPdfChange(!attachPdf)}
          className={`relative w-11 h-6 rounded-full transition-all duration-200 focus:outline-none ${
            attachPdf ? 'bg-indigo-600' : 'bg-slate-700'
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
              attachPdf ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* PDF Options (shown when toggled on) */}
      {attachPdf && (
        <div className="space-y-3 pt-2 border-t border-slate-800">
          {/* PDF Template Type */}
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-400">PDF Template Design *</Label>
            <Select value={pdfTemplateType} onValueChange={onPdfTemplateTypeChange}>
              <SelectTrigger className="bg-slate-900 border-slate-700 text-white h-9">
                <SelectValue placeholder="Choose a PDF template..." />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-700 text-white">
                {PDF_TEMPLATE_TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value}>
                    <div className="flex flex-col">
                      <span className="font-medium">{t.label}</span>
                      <span className="text-[11px] text-slate-400">{t.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Selected template badge */}
          {selected && (
            <div className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border ${selected.color}`}>
              <FileText className="h-3 w-3" />
              <span className="font-semibold">{selected.label}</span>
              <span className="opacity-75">— {selected.description}</span>
            </div>
          )}

          {/* PDF File Name */}
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-400">PDF File Name (without .pdf)</Label>
            <input
              type="text"
              className="w-full h-9 px-3 rounded-lg bg-slate-900 border border-slate-700 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
              placeholder="e.g. Sharyx Proposal — {{lead_name}}"
              value={pdfTitle}
              onChange={e => onPdfTitleChange(e.target.value)}
            />
            <p className="text-[10px] text-slate-500">Supports variables like <code className="text-indigo-300">{'{{lead_name}}'}</code>, <code className="text-indigo-300">{'{{company}}'}</code></p>
          </div>
        </div>
      )}
    </div>
  );
};

interface OutcomeFilterSelectorProps {
  value: string;
  onChange: (val: string) => void;
}

export const OutcomeFilterSelector: React.FC<OutcomeFilterSelectorProps> = ({ value, onChange }) => {
  const isAll = value === 'ALL';

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-slate-400">Outcome Filter (when to trigger)</Label>
        {!isAll && (
          <button
            type="button"
            onClick={() => onChange('ALL')}
            className="text-[10px] text-slate-500 hover:text-rose-400 flex items-center gap-0.5 transition-colors"
          >
            <X className="h-3 w-3" /> Clear
          </button>
        )}
      </div>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="bg-slate-950 border-slate-700 text-white h-9">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-slate-900 border-slate-700 text-white">
          {OUTCOME_FILTERS.map(f => (
            <SelectItem key={f} value={f}>
              {f === 'ALL' ? '🌐 ALL — Fire for any outcome' : f}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {!isAll && (
        <p className="text-[10px] text-amber-400/80">
          ⚡ Only sends when call/event outcome matches <strong>"{value}"</strong>
        </p>
      )}
    </div>
  );
};
