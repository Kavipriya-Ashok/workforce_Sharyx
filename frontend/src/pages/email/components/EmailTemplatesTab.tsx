import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { emailService } from '@/service/emailService';
import { EmailTemplate } from '@/types/email';
import { EmailTemplateEditorPage } from './EmailTemplateEditorPage';
import {
  LayoutTemplate,
  PlusCircle,
  RefreshCw,
  Edit,
  Trash2,
  Eye,
  Sparkles,
  Search,
  Tag,
  Copy,
  CheckCircle2,
  FileText,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';

const CATEGORY_COLORS: Record<string, string> = {
  Sales: 'bg-blue-50 text-blue-700 border-blue-200',
  Recruitment: 'bg-purple-50 text-purple-700 border-purple-200',
  Onboarding: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  'Follow-up': 'bg-amber-50 text-amber-700 border-amber-200',
  Support: 'bg-rose-50 text-rose-700 border-rose-200',
  General: 'bg-slate-100 text-slate-700 border-slate-200',
};

const ALL_CATEGORIES = ['All', 'Sales', 'Recruitment', 'Onboarding', 'Follow-up', 'Support', 'General'];

export const EmailTemplatesTab: React.FC = () => {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const data = await emailService.getEmailTemplates();
      setTemplates(data || []);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load email templates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete template "${name}"?`)) return;
    try {
      await emailService.deleteEmailTemplate(id);
      toast.success(`Template "${name}" deleted`);
      setTemplates(prev => prev.filter(t => t.id !== id));
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete template');
    }
  };

  if (dialogOpen) {
    return (
      <EmailTemplateEditorPage
        templateToEdit={editingTemplate}
        onBack={() => {
          setDialogOpen(false);
          setEditingTemplate(null);
        }}
        onSuccess={fetchTemplates}
      />
    );
  }

  const handleCopyHTML = (tpl: EmailTemplate) => {
    navigator.clipboard.writeText(tpl.body_html || '').then(() => {
      setCopiedId(tpl.id);
      toast.success('HTML body copied to clipboard!');
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const filtered = templates.filter(t => {
    const matchCat = activeCategory === 'All' || t.category === activeCategory;
    const matchSearch =
      !search ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.subject.toLowerCase().includes(search.toLowerCase()) ||
      t.category.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <LayoutTemplate className="h-5 w-5 text-blue-600" />
          <div>
            <h2 className="text-base font-bold text-slate-900">Email Templates</h2>
            <p className="text-xs text-slate-500">{templates.length} template{templates.length !== 1 ? 's' : ''} · reusable HTML templates with dynamic placeholders & PDF attachments</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchTemplates}
            disabled={loading}
            className="gap-1.5 border-slate-200 bg-white text-slate-700 hover:bg-slate-50 rounded-xl"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => { setEditingTemplate(null); setDialogOpen(true); }}
            className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5 rounded-xl font-semibold shadow-sm"
          >
            <PlusCircle className="h-4 w-4" />
            New Template
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input
            placeholder="Search templates..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 bg-slate-50 border-slate-200 text-slate-900 text-xs h-8 rounded-xl focus:bg-white"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {ALL_CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`text-xs px-3 py-1 rounded-full border font-semibold transition-all ${
                activeCategory === cat
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Templates Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-52 rounded-2xl bg-slate-100 animate-pulse border border-slate-200" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center rounded-2xl border border-dashed border-slate-200 bg-white">
          <LayoutTemplate className="h-10 w-10 text-slate-300 mb-2" />
          <p className="text-slate-700 font-semibold text-sm">
            {search || activeCategory !== 'All' ? 'No templates match your filter' : 'No templates yet'}
          </p>
          <p className="text-slate-400 text-xs mt-1">
            {search || activeCategory !== 'All'
              ? 'Try clearing your search or selecting a different category'
              : 'Click "New Template" to create your first reusable email template'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(tpl => (
            <div
              key={tpl.id}
              className="group relative bg-white border border-slate-200 rounded-2xl p-5 hover:border-blue-400 hover:shadow-md transition-all duration-200 flex flex-col gap-3 shadow-xs"
            >
              {/* Card Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${CATEGORY_COLORS[tpl.category] || CATEGORY_COLORS['General']}`}
                    >
                      {tpl.category}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 truncate">{tpl.name}</h3>
                </div>
              </div>

              {/* Subject */}
              <div className="space-y-0.5">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Subject</p>
                <p className="text-xs text-slate-700 line-clamp-2 leading-relaxed font-medium">{tpl.subject}</p>
              </div>

              {/* Variables */}
              {tpl.variables && tpl.variables.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {tpl.variables.slice(0, 4).map(v => (
                    <span
                      key={v}
                      className="text-[10px] px-1.5 py-0.5 bg-slate-50 text-slate-600 border border-slate-200 rounded font-mono"
                    >
                      {`{{${v}}}`}
                    </span>
                  ))}
                  {tpl.variables.length > 4 && (
                    <span className="text-[10px] text-slate-400">+{tpl.variables.length - 4} more</span>
                  )}
                </div>
              )}

              {/* Outcome + PDF badges */}
              <div className="flex flex-wrap gap-1.5">
                {tpl.outcome_filter && tpl.outcome_filter !== 'ALL' && (
                  <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full font-semibold">
                    <Zap className="h-2.5 w-2.5" /> {tpl.outcome_filter}
                  </span>
                )}
                {tpl.attach_pdf && tpl.pdf_template_type && (
                  <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-full font-semibold">
                    <FileText className="h-2.5 w-2.5" /> PDF: {tpl.pdf_template_type.replace(/_/g, ' ')}
                  </span>
                )}
              </div>

              {/* Preview snippet */}
              {tpl.preview_text && (
                <p className="text-[11px] text-slate-400 italic line-clamp-1 border-t border-slate-100 pt-2">
                  "{tpl.preview_text}"
                </p>
              )}

              {/* Actions */}
              <div className="flex items-center gap-1.5 mt-auto pt-2 border-t border-slate-100">
                <button
                  onClick={() => { setPreviewTemplate(tpl); }}
                  className="flex-1 flex items-center justify-center gap-1 text-[11px] py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 transition-all font-semibold"
                >
                  <Eye className="h-3 w-3" /> Preview
                </button>
                <button
                  onClick={() => handleCopyHTML(tpl)}
                  className="flex items-center justify-center gap-1 text-[11px] px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-all"
                  title="Copy HTML body"
                >
                  {copiedId === tpl.id ? <CheckCircle2 className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                </button>
                <button
                  onClick={() => { setEditingTemplate(tpl); setDialogOpen(true); }}
                  className="flex items-center justify-center gap-1 text-[11px] px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-all"
                  title="Edit"
                >
                  <Edit className="h-3 w-3" />
                </button>
                <button
                  onClick={() => handleDelete(tpl.id, tpl.name)}
                  className="flex items-center justify-center gap-1 text-[11px] px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-all"
                  title="Delete"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview Dialog */}
      {previewTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-bold text-sm text-slate-900">{previewTemplate.name}</h3>
                <p className="text-xs text-slate-500">{previewTemplate.subject}</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => setPreviewTemplate(null)} className="rounded-xl">
                Close
              </Button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4">
              <div
                className="prose prose-sm max-w-none text-slate-800"
                dangerouslySetInnerHTML={{ __html: previewTemplate.body_html || '' }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
