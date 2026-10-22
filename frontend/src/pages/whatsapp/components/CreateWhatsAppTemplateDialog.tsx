import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { WhatsAppService } from "@/service/whatsappService";
import { Smartphone, CheckCheck, Sparkles } from "lucide-react";
import { PdfTemplateSelector, OutcomeFilterSelector } from "@/components/PdfTemplateSelector";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  onCreated?: (templateName: string) => void;
  templateToEdit?: any | null;
}

export const CreateWhatsAppTemplateDialog: React.FC<Props> = ({
  open,
  onOpenChange,
  onSuccess,
  onCreated,
  templateToEdit,
}) => {
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: "",
    category: "UTILITY",
    language: "en_US",
    header_text: "",
    body_text: "Hi {{1}}, thank you for contacting Sharyx AI! Your requested details: {{2}}.",
    footer_text: "Sharyx AI • Reply STOP to unsubscribe",
    outcome_filter: "ALL",
    attach_pdf: false,
    pdf_template_type: "",
    pdf_title: "",
  });

  React.useEffect(() => {
    if (open) {
      if (templateToEdit) {
        setForm({
          name: templateToEdit.name || "",
          category: templateToEdit.category || "UTILITY",
          language: templateToEdit.language || "en_US",
          header_text: templateToEdit.header_text || "",
          body_text: templateToEdit.body_text || "",
          footer_text: templateToEdit.footer_text || "",
          outcome_filter: templateToEdit.outcome_filter || "ALL",
          attach_pdf: templateToEdit.attach_pdf || false,
          pdf_template_type: templateToEdit.pdf_template_type || "",
          pdf_title: templateToEdit.pdf_title || "",
        });
      } else {
        setForm({
          name: "",
          category: "UTILITY",
          language: "en_US",
          header_text: "",
          body_text: "Hi {{1}}, thank you for contacting Sharyx AI! Your requested details: {{2}}.",
          footer_text: "Sharyx AI • Reply STOP to unsubscribe",
          outcome_filter: "ALL",
          attach_pdf: false,
          pdf_template_type: "",
          pdf_title: "",
        });
      }
    }
  }, [open, templateToEdit]);

  const insertVariable = (variableStr: string) => {
    setForm((prev) => ({
      ...prev,
      body_text: prev.body_text + " " + variableStr,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.body_text.trim()) {
      toast.error("Template name and body text are required");
      return;
    }

    const sanitizedName = form.name.toLowerCase().replace(/[^a-z0-9_]/g, "_");

    try {
      setLoading(true);
      if (templateToEdit?.id) {
        await WhatsAppService.updateTemplate(templateToEdit.id, {
          ...form,
          name: sanitizedName,
        });
        toast.success(`Template "${sanitizedName}" updated! 📑`);
      } else {
        await WhatsAppService.createTemplate({
          ...form,
          name: sanitizedName,
          approval_status: "APPROVED",
          is_active: true,
        });
        toast.success(`Template "${sanitizedName}" created & submitted to Meta! 🚀`);
      }
      if (onSuccess) onSuccess();
      if (onCreated) onCreated(sanitizedName);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to save template");
    } finally {
      setLoading(false);
    }
  };

  // Preview renderer replacing {{1}}, {{2}} with samples
  const renderPreviewBody = () => {
    return form.body_text
      .replace(/\{\{1\}\}/g, "Rahul Sharma")
      .replace(/\{\{2\}\}/g, "Interview on 20th Oct at 3:00 PM")
      .replace(/\{\{3\}\}/g, "https://meet.google.com/abc-xyz")
      .replace(/\{\{company\}\}/gi, "Sharyx AI");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-800 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-white">
            <Sparkles className="h-5 w-5 text-emerald-400" />
            {templateToEdit ? "Edit WhatsApp Template" : "Create Meta WhatsApp Template"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Form Fields (7 Columns) */}
            <div className="lg:col-span-7 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-300">Template Name *</Label>
                  <Input
                    placeholder="interview_invite"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="bg-slate-950 border-slate-800 text-white"
                    required
                  />
                  <p className="text-[11px] text-slate-400">Lowercase & underscores only</p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-300">Category</Label>
                  <Select
                    value={form.category}
                    onValueChange={(val) => setForm({ ...form, category: val })}
                  >
                    <SelectTrigger className="bg-slate-950 border-slate-800 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800 text-white">
                      <SelectItem value="UTILITY">Utility (Fast Approval)</SelectItem>
                      <SelectItem value="MARKETING">Marketing</SelectItem>
                      <SelectItem value="AUTHENTICATION">Authentication (OTP)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">Header (Optional)</Label>
                <Input
                  placeholder="e.g. 🗓️ Interview Invitation"
                  value={form.header_text}
                  onChange={(e) => setForm({ ...form, header_text: e.target.value })}
                  className="bg-slate-950 border-slate-800 text-white"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-slate-300">Body Text *</Label>
                  <div className="flex gap-1">
                    {["{{1}}", "{{2}}", "{{3}}"].map((tag) => (
                      <button
                        type="button"
                        key={tag}
                        onClick={() => insertVariable(tag)}
                        className="text-[11px] px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded hover:bg-emerald-500/30 font-mono transition-colors"
                      >
                        + {tag}
                      </button>
                    ))}
                  </div>
                </div>
                <Textarea
                  rows={4}
                  value={form.body_text}
                  onChange={(e) => setForm({ ...form, body_text: e.target.value })}
                  placeholder="Type your message with {{1}}, {{2}} placeholders..."
                  className="bg-slate-950 border-slate-800 text-white leading-relaxed"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">Footer Text (Optional)</Label>
                <Input
                  placeholder="e.g. Sharyx AI • Automated System"
                  value={form.footer_text}
                  onChange={(e) => setForm({ ...form, footer_text: e.target.value })}
                  className="bg-slate-950 border-slate-800 text-white"
                />
              </div>

              {/* Outcome Filter */}
              <OutcomeFilterSelector
                value={form.outcome_filter}
                onChange={(val) => setForm({ ...form, outcome_filter: val })}
              />

              {/* PDF Attachment */}
              <PdfTemplateSelector
                attachPdf={form.attach_pdf}
                pdfTemplateType={form.pdf_template_type}
                pdfTitle={form.pdf_title}
                onAttachPdfChange={(val) => setForm({ ...form, attach_pdf: val })}
                onPdfTemplateTypeChange={(val) => setForm({ ...form, pdf_template_type: val })}
                onPdfTitleChange={(val) => setForm({ ...form, pdf_title: val })}
              />
            </div>

            {/* Live WhatsApp Simulator (5 Columns) */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center bg-slate-950 p-4 rounded-2xl border border-slate-800">
              <div className="flex items-center gap-2 mb-3 text-xs font-semibold text-slate-400">
                <Smartphone className="h-4 w-4 text-emerald-400" /> Live WhatsApp Mobile Simulator
              </div>

              {/* Phone Bubble */}
              <div className="w-full max-w-[280px] bg-[#0b141a] rounded-xl p-3 shadow-xl border border-slate-800 space-y-2 text-[13px]">
                <div className="bg-[#202c33] rounded-lg p-2.5 shadow-sm text-[#e9edef] space-y-1.5">
                  {form.header_text && (
                    <div className="font-bold text-xs text-emerald-400 pb-1 border-b border-slate-700/60">
                      {form.header_text}
                    </div>
                  )}
                  <p className="whitespace-pre-wrap leading-relaxed text-xs text-slate-200">
                    {renderPreviewBody()}
                  </p>
                  {form.footer_text && (
                    <div className="text-[10px] text-slate-400 pt-1">
                      {form.footer_text}
                    </div>
                  )}
                  <div className="flex items-center justify-end gap-1 text-[10px] text-slate-400 pt-0.5">
                    <span>12:00 PM</span>
                    <CheckCheck className="h-3.5 w-3.5 text-cyan-400" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="border-t border-slate-800 pt-3">
            <Button variant="ghost" type="button" onClick={() => onOpenChange(false)} className="text-slate-400 hover:text-white">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-emerald-600 hover:bg-emerald-500 text-white">
              {loading ? "Submitting to Meta..." : templateToEdit ? "Update Template" : "Create & Submit to Meta"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
