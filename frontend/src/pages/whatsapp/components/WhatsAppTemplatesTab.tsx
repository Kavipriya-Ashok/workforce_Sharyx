import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WhatsAppService } from "@/service/whatsappService";
import { WhatsAppTemplate } from "@/types/whatsapp";
import { CreateWhatsAppTemplateDialog } from "./CreateWhatsAppTemplateDialog";
import {
  LayoutTemplate,
  RefreshCw,
  PlusCircle,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Trash2,
  Edit,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

export const WhatsAppTemplatesTab: React.FC = () => {
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<WhatsAppTemplate | null>(null);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const data = await WhatsAppService.getTemplates();
      setTemplates(data || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load templates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleSyncMeta = async () => {
    try {
      setSyncing(true);
      const res = await WhatsAppService.syncMetaTemplates();
      toast.success("Templates synchronized from Meta Graph API! ⚡");
      if (Array.isArray(res)) {
        setTemplates(res);
      } else {
        await fetchTemplates();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to sync templates from Meta");
    } finally {
      setSyncing(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete template "${name}"?`)) return;
    try {
      await WhatsAppService.deleteTemplate(id);
      toast.success(`Template "${name}" deleted`);
      setTemplates((prev) => prev.filter((t) => t.id !== id));
    } catch (err: any) {
      toast.error(err.message || "Failed to delete template");
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status?.toUpperCase()) {
      case "APPROVED":
        return (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1 text-[11px] font-semibold">
            <CheckCircle2 className="h-3 w-3" /> Approved
          </Badge>
        );
      case "PENDING":
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 gap-1 text-[11px] font-semibold">
            <Clock className="h-3 w-3" /> Review Pending
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 gap-1 text-[11px] font-semibold">
            <AlertTriangle className="h-3 w-3" /> Rejected
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-200 text-[11px] font-semibold">
            {status || "Active"}
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border border-blue-150 bg-white shadow-xs">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
            <LayoutTemplate className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              Meta WhatsApp Message Templates
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Pre-approved Meta templates for outbound notification triggers, interview scheduling, and re-engagements outside the 24h window.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSyncMeta}
            disabled={syncing}
            className="text-xs font-semibold text-blue-700 border-blue-200 hover:bg-blue-50 gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin text-blue-600" : ""}`} />
            {syncing ? "Syncing..." : "Sync from Meta"}
          </Button>

          <Button
            size="sm"
            onClick={() => {
              setEditingTemplate(null);
              setDialogOpen(true);
            }}
            className="text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white gap-1.5 shadow-sm shadow-blue-500/20"
          >
            <PlusCircle className="h-4 w-4" />
            Create Template
          </Button>
        </div>
      </div>

      {/* Grid of Templates */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 rounded-2xl bg-white border border-blue-100 animate-pulse" />
          ))}
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-2xl border border-dashed border-blue-200 bg-white shadow-xs">
          <Sparkles className="h-10 w-10 text-blue-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-900">No WhatsApp Templates Found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
            Create your first pre-approved Meta template or sync existing templates from your Meta Business Account.
          </p>
          <div className="flex justify-center gap-3">
            <Button
              size="sm"
              onClick={() => {
                setEditingTemplate(null);
                setDialogOpen(true);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs gap-1.5"
            >
              <PlusCircle className="h-4 w-4" />
              Create First Template
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleSyncMeta}
              disabled={syncing}
              className="text-slate-700 border-slate-200 hover:bg-slate-50 text-xs"
            >
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              Sync from Meta
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((tpl) => (
            <div
              key={tpl.id || tpl.name}
              className="flex flex-col justify-between p-5 rounded-2xl border border-blue-150 bg-white hover:border-blue-300 transition-all shadow-xs"
            >
              <div>
                {/* Card Top */}
                <div className="flex items-start justify-between gap-2 mb-2.5">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 font-mono">
                      {tpl.name}
                    </h3>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block mt-0.5">
                      {tpl.category} • {tpl.language || "en_US"}
                    </span>
                  </div>
                  {getStatusBadge(tpl.approval_status)}
                </div>

                {/* Header Preview */}
                {tpl.header_text && (
                  <div className="text-[11px] font-bold text-blue-700 mb-1.5">
                    {tpl.header_text}
                  </div>
                )}

                {/* Body Text Bubble */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-150 text-xs text-slate-700 leading-relaxed font-sans mb-3">
                  {tpl.body_text}
                </div>

                {/* Footer Preview */}
                {tpl.footer_text && (
                  <div className="text-[10px] text-slate-400 italic mb-3">
                    {tpl.footer_text}
                  </div>
                )}
              </div>

              {/* Card Footer Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-2">
                <span className="text-[10px] text-slate-400">
                  {tpl.is_active ? "Enabled for automation" : "Inactive"}
                </span>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setEditingTemplate(tpl);
                      setDialogOpen(true);
                    }}
                    className="h-7 w-7 text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(tpl.id || '', tpl.name)}
                    className="h-7 w-7 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dialog for Creating/Editing Template */}
      <CreateWhatsAppTemplateDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        templateToEdit={editingTemplate}
        onSuccess={fetchTemplates}
      />
    </div>
  );
};
