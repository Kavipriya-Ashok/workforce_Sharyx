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
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 gap-1 text-[11px]">
            <CheckCircle2 className="h-3 w-3" /> Approved
          </Badge>
        );
      case "PENDING":
        return (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30 gap-1 text-[11px]">
            <Clock className="h-3 w-3" /> Meta Review Pending
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge variant="outline" className="bg-rose-500/10 text-rose-400 border-rose-500/30 gap-1 text-[11px]">
            <AlertTriangle className="h-3 w-3" /> Rejected by Meta
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-slate-800 text-slate-300 border-slate-700 text-[11px]">
            {status || "Active"}
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <LayoutTemplate className="h-5 w-5 text-emerald-400" />
            Meta Message Templates
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Pre-approved Meta templates for outbound notification triggers and re-engagements outside 24h window.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSyncMeta}
            disabled={syncing}
            className="gap-1.5 border-slate-700 hover:bg-slate-800 text-slate-200"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin text-emerald-400" : ""}`} />
            {syncing ? "Syncing..." : "Sync from Meta"}
          </Button>

          <Button
            size="sm"
            onClick={() => {
              setEditingTemplate(null);
              setDialogOpen(true);
            }}
            className="gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white"
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
            <div key={i} className="h-48 rounded-xl bg-slate-900/40 border border-slate-800 animate-pulse" />
          ))}
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-xl border border-dashed border-slate-800 bg-slate-900/30">
          <Sparkles className="h-10 w-10 text-emerald-400/50 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-200">No WhatsApp Templates Found</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 mb-4">
            Create your first pre-approved Meta template or sync existing templates from your Meta Business Account.
          </p>
          <div className="flex justify-center gap-3">
            <Button
              size="sm"
              onClick={() => {
                setEditingTemplate(null);
                setDialogOpen(true);
              }}
              className="bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              <PlusCircle className="mr-1.5 h-4 w-4" />
              Create First Template
            </Button>
            <Button size="sm" variant="outline" onClick={handleSyncMeta} disabled={syncing}>
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
              className="flex flex-col justify-between p-4 rounded-xl border border-slate-800 bg-slate-900/50 hover:border-slate-700 transition-all shadow-sm"
            >
              <div>
                {/* Card Top */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-white truncate font-mono">
                      {tpl.name}
                    </h3>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block mt-0.5">
                      {tpl.category || "UTILITY"} • {tpl.language || "en_US"}
                    </span>
                  </div>
                  {getStatusBadge(tpl.approval_status)}
                </div>

                {/* Header Preview */}
                {tpl.header_text && (
                  <div className="text-xs font-semibold text-emerald-400 mb-1.5 pb-1 border-b border-slate-800">
                    {tpl.header_text}
                  </div>
                )}

                {/* Body Preview */}
                <div className="bg-slate-950/80 rounded-lg p-3 border border-slate-800/80 text-xs text-slate-300 leading-relaxed whitespace-pre-wrap font-sans max-h-36 overflow-y-auto">
                  {tpl.body_text || tpl.components?.find((c) => c.type === "BODY")?.text || "No preview"}
                </div>

                {/* Footer Preview */}
                {tpl.footer_text && (
                  <p className="text-[10px] text-slate-500 mt-2 italic truncate">
                    {tpl.footer_text}
                  </p>
                )}
              </div>

              {/* Card Footer Actions */}
              <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-800/80">
                <span className="text-[10px] text-slate-500">
                  {tpl.is_active ? "🟢 Active for triggers" : "⚪ Disabled"}
                </span>

                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditingTemplate(tpl);
                      setDialogOpen(true);
                    }}
                    className="h-7 w-7 p-0 text-slate-400 hover:text-white"
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                  {tpl.id && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(tpl.id!, tpl.name)}
                      className="h-7 w-7 p-0 text-slate-400 hover:text-rose-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Template Dialog */}
      <CreateWhatsAppTemplateDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        templateToEdit={editingTemplate}
        onSuccess={fetchTemplates}
      />
    </div>
  );
};
