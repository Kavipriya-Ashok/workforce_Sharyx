import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Lead } from "@/types/lead";
import { LeadService } from "@/service/leadService";
import { toast } from "sonner";
import { AlertCircle } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead?: Lead | null;
  isCandidate?: boolean;
  onSuccess: () => void;
}

export function LeadFormDialog({ open, onOpenChange, lead, isCandidate = false, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company_name: "",
    job_title: "",
    deal_value: 0,
    lead_status: "NEW",
    source: "MANUAL",
    notes: "",
    is_candidate: isCandidate,
  });

  useEffect(() => {
    if (lead) {
      setFormData({
        name: lead.name || "",
        email: lead.email || "",
        phone: lead.phone || "",
        company_name: lead.company_name || "",
        job_title: lead.job_title || "",
        deal_value: lead.deal_value || 0,
        lead_status: lead.lead_status || "NEW",
        source: lead.source || "MANUAL",
        notes: lead.notes || "",
        is_candidate: lead.is_candidate ?? isCandidate,
      });
    } else {
      setFormData({
        name: "",
        email: "",
        phone: "",
        company_name: "",
        job_title: "",
        deal_value: 0,
        lead_status: "NEW",
        source: "MANUAL",
        notes: "",
        is_candidate: isCandidate,
      });
    }
    setDuplicateWarning(null);
  }, [lead, open, isCandidate]);

  const checkDuplicate = async (phone: string) => {
    if (phone.length < 10) return;
    try {
      const res = await LeadService.checkDuplicatePhone(phone, lead?.id);
      if (res.is_duplicate && res.existing_lead) {
        setDuplicateWarning(
          `Warning: Phone number already exists for "${res.existing_lead.name}" (${res.existing_lead.lead_status})`
        );
      } else {
        setDuplicateWarning(null);
      }
    } catch {
      // ignore
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Name is required");
      return;
    }

    try {
      setLoading(true);
      if (lead?.id) {
        await LeadService.updateLead(lead.id, formData);
        toast.success("Lead updated successfully");
      } else {
        await LeadService.createLead(formData);
        toast.success("Lead created successfully");
      }
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err.message || "Error saving lead");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-slate-900 border-slate-800 text-slate-100">
        <DialogHeader>
          <DialogTitle className="text-white font-bold text-lg">
            {lead ? "Edit Lead" : "Add New Lead"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {duplicateWarning && (
            <div className="bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-xl p-3 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{duplicateWarning}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400">Full Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Rahul Sharma"
                className="bg-slate-950 border-slate-800 text-white"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400">Phone Number</Label>
              <Input
                value={formData.phone}
                onChange={(e) => {
                  setFormData({ ...formData, phone: e.target.value });
                  checkDuplicate(e.target.value);
                }}
                placeholder="+91 9876543210"
                className="bg-slate-950 border-slate-800 text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400">Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="name@company.com"
                className="bg-slate-950 border-slate-800 text-white"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400">{isCandidate ? "Applied Role" : "Job Title"}</Label>
              <Input
                value={formData.job_title}
                onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                placeholder="e.g. Sales Manager"
                className="bg-slate-950 border-slate-800 text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400">
                {isCandidate ? "Current Company / College" : "Company Name"}
              </Label>
              <Input
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                placeholder="Company Pvt Ltd"
                className="bg-slate-950 border-slate-800 text-white"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400">
                {isCandidate ? "Expected CTC (₹)" : "Deal Value (₹)"}
              </Label>
              <Input
                type="number"
                value={formData.deal_value}
                onChange={(e) => setFormData({ ...formData, deal_value: Number(e.target.value) })}
                className="bg-slate-950 border-slate-800 text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400">Lead Status</Label>
              <Select
                value={formData.lead_status}
                onValueChange={(val) => setFormData({ ...formData, lead_status: val })}
              >
                <SelectTrigger className="bg-slate-950 border-slate-800 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-white">
                  <SelectItem value="NEW">New</SelectItem>
                  <SelectItem value="CONTACTED">Contacted</SelectItem>
                  <SelectItem value="QUALIFIED">Qualified</SelectItem>
                  <SelectItem value="PROPOSAL">Proposal</SelectItem>
                  <SelectItem value="WON">Won</SelectItem>
                  <SelectItem value="LOST">Lost</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400">Source</Label>
              <Select
                value={formData.source}
                onValueChange={(val) => setFormData({ ...formData, source: val })}
              >
                <SelectTrigger className="bg-slate-950 border-slate-800 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-white">
                  <SelectItem value="MANUAL">Manual</SelectItem>
                  <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                  <SelectItem value="CSV_IMPORT">CSV Import</SelectItem>
                  <SelectItem value="AI_AGENT">AI Agent</SelectItem>
                  <SelectItem value="EMAIL">Email</SelectItem>
                  <SelectItem value="WEBHOOK">Webhook</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-slate-400">Notes</Label>
            <Textarea
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Key notes from conversation..."
              className="bg-slate-950 border-slate-800 text-white"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              variant="outline"
              type="button"
              onClick={() => onOpenChange(false)}
              className="border-slate-800 text-slate-400 hover:text-white"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold">
              {loading ? "Saving..." : lead ? "Save Changes" : "Create Lead"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
