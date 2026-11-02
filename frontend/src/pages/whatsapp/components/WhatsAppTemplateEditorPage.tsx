import React, { useState, useEffect } from "react";
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
import { Smartphone, CheckCheck, Sparkles, ArrowLeft, Save, LayoutTemplate, HelpCircle } from "lucide-react";
import { PdfTemplateSelector, OutcomeFilterSelector } from "@/components/PdfTemplateSelector";

interface Props {
  templateToEdit?: any | null;
  onBack: () => void;
  onSuccess?: () => void;
}

export const WhatsAppTemplateEditorPage: React.FC<Props> = ({
  templateToEdit,
  onBack,
  onSuccess,
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

  useEffect(() => {
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
    }
  }, [templateToEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Template name is required");
      return;
    }
    if (!form.body_text.trim()) {
      toast.error("Body text is required");
      return;
    }

    try {
      setLoading(true);
      await WhatsAppService.createTemplate({
        ...form,
        name: form.name.toLowerCase().replace(/[^a-z0-9_]/g, "_"),
      });
      toast.success(
        templateToEdit
          ? `Template "${form.name}" updated successfully!`
          : `Template "${form.name}" submitted to Meta for approval! 🚀`
      );
      onSuccess?.();
      onBack();
    } catch (err: any) {
      toast.error(err.message || "Failed to submit template to Meta Graph API");
    } finally {
      setLoading(false);
    }
  };

  const previewBody = form.body_text
    .replace(/\{\{1\}\}/g, "Rahul Sharma")
    .replace(/\{\{2\}\}/g, "Product Brochure & Quote");

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
              <LayoutTemplate className="h-5 w-5 text-emerald-600" />
              {templateToEdit ? "Edit WhatsApp Template" : "Create Meta Approved WhatsApp Template"}
            </h1>
            <p className="text-xs text-slate-500">
              Templates require Meta Graph API approval and support dynamic parameters and PDF documents.
            </p>
          </div>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={loading}
          className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 shadow-sm"
        >
          <Save className="h-4 w-4" />
          {loading ? "Submitting to Meta..." : templateToEdit ? "Update Template" : "Submit for Meta Approval"}
        </Button>
      </div>

      {/* Main Grid: Left Form, Right Real-time Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Column (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">
                  Template Name <span className="text-red-500 font-bold ml-0.5">*</span>
                </Label>
                <Input
                  required
                  placeholder="e.g. appointment_confirmation_v2"
                  value={form.name}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_"),
                    })
                  }
                  className="bg-white border-slate-200 font-mono text-xs rounded-xl h-10"
                />
                <span className="text-[10px] text-slate-400">Lowercase letters and underscores only</span>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">
                  Category <span className="text-red-500 font-bold ml-0.5">*</span>
                </Label>
                <Select
                  value={form.category}
                  onValueChange={(val) => setForm({ ...form, category: val })}
                >
                  <SelectTrigger className="bg-white border-slate-200 text-xs rounded-xl h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UTILITY">Utility (Account alerts, bookings)</SelectItem>
                    <SelectItem value="MARKETING">Marketing (Promotions, updates)</SelectItem>
                    <SelectItem value="AUTHENTICATION">Authentication (OTPs, codes)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Header Text (Optional)</Label>
              <Input
                placeholder="e.g. Appointment Confirmed! 🎉"
                value={form.header_text}
                onChange={(e) => setForm({ ...form, header_text: e.target.value })}
                className="bg-white border-slate-200 text-xs rounded-xl h-10"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-700">
                  Body Message Text <span className="text-red-500 font-bold ml-0.5">*</span>
                </Label>
                <span className="text-[11px] text-emerald-600 font-medium">Use {"{{1}}"}, {"{{2}}"} for placeholders</span>
              </div>
              <Textarea
                required
                rows={5}
                placeholder="Hi {{1}}, your demo is confirmed for {{2}}."
                value={form.body_text}
                onChange={(e) => setForm({ ...form, body_text: e.target.value })}
                className="bg-white border-slate-200 text-xs rounded-2xl p-3 leading-relaxed"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Footer Text (Optional)</Label>
              <Input
                placeholder="e.g. Sharyx AI • Reply STOP to unsubscribe"
                value={form.footer_text}
                onChange={(e) => setForm({ ...form, footer_text: e.target.value })}
                className="bg-white border-slate-200 text-xs rounded-xl h-10"
              />
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

        {/* Real-time WhatsApp Device Preview (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900 rounded-3xl p-5 border border-slate-800 shadow-xl text-white">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-emerald-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Live WhatsApp Chat Mockup
                </span>
              </div>
              <span className="text-[10px] text-emerald-400 font-mono">Meta Preview</span>
            </div>

            <div className="pt-4 flex justify-center">
              <div className="w-full max-w-[320px] bg-[#0b141a] rounded-2xl border border-slate-800 p-3 shadow-2xl relative overflow-hidden space-y-2">
                {/* Chat Topbar */}
                <div className="flex items-center gap-2 pb-2 border-b border-slate-800/80">
                  <div className="h-7 w-7 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-[10px]">
                    S
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">Sharyx AI Official</span>
                    <span className="text-[9px] text-emerald-400">Verified Business Account</span>
                  </div>
                </div>

                {/* WhatsApp Chat Bubble */}
                <div className="bg-[#1f2c34] text-white p-3.5 rounded-2xl rounded-tl-xs shadow-md space-y-2 border border-slate-700/40 text-xs">
                  {form.header_text && (
                    <div className="font-bold text-xs text-white border-b border-slate-700/60 pb-1">
                      {form.header_text}
                    </div>
                  )}

                  <div className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
                    {previewBody || "Template preview message will appear here..."}
                  </div>

                  {form.attach_pdf && (
                    <div className="p-2 rounded-xl bg-[#111b21] border border-slate-700/60 flex items-center gap-2 text-[11px] text-emerald-400">
                      <span>📄 {form.pdf_title || "Official_Document.pdf"}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400">
                    <span>{form.footer_text || "Reply STOP to cancel"}</span>
                    <span className="flex items-center gap-0.5 text-cyan-400">
                      12:30 PM <CheckCheck className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
