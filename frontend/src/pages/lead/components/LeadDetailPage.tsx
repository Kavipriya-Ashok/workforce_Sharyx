import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowLeft,
  Phone,
  Mail,
  MessageSquare,
  Clock,
  Building,
  FileText,
  MapPin,
  BadgeDollarSign,
  Briefcase,
  Calendar,
  ExternalLink,
  Video,
  PhoneCall,
  Sparkles,
  UserCheck,
  Bot,
  Volume2,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Play,
  Pause,
  Download,
  CalendarCheck,
  Edit,
  ShieldCheck,
  User,
} from "lucide-react";
import { Lead } from "@/types/lead";
import { LeadService } from "@/service/leadService";
import { customerService } from "@/service/customerService";
import { VoiceService, VoiceCallLogItem } from "@/service/voiceService";
import { SendLeadEmailModal } from "./SendLeadEmailModal";
import { toast } from "sonner";
import { formatDistanceToNow, isValid } from "date-fns";

const safeDistanceToNow = (dateInput: any, fallback: string = "recently") => {
  if (!dateInput) return fallback;
  try {
    const d = new Date(dateInput);
    if (!isValid(d) || isNaN(d.getTime())) return fallback;
    return formatDistanceToNow(d, { addSuffix: true });
  } catch {
    return fallback;
  }
};

interface Props {
  leadId: string;
  onBack: () => void;
  onUpdate: () => void;
  onEdit?: (lead: Lead) => void;
  onScheduleInterview?: (lead: Lead) => void;
  onOpenVoiceCall?: (lead: Lead) => void;
}

const CANDIDATE_STAGES = [
  { value: "new", label: "🆕 New Profile", color: "bg-blue-100 text-blue-700 border-blue-200" },
  { value: "screening", label: "🔍 Screening", color: "bg-amber-100 text-amber-700 border-amber-200" },
  { value: "scheduled", label: "📅 Interview Scheduled", color: "bg-purple-100 text-purple-700 border-purple-200" },
  { value: "offered", label: "✉️ Offer Extended", color: "bg-cyan-100 text-cyan-700 border-cyan-200" },
  { value: "joined", label: "✅ Candidate Joined", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  { value: "rejected", label: "❌ Rejected / Archived", color: "bg-rose-100 text-rose-700 border-rose-200" },
];

const LEAD_STAGES = [
  { value: "NEW", label: "🆕 New Lead", color: "bg-blue-100 text-blue-700 border-blue-200" },
  { value: "CONTACTED", label: "📞 Contacted", color: "bg-amber-100 text-amber-700 border-amber-200" },
  { value: "QUALIFIED", label: "⭐ Qualified", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  { value: "PROPOSAL", label: "📑 Proposal / Demo", color: "bg-purple-100 text-purple-700 border-purple-200" },
  { value: "WON", label: "🏆 Deal Won", color: "bg-green-100 text-green-700 border-green-200" },
  { value: "LOST", label: "❌ Deal Lost", color: "bg-slate-100 text-slate-700 border-slate-200" },
];

export function LeadDetailPage({
  leadId,
  onBack,
  onUpdate,
  onEdit,
  onScheduleInterview,
  onOpenVoiceCall,
}: Props) {
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState("");
  const [submittingNote, setSubmittingNote] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [stageUpdating, setStageUpdating] = useState(false);
  const [convertingCustomer, setConvertingCustomer] = useState(false);

  // Candidate Summary State
  const [candidateSummary, setCandidateSummary] = useState<string>("");
  const [isEditingSummary, setIsEditingSummary] = useState(false);
  const [savingSummary, setSavingSummary] = useState(false);

  // Voice AI Agents & Call Logs
  const [leadCallLogs, setLeadCallLogs] = useState<VoiceCallLogItem[]>([]);
  const [loadingCallLogs, setLoadingCallLogs] = useState(false);
  const [expandedTranscriptId, setExpandedTranscriptId] = useState<string | null>(null);

  const fetchDetails = async () => {
    try {
      setLoading(true);
      const data = await LeadService.getLeadById(leadId);
      setLead(data);
      const summ = data?.custom_fields?.candidate_summary || data?.notes || "";
      setCandidateSummary(summ);
      if (data?.phone) {
        fetchLeadCallLogs(data.phone);
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to load lead details");
    } finally {
      setLoading(false);
    }
  };

  const fetchLeadCallLogs = async (phoneNumber?: string) => {
    const phoneToMatch = phoneNumber || lead?.phone;
    if (!phoneToMatch && !leadId) return;
    try {
      setLoadingCallLogs(true);
      const logs = await VoiceService.getCallLogs(undefined, 50, undefined, true);
      const cleanTarget = (phoneToMatch || "").replace(/\D/g, "").slice(-10);
      const list = Array.isArray(logs) ? logs : [];
      const filtered = list.filter((item: VoiceCallLogItem) => {
        const itemClean = (item.customer_phone || "").replace(/\D/g, "").slice(-10);
        return (cleanTarget && itemClean === cleanTarget) || (leadId && (item as any).lead_id === leadId);
      });
      setLeadCallLogs(filtered);
    } catch {
      // non-fatal
    } finally {
      setLoadingCallLogs(false);
    }
  };

  useEffect(() => {
    if (leadId) {
      fetchDetails();
    }
  }, [leadId]);

  const handleStageChange = async (newStage: string) => {
    if (!lead) return;
    setStageUpdating(true);
    try {
      if (lead.is_candidate) {
        await LeadService.updateLead({ id: lead.id, candidate_stage: newStage as any });
      } else {
        await LeadService.updateLeadStatus(lead.id, newStage.toUpperCase());
      }
      toast.success(`Stage updated to ${newStage.toUpperCase()}! 🚀`);
      fetchDetails();
      onUpdate();
    } catch (e: any) {
      toast.error(e.message || "Failed to update stage");
    } finally {
      setStageUpdating(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead || !note.trim()) return;
    setSubmittingNote(true);
    try {
      await LeadService.addActivity(lead.id, "Internal Note", note.trim(), "NOTE");
      setNote("");
      toast.success("Note added successfully");
      fetchDetails();
      onUpdate();
    } catch (e: any) {
      toast.error(e.message || "Failed to add note");
    } finally {
      setSubmittingNote(false);
    }
  };

  const handleSaveSummary = async () => {
    if (!lead) return;
    setSavingSummary(true);
    try {
      const updatedCustomFields = {
        ...(lead.custom_fields || {}),
        candidate_summary: candidateSummary,
      };
      await LeadService.updateLead({
        id: lead.id,
        custom_fields: updatedCustomFields,
      } as any);
      toast.success("Candidate summary saved! 💾");
      setIsEditingSummary(false);
      fetchDetails();
      onUpdate();
    } catch (err: any) {
      toast.error(err.message || "Failed to save summary");
    } finally {
      setSavingSummary(false);
    }
  };

  const handleConvertToCustomer = async () => {
    if (!lead) return;
    setConvertingCustomer(true);
    try {
      await customerService.convertLeadToCustomer(lead.id, {
        tier: (lead.deal_value || 0) >= 10000 ? "ENTERPRISE" : "PROFESSIONAL",
        subscription_status: "ACTIVE",
        auto_rule_matched: "manual_detail_page",
      });
      toast.success(`🎉 ${lead.name} successfully converted to an Active Customer!`);
      fetchDetails();
      onUpdate();
    } catch (err: any) {
      toast.error(err.message || "Conversion failed");
    } finally {
      setConvertingCustomer(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] bg-white rounded-3xl border border-slate-200 p-8">
        <RefreshCw className="h-8 w-8 text-blue-600 animate-spin mb-3" />
        <p className="text-sm font-semibold text-slate-700">Loading full profile & omnichannel history...</p>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center space-y-4">
        <p className="text-base font-semibold text-slate-800">Lead record not found</p>
        <Button onClick={onBack} variant="outline" className="rounded-xl">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to List
        </Button>
      </div>
    );
  }

  const isCandidate = lead.is_candidate;
  const currentStage = (isCandidate ? lead.candidate_stage || "new" : lead.lead_status || "NEW").toUpperCase();
  const stageOptions = isCandidate ? CANDIDATE_STAGES : LEAD_STAGES;
  const stageObj = stageOptions.find((s) => s.value.toUpperCase() === currentStage) || stageOptions[0];
  const custom = lead.custom_fields || {};

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      {/* ── Top Navigation & Action Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onBack}
            className="rounded-xl border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold"
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to {isCandidate ? "Candidates" : "Leads"}
          </Button>
          <div className="h-6 w-px bg-slate-200 hidden sm:block" />
          <span className="text-xs text-slate-500 font-medium">
            {isCandidate ? "Candidate Profile & Hiring Flow" : "CRM Sales Pipeline Contact"}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={`/admin/omnichannel/${lead.id}`}
            className="inline-flex items-center px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
          >
            <Sparkles className="h-3.5 w-3.5 mr-1.5 text-amber-300" />
            <span>360° Omnichannel Stream</span>
          </a>
          {lead.phone && onOpenVoiceCall && (
            <Button
              size="sm"
              onClick={() => onOpenVoiceCall(lead)}
              className="rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-semibold text-xs shadow-xs"
            >
              <PhoneCall className="h-3.5 w-3.5 mr-1.5" /> AI Voice Call
            </Button>
          )}

          <Button
            size="sm"
            onClick={() => setEmailModalOpen(true)}
            className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs"
          >
            <Mail className="h-3.5 w-3.5 mr-1.5" /> Send Email
          </Button>

          {lead.phone && (
            <a
              href={`https://wa.me/${lead.phone.replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition-colors"
            >
              <MessageSquare className="h-3.5 w-3.5 mr-1.5" /> WhatsApp
            </a>
          )}

          {isCandidate && onScheduleInterview && (
            <Button
              size="sm"
              onClick={() => onScheduleInterview(lead)}
              className="rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs shadow-xs"
            >
              <CalendarCheck className="h-3.5 w-3.5 mr-1.5" /> Schedule Interview
            </Button>
          )}

          {!isCandidate && (
            <Button
              size="sm"
              onClick={handleConvertToCustomer}
              disabled={convertingCustomer}
              className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs"
            >
              <UserCheck className="h-3.5 w-3.5 mr-1.5" />
              {convertingCustomer ? "Converting..." : "Convert to Customer"}
            </Button>
          )}

          {onEdit && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onEdit(lead)}
              className="rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs"
            >
              <Edit className="h-3.5 w-3.5 mr-1.5" /> Edit
            </Button>
          )}
        </div>
      </div>

      {/* ── Main Profile Header Card ── */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-blue-500 to-cyan-400 flex items-center justify-center text-white text-2xl font-black shadow-md border-2 border-white/20">
              {lead.name ? lead.name[0].toUpperCase() : "L"}
            </div>
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-extrabold tracking-tight">{lead.name}</h1>
                <Badge className={`${stageObj.color} text-xs font-bold px-2.5 py-0.5 border`}>
                  {stageObj.label}
                </Badge>
                {isCandidate ? (
                  <Badge className="bg-purple-500/20 text-purple-200 border-purple-400/30 text-xs">
                    🎓 Placement Candidate
                  </Badge>
                ) : (
                  <Badge className="bg-blue-500/20 text-blue-200 border-blue-400/30 text-xs">
                    💼 Sales Lead
                  </Badge>
                )}
              </div>
              <p className="text-sm text-blue-200/90 font-medium">
                {lead.job_title || (isCandidate ? "Candidate" : "Contact")} {lead.company_name ? `at ${lead.company_name}` : ""}
              </p>
              <div className="flex flex-wrap items-center gap-4 text-xs text-blue-200/70 pt-1">
                {lead.phone && (
                  <span className="flex items-center gap-1.5 font-mono">
                    <Phone className="h-3.5 w-3.5 text-cyan-400" /> {lead.phone}
                  </span>
                )}
                {lead.email && (
                  <span className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-indigo-300" /> {lead.email}
                  </span>
                )}
                {lead.created_on && (
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-amber-300" /> Captured {formatDistanceToNow(new Date(lead.created_on))} ago
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Stage Switcher */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/15 min-w-[240px] space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-200 block">
              Change Pipeline Stage
            </span>
            <Select value={currentStage} onValueChange={handleStageChange} disabled={stageUpdating}>
              <SelectTrigger className="bg-white text-slate-900 font-semibold text-xs rounded-xl h-9 border-none shadow-sm">
                <SelectValue placeholder="Update Stage..." />
              </SelectTrigger>
              <SelectContent>
                {stageOptions.map((s) => (
                  <SelectItem key={s.value} value={s.value} className="text-xs font-medium">
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* ── Content Grid: Left Column All Fields, Right Column Omnichannel & History ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: All Lead/Candidate Fields (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Candidate / Job Specific Fields */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-blue-600" />
                {isCandidate ? "Candidate & Career Profile Details" : "Lead & Business Details"}
              </h2>
              <span className="text-xs text-slate-400">All Captured Fields</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <span className="text-xs text-slate-500 font-medium">Applied Role / Title</span>
                <p className="text-sm font-bold text-slate-900">{lead.job_title || "Not specified"}</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <span className="text-xs text-slate-500 font-medium">
                  {isCandidate ? "Current / Last Company" : "Organization / Company"}
                </span>
                <p className="text-sm font-bold text-slate-900">{lead.company_name || "Direct Inquiry"}</p>
              </div>

              {isCandidate && (
                <>
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                    <span className="text-xs text-slate-500 font-medium">Total Experience</span>
                    <p className="text-sm font-bold text-slate-900">
                      {lead.total_experience !== undefined && lead.total_experience !== null
                        ? `${lead.total_experience} Years`
                        : "Not specified"}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                    <span className="text-xs text-slate-500 font-medium">Relevant Experience</span>
                    <p className="text-sm font-bold text-slate-900">
                      {lead.relevant_experience !== undefined && lead.relevant_experience !== null
                        ? `${lead.relevant_experience} Years`
                        : custom.relevant_experience !== undefined && custom.relevant_experience !== null
                        ? `${custom.relevant_experience} Years`
                        : "Not specified"}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                    <span className="text-xs text-slate-500 font-medium">Employment / Notice Period</span>
                    <p className="text-sm font-bold text-slate-900">{lead.employment_status || custom.employment_status || "Not specified"}</p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                    <span className="text-xs text-slate-500 font-medium">Expected Relieving Date</span>
                    <p className="text-sm font-bold text-slate-900">
                      {custom.relieving_date
                        ? new Date(custom.relieving_date).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "Immediate"}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                    <span className="text-xs text-slate-500 font-medium">Current CTC</span>
                    <p className="text-sm font-bold text-slate-900">
                      {lead.current_ctc ? `₹${lead.current_ctc} LPA` : custom.current_ctc ? `₹${custom.current_ctc} LPA` : "Not disclosed"}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                    <span className="text-xs text-slate-500 font-medium">Expected CTC</span>
                    <p className="text-sm font-bold text-emerald-700 font-mono">
                      {lead.expected_ctc ? `₹${lead.expected_ctc} LPA` : custom.expected_ctc ? `₹${custom.expected_ctc} LPA` : "Negotiable"}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                    <span className="text-xs text-slate-500 font-medium">Relocation Availability</span>
                    <p className="text-sm font-bold text-slate-900">{lead.relocation || custom.relocation || "Open to relocation"}</p>
                  </div>
                </>
              )}

              {!isCandidate && (
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                  <span className="text-xs text-slate-500 font-medium">Estimated Deal Value</span>
                  <p className="text-sm font-bold text-emerald-700 font-mono">
                    {lead.deal_value ? `₹${Number(lead.deal_value).toLocaleString("en-IN")}` : "₹0"}
                  </p>
                </div>
              )}

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <span className="text-xs text-slate-500 font-medium">Inquiry Channel / Source</span>
                <p className="text-sm font-bold text-slate-900 uppercase">
                  {lead.source || "Omnichannel Voice AI"}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <span className="text-xs text-slate-500 font-medium">Score & Quality</span>
                <p className="text-sm font-bold text-slate-900">
                  Quality Score: {lead.score || 85}/100
                </p>
              </div>
            </div>

            {/* Resume Card if Candidate */}
            {isCandidate && (
              <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">Candidate Resume / CV Document</span>
                    <span className="text-xs text-slate-500">
                      {lead.resume_url ? "Uploaded on file & indexed by AI agent" : "No resume file attached"}
                    </span>
                  </div>
                </div>
                {lead.resume_url ? (
                  <a
                    href={lead.resume_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs"
                  >
                    <Download className="h-3.5 w-3.5 mr-1.5" /> View Resume
                  </a>
                ) : (
                  <span className="text-xs text-slate-400 italic">Pending candidate upload</span>
                )}
              </div>
            )}

            {/* Google Meet / Interview Slot Card */}
            {(lead.interview_link || lead.preferred_interview_slot) && (
              <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold">
                    <Video className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-purple-950 block">Google Meet Interview Session</span>
                    <span className="text-xs text-purple-700 font-medium">
                      {lead.preferred_interview_slot || "Slot Confirmed"}
                    </span>
                  </div>
                </div>
                {lead.interview_link && (
                  <a
                    href={lead.interview_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-xs"
                  >
                    <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Join Meet
                  </a>
                )}
              </div>
            )}
          </div>

          {/* AI / Recruiter Screening Summary */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  {isCandidate ? "Candidate Evaluation & AI Screening Summary" : "Lead Notes & Opportunity Assessment"}
                </h3>
              </div>
              {!isEditingSummary ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsEditingSummary(true)}
                  className="rounded-xl text-xs h-8 border-slate-200 font-semibold"
                >
                  <Edit className="h-3 w-3 mr-1" /> Edit Summary
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsEditingSummary(false)}
                    className="rounded-xl text-xs h-8"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveSummary}
                    disabled={savingSummary}
                    className="rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs h-8 font-semibold"
                  >
                    {savingSummary ? "Saving..." : "Save"}
                  </Button>
                </div>
              )}
            </div>

            {isEditingSummary ? (
              <Textarea
                value={candidateSummary}
                onChange={(e) => setCandidateSummary(e.target.value)}
                rows={4}
                className="w-full text-xs rounded-2xl border-slate-200 p-3"
                placeholder="Enter candidate summary, skills assessment, or recruiter notes..."
              />
            ) : candidateSummary ? (
              <div className="p-4 rounded-2xl bg-purple-50/40 border border-purple-100 text-xs text-slate-700 leading-relaxed whitespace-pre-wrap font-sans">
                {candidateSummary}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">
                No evaluation notes yet. Summaries will auto-populate after AI phone screenings or you can enter them manually.
              </p>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Voice AI Call Logs & Internal Timeline (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Voice AI Calls & Audio Player */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Volume2 className="h-4 w-4 text-cyan-600" />
                AI Voice Calls & Dialogue Logs ({leadCallLogs.length})
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fetchLeadCallLogs(lead.phone)}
                className="h-7 px-2 text-slate-400 hover:text-slate-700"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loadingCallLogs ? "animate-spin" : ""}`} />
              </Button>
            </div>

            {leadCallLogs.length > 0 ? (
              <div className="space-y-3">
                {leadCallLogs.map((call) => {
                  const isExpanded = expandedTranscriptId === call.id;
                  return (
                    <div
                      key={call.id}
                      className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-2.5 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-cyan-100 text-cyan-800 border-cyan-200 text-[10px] font-bold">
                            {call.provider?.toUpperCase() || "VOICE AI"}
                          </Badge>
                          <span className="text-xs font-bold text-slate-800">
                            {call.agent_name || "Maya"}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400">
                          {safeDistanceToNow(call.created_on)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-600">
                        <span>Duration: {call.duration_seconds || 0}s</span>
                        <span className="font-semibold text-emerald-700 capitalize">
                          {call.call_status || "completed"}
                        </span>
                      </div>

                      {call.summary && (
                        <p className="text-[11px] text-slate-600 bg-white p-2.5 rounded-xl border border-slate-100 leading-normal">
                          <span className="font-bold text-slate-700">Summary: </span>
                          {call.summary}
                        </p>
                      )}

                      {/* Audio Recording Player */}
                      {(call.recording_url || call.provider_call_id) && (
                        <div className="pt-1">
                          <audio
                            controls
                            className="w-full h-8"
                            src={`/api/Voice/Calls/audio?callId=${call.id}&providerCallId=${call.provider_call_id || ""}`}
                            preload="none"
                          >
                            Your browser does not support audio playback.
                          </audio>
                        </div>
                      )}

                      {/* Expandable Transcript */}
                      {call.transcript && (
                        <div>
                          <button
                            type="button"
                            onClick={() => setExpandedTranscriptId(isExpanded ? null : call.id)}
                            className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
                          >
                            {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                            {isExpanded ? "Hide Full Transcript" : "View Full Transcript"}
                          </button>
                          {isExpanded && (
                            <div className="mt-2 p-3 rounded-xl bg-white border border-slate-200 text-[11px] text-slate-700 max-h-48 overflow-y-auto whitespace-pre-wrap font-sans">
                              {call.transcript}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic py-2 text-center">
                No voice call recordings found for this phone number yet.
              </p>
            )}
          </div>

          {/* WhatsApp Conversation Thread Card */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-emerald-600" />
                WhatsApp Live Messages ({(lead.whatsappMessages || []).length})
              </h3>
              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] font-bold">
                WhatsApp Cloud
              </Badge>
            </div>

            {lead.whatsappMessages && lead.whatsappMessages.length > 0 ? (
              <div className="space-y-2.5 max-h-80 overflow-y-auto p-2 bg-slate-50/60 rounded-2xl border border-slate-100">
                {lead.whatsappMessages.map((msg: any) => {
                  const isInbound = msg.direction === "inbound";
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isInbound ? "items-start" : "items-end"}`}
                    >
                      <div
                        className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed ${
                          isInbound
                            ? "bg-white text-slate-900 border border-slate-200 shadow-xs rounded-tl-none"
                            : "bg-emerald-600 text-white shadow-xs rounded-tr-none"
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words">{msg.message_text}</p>
                      </div>
                      <span className="text-[10px] text-slate-400 mt-1 px-1">
                        {isInbound ? lead.name : "Sharyx AI"} •{" "}
                        {safeDistanceToNow(msg.created_on)}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic py-2 text-center">
                No WhatsApp messages logged for this contact yet.
              </p>
            )}
          </div>

          {/* Email Interaction Logs Card */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Mail className="h-4 w-4 text-indigo-600" />
                Email Threads & Replies ({(lead.emailLogs || []).length})
              </h3>
              <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200 text-[10px] font-bold">
                IMAP / Gmail
              </Badge>
            </div>

            {lead.emailLogs && lead.emailLogs.length > 0 ? (
              <div className="space-y-3 max-h-80 overflow-y-auto p-1">
                {lead.emailLogs.map((em: any) => (
                  <div
                    key={em.id}
                    className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-900 truncate max-w-[70%]">
                        {em.subject || "No Subject"}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {safeDistanceToNow(em.created_on)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500">
                      <span className="capitalize font-semibold text-slate-700">
                        {em.direction === "inbound" ? "📥 Inbound" : "📤 Outbound"}
                      </span>
                      <span>•</span>
                      <span>To: {em.to_email}</span>
                    </div>
                    {em.body_text && (
                      <p className="text-[11px] text-slate-600 bg-white p-2.5 rounded-xl border border-slate-100 line-clamp-3">
                        {em.body_text}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic py-2 text-center">
                No email communications found for this contact yet.
              </p>
            )}
          </div>

          {/* Activity Notes & Timeline */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <Clock className="h-4 w-4 text-indigo-600" />
              Activity Notes & Interactions
            </h3>

            {/* Add note input */}
            <form onSubmit={handleAddNote} className="space-y-2">
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Write an internal update or interview feedback..."
                rows={2}
                className="text-xs rounded-xl border-slate-200"
              />
              <div className="flex justify-end">
                <Button
                  type="submit"
                  size="sm"
                  disabled={submittingNote || !note.trim()}
                  className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-8"
                >
                  {submittingNote ? "Posting..." : "Post Note"}
                </Button>
              </div>
            </form>

            {/* List activities */}
            <div className="space-y-3 pt-2">
              {lead.activities && lead.activities.length > 0 ? (
                lead.activities.map((act) => (
                  <div key={act.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span className="font-semibold text-slate-700 capitalize">
                        {act.title || act.activity_type}
                      </span>
                      <span>{safeDistanceToNow(act.created_on)}</span>
                    </div>
                    {act.description && <p className="text-xs text-slate-700">{act.description}</p>}
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 italic text-center py-2">No activity records logged yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Email Modal ── */}
      {emailModalOpen && lead && (
        <SendLeadEmailModal
          open={emailModalOpen}
          onOpenChange={setEmailModalOpen}
          lead={lead}
          onEmailSent={() => {
            fetchDetails();
            onUpdate();
          }}
        />
      )}
    </div>
  );
}
