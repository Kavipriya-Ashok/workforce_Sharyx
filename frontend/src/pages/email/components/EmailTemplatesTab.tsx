import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { emailService } from '@/service/emailService';
import { EmailTemplate } from '@/types/email';
import { CreateEmailTemplateDialog } from './CreateEmailTemplateDialog';
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
  Sales: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  Recruitment: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  Onboarding: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
  'Follow-up': 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  Support: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
  General: 'bg-slate-700/60 text-slate-300 border-slate-600',
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
          <LayoutTemplate className="h-5 w-5 text-indigo-400" />
          <div>
            <h2 className="text-base font-semibold text-white">Email Templates</h2>
            <p className="text-xs text-slate-400">{templates.length} template{templates.length !== 1 ? 's' : ''} · reusable HTML templates with dynamic variables</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchTemplates}
            disabled={loading}
            className="gap-1.5 border-slate-700 bg-slate-800 text-slate-300 hover:text-white"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => { setEditingTemplate(null); setDialogOpen(true); }}
            className="bg-indigo-600 hover:bg-indigo-500 text-white gap-1.5"
          >
            <PlusCircle className="h-4 w-4" />
            New Template
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
          <Input
            placeholder="Search templates..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 bg-slate-900 border-slate-700 text-white text-xs h-8"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {ALL_CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`text-xs px-3 py-1 rounded-full border font-medium transition-all ${
                activeCategory === cat
                  ? 'bg-indigo-600 text-white border-indigo-500'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white hover:border-slate-600'
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
            <div key={i} className="h-52 rounded-xl bg-slate-800/50 animate-pulse border border-slate-700/50" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <LayoutTemplate className="h-12 w-12 text-slate-700 mb-3" />
          <p className="text-slate-400 font-medium">
            {search || activeCategory !== 'All' ? 'No templates match your filter' : 'No templates yet'}
          </p>
          <p className="text-slate-500 text-sm mt-1">
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
              className="group relative bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-indigo-500/40 hover:shadow-lg hover:shadow-indigo-900/20 transition-all duration-200 flex flex-col gap-3"
            >
              {/* Card Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-medium px-2 py-0 ${CATEGORY_COLORS[tpl.category] || CATEGORY_COLORS['General']}`}
                    >
                      {tpl.category}
                    </Badge>
                  </div>
                  <h3 className="text-sm font-semibold text-white truncate">{tpl.name}</h3>
                </div>
              </div>

              {/* Subject */}
              <div className="space-y-1">
                <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Subject</p>
                <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">{tpl.subject}</p>
              </div>

              {/* Variables */}
              {tpl.variables && tpl.variables.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {tpl.variables.slice(0, 4).map(v => (
                    <span
                      key={v}
                      className="text-[10px] px-1.5 py-0.5 bg-slate-800 text-slate-400 border border-slate-700 rounded font-mono"
                    >
                      {`{{${v}}}`}
                    </span>
                  ))}
                  {tpl.variables.length > 4 && (
                    <span className="text-[10px] text-slate-500">+{tpl.variables.length - 4} more</span>
                  )}
                </div>
              )}

              {/* Outcome + PDF badges */}
              <div className="flex flex-wrap gap-1.5">
                {tpl.outcome_filter && tpl.outcome_filter !== 'ALL' && (
                  <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 bg-amber-500/15 text-amber-400 border border-amber-500/30 rounded-full">
                    <Zap className="h-2.5 w-2.5" /> {tpl.outcome_filter}
                  </span>
                )}
                {tpl.attach_pdf && tpl.pdf_template_type && (
                  <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 rounded-full">
                    <FileText className="h-2.5 w-2.5" /> PDF: {tpl.pdf_template_type.replace(/_/g, ' ')}
                  </span>
                )}
              </div>

              {/* Preview snippet */}
              {tpl.preview_text && (
                <p className="text-[11px] text-slate-500 italic line-clamp-1 border-t border-slate-800 pt-2">
                  "{tpl.preview_text}"
                </p>
              )}

              {/* Actions */}
              <div className="flex items-center gap-1.5 mt-auto pt-2 border-t border-slate-800">
                <button
                  onClick={() => { setPreviewTemplate(tpl); }}
                  className="flex-1 flex items-center justify-center gap-1 text-[11px] py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-all"
                >
                  <Eye className="h-3 w-3" /> Preview
                </button>
                <button
                  onClick={() => handleCopyHTML(tpl)}
                  className="flex items-center justify-center gap-1 text-[11px] px-2.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-emerald-600 hover:text-white transition-all"
                  title="Copy HTML body"
                >
                  {copiedId === tpl.id ? <CheckCircle2 className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                </button>
                <button
                  onClick={() => { setEditingTemplate(tpl); setDialogOpen(true); }}
                  className="flex items-center justify-center gap-1 text-[11px] px-2.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-indigo-600 hover:text-white transition-all"
                  title="Edit"
                >
                  <Edit className="h-3 w-3" />
                </button>
                <button
                  onClick={() => handleDelete(tpl.id, tpl.name)}
                  className="flex items-center justify-center gap-1 text-[11px] px-2.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-rose-600 hover:text-white transition-all"
                  title="Delete"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview Modal */}
      {previewTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setPreviewTemplate(null)}>
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Email Client Header */}
            <div className="bg-slate-100 px-5 py-3 border-b border-slate-200 flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <Badge variant="outline" className={`text-[10px] ${CATEGORY_COLORS[previewTemplate.category] || ''}`}>
                    {previewTemplate.category}
                  </Badge>
                  <span className="text-xs font-bold text-slate-700">{previewTemplate.name}</span>
                </div>
                <p className="text-sm font-semibold text-slate-800">{previewTemplate.subject}</p>
                {previewTemplate.preview_text && (
                  <p className="text-xs text-slate-400 mt-0.5">{previewTemplate.preview_text}</p>
                )}
              </div>
              <button
                onClick={() => setPreviewTemplate(null)}
                className="text-slate-400 hover:text-slate-700 text-xl leading-none p-1"
              >×</button>
            </div>
            <div
              className="flex-1 overflow-y-auto p-6 text-sm text-slate-800 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: previewTemplate.body_html }}
            />
            <div className="bg-slate-50 border-t border-slate-200 px-5 py-3 flex items-center justify-between">
              <div className="flex gap-1 flex-wrap">
                {(previewTemplate.variables || []).map(v => (
                  <span key={v} className="text-[10px] px-1.5 py-0.5 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded font-mono">
                    {`{{${v}}}`}
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleCopyHTML(previewTemplate)}
                  className="text-xs px-3 py-1.5 rounded-lg bg-slate-200 text-slate-600 hover:bg-slate-300 flex items-center gap-1"
                >
                  <Copy className="h-3 w-3" /> Copy HTML
                </button>
                <button
                  onClick={() => { setPreviewTemplate(null); setEditingTemplate(previewTemplate); setDialogOpen(true); }}
                  className="text-xs px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 flex items-center gap-1"
                >
                  <Edit className="h-3 w-3" /> Edit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Dialog */}
      <CreateEmailTemplateDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        templateToEdit={editingTemplate}
        onSuccess={fetchTemplates}
      />
    </div>
  );
};
