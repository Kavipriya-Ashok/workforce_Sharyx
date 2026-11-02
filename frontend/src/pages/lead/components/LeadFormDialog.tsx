import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Lead } from "@/types/lead";
import { LeadService } from "@/service/leadService";
import { VoiceService, VoiceAgentDto } from "@/service/voiceService";
import { toast } from "sonner";
import { AlertCircle, User, Briefcase, BadgeDollarSign, MapPin, FileText, Calendar, Building, PhoneCall } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead?: Lead | null;
  isCandidate?: boolean;
  onSuccess: () => void;
}

const SectionHeader = ({ icon: Icon, label }: { icon: any; label: string }) => (
  <div className="flex items-center gap-2 pt-3 pb-1 border-b border-slate-200 dark:border-slate-800">
    <Icon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
    <span className="text-xs font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wide">{label}</span>
  </div>
);

export function LeadFormDialog({ open, onOpenChange, lead, isCandidate = false, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [duplicatePhoneWarning, setDuplicatePhoneWarning] = useState<string | null>(null);
  const [duplicateEmailWarning, setDuplicateEmailWarning] = useState<string | null>(null);

  // AI Voice Agent Options
  const [voiceAgents, setVoiceAgents] = useState<VoiceAgentDto[]>([]);
  const [assignedVoiceAgentId, setAssignedVoiceAgentId] = useState<string>("");
  const [autoTriggerCall, setAutoTriggerCall] = useState<boolean>(true);

  useEffect(() => {
    VoiceService.listAgents()
      .then((agents) => {
        setVoiceAgents(agents);
        if (agents.length > 0 && !assignedVoiceAgentId) {
          const def = isCandidate
            ? agents.find((a) => a.template_key === "recruitment" || /recrui|maya|sarah/i.test(a.name)) || agents[0]
            : agents.find((a) => a.template_key === "receptionist" || /reception/i.test(a.name)) || agents[0];
          setAssignedVoiceAgentId(def.id);
        }
      })
      .catch(() => {});
  }, [open, isCandidate]);

  const emptyForm = {
    // Core
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
    // Candidate-only
    total_experience: "" as any,
    relevant_experience: "" as any,
    employment_status: "",
    relieving_date: "",
    current_ctc: "" as any,
    expected_ctc: "" as any,
    ctc_basis: "annual",
    relocation: "",
    preferred_interview_slot: "",
    resume_url: "",
    candidate_stage: "new",
  };

  const [formData, setFormData] = useState(emptyForm);

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
        total_experience: (lead as any).total_experience ?? "",
        relevant_experience: (lead as any).relevant_experience ?? "",
        employment_status: (lead as any).employment_status || "",
        relieving_date: (lead as any).relieving_date
          ? new Date((lead as any).relieving_date).toISOString().split("T")[0]
          : "",
        current_ctc: (lead as any).current_ctc ?? "",
        expected_ctc: (lead as any).expected_ctc ?? "",
        ctc_basis: (lead as any).ctc_basis || "annual",
        relocation: (lead as any).relocation || "",
        preferred_interview_slot: (lead as any).preferred_interview_slot || "",
        resume_url: (lead as any).resume_url || "",
        candidate_stage: (lead as any).candidate_stage || "new",
      });
    } else {
      setFormData({ ...emptyForm, is_candidate: isCandidate });
    }
    setDuplicatePhoneWarning(null);
    setDuplicateEmailWarning(null);
  }, [lead, open, isCandidate]);

  const checkDuplicatePhone = async (phone: string) => {
    if (phone.length < 10) return;
    try {
      const res = await LeadService.checkDuplicatePhone(phone, lead?.id);
      if (res.is_duplicate && res.existing_lead) {
        setDuplicatePhoneWarning(
          `Phone already exists for "${res.existing_lead.name}" (${res.existing_lead.lead_status})`
        );
      } else {
        setDuplicatePhoneWarning(null);
      }
    } catch { /* ignore */ }
  };

  const checkDuplicateEmail = async (email: string) => {
    if (!email.includes("@")) return;
    try {
      const res = await LeadService.checkDuplicateEmail(email, lead?.id);
      if (res.is_duplicate && res.existing_lead) {
        setDuplicateEmailWarning(
          `Email already exists for "${res.existing_lead.name}" (${res.existing_lead.lead_status})`
        );
      } else {
        setDuplicateEmailWarning(null);
      }
    } catch { /* ignore */ }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Full name is required");
      return;
    }
    if (!formData.phone.trim()) {
      toast.error("Mobile phone number is required");
      return;
    }
    if (!formData.email.trim()) {
      toast.error("Email address is required");
      return;
    }
    if (isCandidate && !formData.job_title.trim()) {
      toast.error("Applied role is required for candidates");
      return;
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    try {
      setLoading(true);
      const payload: any = {
        ...formData,
        deal_value: Number(formData.deal_value) || 0,
        total_experience: formData.total_experience === "" ? null : Number(formData.total_experience),
        relevant_experience: formData.relevant_experience === "" ? null : Number(formData.relevant_experience),
        current_ctc: formData.current_ctc === "" ? null : Number(formData.current_ctc),
        expected_ctc: formData.expected_ctc === "" ? null : Number(formData.expected_ctc),
        relieving_date: formData.relieving_date || null,
        assigned_voice_agent_id: assignedVoiceAgentId || undefined,
        auto_trigger_call: autoTriggerCall,
        custom_fields: {
          ...((lead as any)?.custom_fields || {}),
          assigned_voice_agent_id: assignedVoiceAgentId || undefined,
        },
      };

      let createdOrUpdated: any = null;
      if (lead?.id) {
        createdOrUpdated = await LeadService.updateLead(lead.id, payload);
        toast.success(isCandidate ? "Candidate updated" : "Lead updated successfully");
      } else {
        createdOrUpdated = await LeadService.createLead(payload);
        toast.success(isCandidate ? "Candidate added successfully" : "Lead created successfully");

        const targetLeadId = createdOrUpdated?.id || createdOrUpdated?.data?.id;
        if (autoTriggerCall && formData.phone && targetLeadId) {
          const chosenAg = voiceAgents.find((a) => a.id === assignedVoiceAgentId);
          toast.info(`📞 Initiating AI Voice Call via ${chosenAg?.name || "Voice Agent"}...`);
          LeadService.triggerVoiceCall(targetLeadId, {
            scheduledType: isCandidate ? "interview" : "demo",
            agentId: assignedVoiceAgentId || undefined,
            agentKey: chosenAg?.template_key,
          }).catch((e: any) => console.warn("Auto call trigger failed:", e));
        }
      }
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err.message || "Error saving");
    } finally {
      setLoading(false);
    }
  };

  const field = (
    id: string,
    label: string,
    value: string,
    onChange: (v: string) => void,
    opts?: { type?: string; placeholder?: string; required?: boolean }
  ) => (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center">
        <span>{label}</span>
        {opts?.required && <span className="text-red-500 font-extrabold ml-1 text-sm">*</span>}
      </Label>
      <Input
        id={id}
        type={opts?.type || "text"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={opts?.placeholder}
        required={opts?.required}
        className="bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 h-9 text-xs rounded-xl"
      />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-bold text-lg">
            {lead
              ? isCandidate ? "Edit Candidate" : "Edit Lead"
              : isCandidate ? "Add New Candidate" : "Add New Lead"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3 py-2">
          {/* Duplicate Warnings */}
          {(duplicatePhoneWarning || duplicateEmailWarning) && (
            <div className="space-y-1.5">
              {duplicatePhoneWarning && (
                <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-700 dark:text-amber-300 rounded-xl p-2.5 text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{duplicatePhoneWarning}</span>
                </div>
              )}
              {duplicateEmailWarning && (
                <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-700 dark:text-amber-300 rounded-xl p-2.5 text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{duplicateEmailWarning}</span>
                </div>
              )}
            </div>
          )}

          {/* ── Section 1: Basic Info ── */}
          <SectionHeader icon={User} label="Basic Information" />
          <div className="grid grid-cols-2 gap-3">
            {field("name", "Full Name", formData.name, (v) => setFormData({ ...formData, name: v }), { required: true, placeholder: "e.g. Rahul Sharma" })}
            {field("phone", "Mobile Number", formData.phone, (v) => {
              setFormData({ ...formData, phone: v });
              checkDuplicatePhone(v);
            }, { required: true, placeholder: "+91 9876543210", type: "tel" })}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {field("email", "Email Address", formData.email, (v) => {
              setFormData({ ...formData, email: v });
              if (v.includes("@")) checkDuplicateEmail(v);
            }, { required: true, type: "email", placeholder: "name@company.com" })}
            {field("job_title", isCandidate ? "Applied Role" : "Job Title", formData.job_title, (v) => setFormData({ ...formData, job_title: v }), { required: isCandidate, placeholder: isCandidate ? "e.g. Frontend Developer" : "e.g. Sales Manager" })}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {field("company_name", isCandidate ? "Current/Last Company" : "Company Name", formData.company_name, (v) => setFormData({ ...formData, company_name: v }), { placeholder: "Company Pvt Ltd" })}

            {!isCandidate && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Deal Value (₹)</Label>
                <Input
                  type="number"
                  value={formData.deal_value}
                  onChange={(e) => setFormData({ ...formData, deal_value: Number(e.target.value) })}
                  className="bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 h-9 text-xs rounded-xl"
                />
              </div>
            )}
          </div>

          {/* ── Candidate-only fields ── */}
          {isCandidate && (
            <>
              {/* ── Section 2: Experience ── */}
              <SectionHeader icon={Briefcase} label="Experience" />
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="total_exp" className="text-xs font-semibold text-slate-700 dark:text-slate-300">Total Experience (yrs)</Label>
                  <Input
                    id="total_exp"
                    type="number"
                    step="0.5"
                    min={0}
                    value={formData.total_experience}
                    onChange={(e) => setFormData({ ...formData, total_experience: e.target.value })}
                    placeholder="e.g. 3.5"
                    className="bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 h-9 text-xs rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rel_exp" className="text-xs font-semibold text-slate-700 dark:text-slate-300">Relevant Experience (yrs)</Label>
                  <Input
                    id="rel_exp"
                    type="number"
                    step="0.5"
                    min={0}
                    value={formData.relevant_experience}
                    onChange={(e) => setFormData({ ...formData, relevant_experience: e.target.value })}
                    placeholder="e.g. 2"
                    className="bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 h-9 text-xs rounded-xl"
                  />
                </div>
              </div>

              {/* ── Section 3: Employment Status ── */}
              <SectionHeader icon={Building} label="Employment Status" />
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Employment Status</Label>
                  <Select
                    value={formData.employment_status}
                    onValueChange={(v) => setFormData({ ...formData, employment_status: v })}
                  >
                    <SelectTrigger className="bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 h-9 text-xs rounded-xl">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                      <SelectItem value="working">Working</SelectItem>
                      <SelectItem value="notice">Serving Notice</SelectItem>
                      <SelectItem value="relieved">Relieved</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {(formData.employment_status === "notice" || formData.employment_status === "relieved") && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {formData.employment_status === "notice" ? "Notice End / Last Working Date" : "Relieving Date"}
                    </Label>
                    <Input
                      type="date"
                      value={formData.relieving_date}
                      onChange={(e) => setFormData({ ...formData, relieving_date: e.target.value })}
                      className="bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 h-9 text-xs rounded-xl"
                    />
                  </div>
                )}
              </div>

              {/* ── Section 4: Salary ── */}
              <SectionHeader icon={BadgeDollarSign} label="Salary / CTC" />
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Current CTC (₹)</Label>
                  <Input
                    type="number"
                    value={formData.current_ctc}
                    onChange={(e) => setFormData({ ...formData, current_ctc: e.target.value })}
                    placeholder="e.g. 600000"
                    className="bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 h-9 text-xs rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Expected CTC (₹)</Label>
                  <Input
                    type="number"
                    value={formData.expected_ctc}
                    onChange={(e) => setFormData({ ...formData, expected_ctc: e.target.value })}
                    placeholder="e.g. 800000"
                    className="bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 h-9 text-xs rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">CTC Basis</Label>
                  <Select
                    value={formData.ctc_basis}
                    onValueChange={(v) => setFormData({ ...formData, ctc_basis: v })}
                  >
                    <SelectTrigger className="bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 h-9 text-xs rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                      <SelectItem value="annual">Annual</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* ── Section 5: Relocation & Interview ── */}
              <SectionHeader icon={MapPin} label="Relocation & Interview Preference" />
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Relocation Availability</Label>
                  <Select
                    value={formData.relocation}
                    onValueChange={(v) => setFormData({ ...formData, relocation: v })}
                  >
                    <SelectTrigger className="bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 h-9 text-xs rounded-xl">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                      <SelectItem value="yes">Yes — Open to relocation</SelectItem>
                      <SelectItem value="no">No — Not open</SelectItem>
                      <SelectItem value="conditional">Conditional (specific cities)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {field("pref_slot", "Preferred Interview Slot", formData.preferred_interview_slot,
                  (v) => setFormData({ ...formData, preferred_interview_slot: v }),
                  { placeholder: "e.g. Mon 10 AM - 12 PM" }
                )}
              </div>

              {/* ── Section 6: Resume ── */}
              <SectionHeader icon={FileText} label="Resume / CV" />
              {field("resume_url", "Resume Link (Google Drive / Dropbox / URL)", formData.resume_url,
                (v) => setFormData({ ...formData, resume_url: v }),
                { placeholder: "https://drive.google.com/..." }
              )}

              {/* ── Section 7: Candidate Stage ── */}
              <SectionHeader icon={Calendar} label="Candidate Stage" />
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Pipeline Stage</Label>
                  <Select
                    value={formData.candidate_stage}
                    onValueChange={(v) => setFormData({ ...formData, candidate_stage: v })}
                  >
                    <SelectTrigger className="bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 h-9 text-xs rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                      <SelectItem value="new">🆕 New</SelectItem>
                      <SelectItem value="screening">🔍 Screening</SelectItem>
                      <SelectItem value="scheduled">📅 Interview Scheduled</SelectItem>
                      <SelectItem value="offered">✉️ Offered</SelectItem>
                      <SelectItem value="joined">✅ Joined</SelectItem>
                      <SelectItem value="rejected">❌ Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          )}

          {/* ── Status & Source (all) ── */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {isCandidate ? "Lead Status" : "Lead Status"}
              </Label>
              <Select
                value={formData.lead_status}
                onValueChange={(val) => setFormData({ ...formData, lead_status: val })}
              >
                <SelectTrigger className="bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 h-9 text-xs rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
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
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Source</Label>
              <Select
                value={formData.source}
                onValueChange={(val) => setFormData({ ...formData, source: val })}
              >
                <SelectTrigger className="bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 h-9 text-xs rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
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

          {/* ── AI Voice Agent Selection & Instant Call ── */}
          <div className="p-3.5 bg-blue-50/70 dark:bg-blue-950/40 rounded-xl border border-blue-200/80 dark:border-blue-800/60 space-y-2.5">
            <div className="flex items-center gap-2">
              <PhoneCall className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span className="text-xs font-bold text-blue-900 dark:text-blue-200 uppercase tracking-wide">
                AI Voice Telephony Agent
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Assigned Voice Agent</Label>
                <Select
                  value={assignedVoiceAgentId}
                  onValueChange={setAssignedVoiceAgentId}
                >
                  <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 h-9 text-xs rounded-xl">
                    <SelectValue placeholder="Choose an AI Voice Agent..." />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                    {voiceAgents.map((ag) => (
                      <SelectItem key={ag.id} value={ag.id} className="text-xs">
                        {ag.name} ({ag.provider.toUpperCase()})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {!lead?.id && (
                <div className="flex items-center space-x-2 pt-6">
                  <input
                    type="checkbox"
                    id="autoTriggerCall"
                    checked={autoTriggerCall}
                    onChange={(e) => setAutoTriggerCall(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <Label htmlFor="autoTriggerCall" className="text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                    Trigger outbound call immediately
                  </Label>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Notes</Label>
            <Textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Key notes from conversation..."
              className="bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs rounded-xl"
            />
          </div>

          <DialogFooter className="pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button
              variant="ghost"
              type="button"
              onClick={() => onOpenChange(false)}
              className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs h-9 px-4 rounded-xl shadow-xs shadow-blue-600/20"
            >
              {loading ? "Saving..." : lead ? "Save Changes" : isCandidate ? "Add Candidate" : "Create Lead"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
