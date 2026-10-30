import React, { useState, useEffect } from "react";
import {
  Users,
  Search,
  Plus,
  FileSpreadsheet,
  Kanban,
  List,
  Trash2,
  Phone,
  MessageSquare,
  Mail,
  ChevronRight,
  IndianRupee,
  CheckCircle2,
  Clock,
  Sparkles,
  Award,
  RefreshCw,
  Video,
  PhoneCall,
  Calendar,
  GraduationCap,
  FileText,
  ExternalLink,
  BellRing,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Lead, LeadFilter, LeadStats } from "@/types/lead";
import { LeadService } from "@/service/leadService";
import { VoiceService, VoiceAgentDto } from "@/service/voiceService";
import { LeadFormDialog } from "./components/LeadFormDialog";
import { LeadDetailDrawer } from "./components/LeadDetailDrawer";
import { LeadImportDialog } from "./components/LeadImportDialog";
import { SendLeadEmailModal } from "./components/SendLeadEmailModal";
import { toast } from "sonner";

const STAGES = [
  { key: "NEW", label: "New", color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
  { key: "CONTACTED", label: "Contacted", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
  { key: "QUALIFIED", label: "Qualified", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
  { key: "PROPOSAL", label: "Proposal", color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20" },
  { key: "WON", label: "Won", color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/20" },
  { key: "LOST", label: "Lost", color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20" },
];

export default function Leads({ isCandidate = false }: { isCandidate?: boolean }) {
  const [activeTab, setActiveTab] = useState<"leads" | "candidates">(isCandidate ? "candidates" : "leads");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState<LeadStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"table" | "kanban">("table");

  // Filters & Pagination
  const [filter, setFilter] = useState<LeadFilter>({
    keyword: "",
    status: "ALL",
    source: "ALL",
    take: 25,
    skip: 0,
    is_candidate: isCandidate,
  });

  // Selected for Bulk Actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Dialog & Drawer States
  const [formOpen, setFormOpen] = useState(false);
  const [editLead, setEditLead] = useState<Lead | null>(null);
  const [drawerLeadId, setDrawerLeadId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [emailModalLead, setEmailModalLead] = useState<Lead | null>(null);

  // AI Voice Agent Calling States
  const [voiceAgents, setVoiceAgents] = useState<VoiceAgentDto[]>([]);
  const [callModalLead, setCallModalLead] = useState<Lead | null>(null);
  const [callSelectedAgentId, setCallSelectedAgentId] = useState<string>("");
  const [dispatchingCall, setDispatchingCall] = useState(false);

  useEffect(() => {
    VoiceService.listAgents()
      .then((agents) => {
        setVoiceAgents(agents);
        if (agents.length > 0) setCallSelectedAgentId(agents[0].id);
      })
      .catch(() => {});
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const isCandBool = activeTab === "candidates" ? true : undefined;
      const [leadsRes, statsRes] = await Promise.all([
        LeadService.getLeads({ ...filter, is_candidate: isCandBool }),
        LeadService.getStats(isCandBool),
      ]);
      setLeads(leadsRes.items || []);
      setStats(statsRes);
    } catch (err: any) {
      toast.error(err.message || "Failed to load leads");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filter.keyword, filter.status, filter.source, filter.skip, activeTab]);

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await LeadService.updateLeadStatus(id, newStatus);
      toast.success("Status updated");
      fetchData();
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedIds.length} selected leads?`)) return;
    try {
      await LeadService.bulkDelete(selectedIds);
      setSelectedIds([]);
      toast.success("Leads deleted");
      fetchData();
    } catch {
      toast.error("Error deleting leads");
    }
  };

  const scheduledInterviews = leads.filter(
    (l) => l.interview_link || l.interview_date || l.preferred_interview_slot || l.candidate_stage === "interview_scheduled"
  );

  return (
    <div className="space-y-6">
      {/* ── Mode Switch: Business Leads vs Candidates & Interviews ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2 p-1 bg-slate-950 rounded-2xl border border-slate-800">
          <button
            onClick={() => {
              setActiveTab("leads");
              setFilter((prev) => ({ ...prev, is_candidate: false, skip: 0 }));
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "leads"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/30 font-bold"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Users className="h-4 w-4" />
            <span>All CRM Leads</span>
          </button>
          <button
            onClick={() => {
              setActiveTab("candidates");
              setFilter((prev) => ({ ...prev, is_candidate: true, skip: 0 }));
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "candidates"
                ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-purple-600/30 font-bold"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <GraduationCap className="h-4 w-4 text-amber-300" />
            <span>Candidates & Scheduled Interviews</span>
            {scheduledInterviews.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 font-extrabold text-[10px]">
                {scheduledInterviews.length}
              </span>
            )}
          </button>
        </div>

        {activeTab === "candidates" && (
          <Badge className="bg-indigo-500/10 text-indigo-300 border-indigo-500/30 font-mono text-xs py-1 gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-indigo-400" />
            Recruitment AI Agent Workforce Active
          </Badge>
        )}
      </div>

      {/* ── Scheduled Interviews Reminder Banner ── */}
      {activeTab === "candidates" && scheduledInterviews.length > 0 && (
        <div className="rounded-2xl border border-indigo-500/40 bg-gradient-to-r from-indigo-950/70 via-purple-950/50 to-slate-900/80 p-5 shadow-2xl space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
              </span>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Calendar className="h-4 w-4 text-indigo-400" />
                Upcoming Scheduled Interviews & Reminders ({scheduledInterviews.length})
              </h3>
            </div>
            <span className="text-[11px] text-indigo-300 font-medium">
              Google Meet links synced • Telephony voice reminders automated
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {scheduledInterviews.map((cand) => (
              <div
                key={cand.id}
                className="p-3.5 rounded-xl border border-indigo-500/30 bg-slate-900/80 hover:border-indigo-400/60 transition-all flex flex-col justify-between space-y-2.5"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs">{cand.name}</span>
                    <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-[9px] uppercase tracking-wider font-bold">
                      {cand.job_title || "Frontend Developer"}
                    </Badge>
                  </div>
                  <div className="text-[11px] text-indigo-300 font-mono mt-1 flex items-center gap-1.5">
                    <Calendar className="h-3 w-3 text-indigo-400" />
                    <span>{cand.preferred_interview_slot || (cand.interview_date ? new Date(cand.interview_date).toLocaleString() : "Scheduled Session")}</span>
                  </div>
                  {cand.email && (
                    <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                      ✉️ {cand.email}
                    </div>
                  )}
                  {cand.resume_url && (
                    <div className="mt-1.5">
                      <a
                        href={cand.resume_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-semibold hover:bg-rose-500/30 transition-all"
                      >
                        <FileText className="h-3 w-3" />
                        <span>Resume (PDF)</span>
                      </a>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-indigo-500/20 flex items-center justify-between gap-2">
                  {cand.interview_link ? (
                    <a
                      href={cand.interview_link}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-[11px] transition-all shadow-xs"
                    >
                      <Video className="h-3.5 w-3.5" />
                      <span>Join Meet</span>
                    </a>
                  ) : (
                    <span className="text-[10px] text-slate-500">No Meet Link</span>
                  )}

                  {cand.phone && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        try {
                          toast.info(`Dialing reminder call to ${cand.name}...`);
                          await LeadService.triggerVoiceCall(cand.id, { scheduledType: "interview" });
                          toast.success(`📞 Outbound reminder call dialed to ${cand.phone}!`);
                          fetchData();
                        } catch (err: any) {
                          toast.error(err?.message || "Failed to trigger call");
                        }
                      }}
                      className="h-7 text-[10px] gap-1 border-violet-500/30 text-violet-300 hover:bg-violet-500/20"
                    >
                      <PhoneCall className="h-3 w-3" />
                      <span>Call Reminder</span>
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── KPI Stats Bar ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {[
          { label: "Total Inquiries", value: stats?.totalLeads ?? 0, icon: Users, color: "text-blue-400" },
          { label: "New Today", value: stats?.newToday ?? 0, icon: Sparkles, color: "text-amber-400" },
          { label: "In Progress", value: stats?.inProgressLeads ?? 0, icon: Clock, color: "text-indigo-400" },
          { label: "Qualified", value: stats?.qualifiedLeads ?? 0, icon: CheckCircle2, color: "text-emerald-400" },
          { label: "Converted / Won", value: stats?.wonLeads ?? 0, icon: Award, color: "text-green-400" },
          {
            label: "Pipeline Value",
            value: `₹${(stats?.pipelineValue || 0).toLocaleString()}`,
            icon: IndianRupee,
            color: "text-purple-400",
          },
        ].map((kpi, idx) => (
          <div
            key={idx}
            className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider">{kpi.label}</span>
              <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">{kpi.value}</span>
          </div>
        ))}
      </div>

      {/* ── Action Bar & Filters ──────────────────────────────────── */}
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between bg-slate-900/40 border border-slate-800/80 p-3 rounded-2xl">
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <Input
              placeholder="Search name, phone, email..."
              value={filter.keyword}
              onChange={(e) => setFilter({ ...filter, keyword: e.target.value, skip: 0 })}
              className="pl-9 h-9 bg-slate-950 border-slate-800 text-white text-xs"
            />
          </div>
          <Select
            value={filter.status}
            onValueChange={(val) => setFilter({ ...filter, status: val, skip: 0 })}
          >
            <SelectTrigger className="w-36 h-9 bg-slate-950 border-slate-800 text-white text-xs">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-800 text-white text-xs">
              <SelectItem value="ALL">All Status</SelectItem>
              {STAGES.map((s) => (
                <SelectItem key={s.key} value={s.key}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-all ${
                viewMode === "table"
                  ? "bg-slate-800 text-white font-semibold shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <List className="h-3.5 w-3.5" /> Table
            </button>
            <button
              onClick={() => setViewMode("kanban")}
              className={`p-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-all ${
                viewMode === "kanban"
                  ? "bg-slate-800 text-white font-semibold shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Kanban className="h-3.5 w-3.5" /> Kanban
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            className="h-9 border-slate-800 text-slate-300 hover:text-white bg-slate-900"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setImportOpen(true)}
            className="h-9 gap-1.5 border-slate-800 text-slate-200 hover:text-white bg-slate-900"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-400" /> Import CSV
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setEditLead(null);
              setFormOpen(true);
            }}
            className="h-9 gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
          >
            <Plus className="h-4 w-4" /> Add Lead
          </Button>
        </div>
      </div>

      {/* ── Bulk Actions Floating Bar ──────────────────────────────── */}
      {selectedIds.length > 0 && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-3 flex items-center justify-between text-xs">
          <span className="font-semibold text-emerald-400 ml-2">
            {selectedIds.length} lead(s) selected
          </span>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="destructive"
              onClick={handleBulkDelete}
              className="h-8 gap-1 bg-red-600 hover:bg-red-500 text-white text-xs"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete Selected
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedIds([])}
              className="h-8 text-slate-400 hover:text-white text-xs"
            >
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* ── Table View ────────────────────────────────────────────── */}
      {viewMode === "table" ? (
        <div className="border border-slate-800 rounded-2xl bg-slate-900/60 shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-3 w-10">
                    <input
                      type="checkbox"
                      checked={leads.length > 0 && selectedIds.length === leads.length}
                      onChange={(e) =>
                        setSelectedIds(e.target.checked ? leads.map((l) => l.id) : [])
                      }
                      className="rounded border-slate-700 bg-slate-900 text-emerald-500"
                    />
                  </th>
                  <th className="p-3">{activeTab === "candidates" ? "Candidate & Role" : "Contact Name"}</th>
                  <th className="p-3">Phone & Email</th>
                  <th className="p-3">{activeTab === "candidates" ? "Resume (PDF)" : "Source"}</th>
                  <th className="p-3">{activeTab === "candidates" ? "Scheduled Interview" : "Pipeline Status"}</th>
                  <th className="p-3">{activeTab === "candidates" ? "Candidate Stage" : "AI Score"}</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-500">
                      Loading inquiries & leads...
                    </td>
                  </tr>
                ) : leads.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-500">
                      No leads found. New WhatsApp inquiries will appear here automatically!
                    </td>
                  </tr>
                ) : (
                  leads.map((l) => (
                    <tr
                      key={l.id}
                      className="hover:bg-slate-800/40 cursor-pointer transition-colors"
                      onClick={() => setDrawerLeadId(l.id)}
                    >
                      <td className="p-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(l.id)}
                          onChange={(e) => {
                            setSelectedIds((prev) =>
                              e.target.checked
                                ? [...prev, l.id]
                                : prev.filter((id) => id !== l.id)
                            );
                          }}
                          className="rounded border-slate-700 bg-slate-900 text-emerald-500"
                        />
                      </td>
                      <td className="p-3">
                        <div className="font-semibold text-white flex items-center gap-1.5">
                          {l.name}
                          {(l.interview_link || (l as any).custom_fields?.last_voice_call) && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-bold rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                              <Video className="h-2.5 w-2.5" />
                              {(l as any).custom_fields?.last_voice_call?.scheduled_type === "interview" ? "Interview" : "Demo"}
                            </span>
                          )}
                        </div>
                        {activeTab === "candidates" ? (
                          <div className="text-[11px] text-purple-300 font-medium mt-0.5">
                            {l.job_title || "Frontend Developer"} {l.total_experience ? `• ${l.total_experience} yrs exp` : ""}
                          </div>
                        ) : l.company_name ? (
                          <div className="text-[11px] text-slate-400">{l.company_name}</div>
                        ) : null}
                        {(l as any).custom_fields?.last_voice_call && (
                          <div className="text-[10px] text-emerald-400 flex items-center gap-1 mt-0.5 font-mono">
                            <PhoneCall className="h-2.5 w-2.5" />
                            <span>Called ({(l as any).custom_fields.last_voice_call.provider === "vapi" ? "Vapi" : "SaaS"})</span>
                          </div>
                        )}
                      </td>
                      <td className="p-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex flex-col space-y-0.5">
                          {l.phone && (
                            <a
                              href={`tel:${l.phone}`}
                              className="flex items-center gap-1.5 text-cyan-400 hover:underline font-mono"
                            >
                              <Phone className="h-3 w-3" /> {l.phone}
                            </a>
                          )}
                          {l.email && <span className="text-slate-400 text-[11px]">{l.email}</span>}
                        </div>
                      </td>

                      {/* Column 4: Source or Resume PDF */}
                      <td className="p-3" onClick={(e) => e.stopPropagation()}>
                        {activeTab === "candidates" ? (
                          l.resume_url ? (
                            <a
                              href={l.resume_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-semibold transition-all"
                            >
                              <FileText className="h-3 w-3 text-rose-400" />
                              <span>Resume (PDF)</span>
                            </a>
                          ) : (
                            <span className="text-slate-500 text-[11px] italic">Pending</span>
                          )
                        ) : (
                          <Badge
                            variant="outline"
                            className="border-slate-700 text-slate-300 bg-slate-800/50 text-[10px]"
                          >
                            {l.source}
                          </Badge>
                        )}
                      </td>

                      {/* Column 5: Pipeline Status or Interview Schedule */}
                      <td className="p-3" onClick={(e) => e.stopPropagation()}>
                        {activeTab === "candidates" ? (
                          l.interview_link || l.preferred_interview_slot ? (
                            <div className="space-y-1">
                              <div className="text-[11px] font-semibold text-indigo-300 flex items-center gap-1.5">
                                <Calendar className="h-3 w-3 text-indigo-400 shrink-0" />
                                <span>{l.preferred_interview_slot || (l.interview_date ? new Date(l.interview_date).toLocaleString() : "Scheduled")}</span>
                              </div>
                              {l.interview_link && (
                                <a
                                  href={l.interview_link}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-[10px] text-cyan-400 hover:text-cyan-300 hover:underline font-mono"
                                >
                                  <Video className="h-2.5 w-2.5" />
                                  <span>Join Google Meet</span>
                                </a>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-500 text-[11px] italic">Not scheduled</span>
                          )
                        ) : (
                          <Select
                            value={l.lead_status}
                            onValueChange={(val) => handleStatusChange(l.id, val)}
                          >
                            <SelectTrigger className="h-7 w-28 bg-slate-950 border-slate-800 text-white text-[11px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-900 border-slate-800 text-white text-xs">
                              {STAGES.map((s) => (
                                <SelectItem key={s.key} value={s.key}>
                                  {s.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </td>

                      {/* Column 6: Score or Candidate Stage */}
                      <td className="p-3">
                        {activeTab === "candidates" ? (
                          <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/40 text-[10px] uppercase font-bold tracking-wider">
                            {l.candidate_stage || "interview_scheduled"}
                          </Badge>
                        ) : (
                          <div className="flex items-center gap-2">
                            <div className="w-12 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-emerald-500 h-full rounded-full"
                                style={{ width: `${l.score || 50}%` }}
                              />
                            </div>
                            <span className="text-xs font-semibold text-white">
                              {l.score || 50}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {l.phone && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const def = l.is_candidate
                                  ? voiceAgents.find((a) => a.template_key === "recruitment" || /recrui|maya|sarah/i.test(a.name)) || voiceAgents[0]
                                  : voiceAgents.find((a) => a.template_key === "sales" || /sales|alex/i.test(a.name)) || voiceAgents[0];
                                if (def) setCallSelectedAgentId(def.id);
                                setCallModalLead(l);
                              }}
                              className="p-1.5 hover:bg-violet-500/20 text-violet-400 rounded-lg transition-colors border border-violet-500/20"
                              title={`Trigger Voice AI Call to ${l.phone}`}
                            >
                              <PhoneCall className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {l.phone && (
                            <a
                              href={`https://wa.me/${l.phone.replace(/\D/g, "")}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 hover:bg-emerald-500/20 text-emerald-400 rounded-lg transition-colors border border-emerald-500/20"
                              title="Chat on WhatsApp"
                            >
                              <MessageSquare className="h-3.5 w-3.5" />
                            </a>
                          )}
                          {l.interview_link && (
                            <a
                              href={l.interview_link}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 hover:bg-cyan-500/20 text-cyan-400 rounded-lg transition-colors border border-cyan-500/20"
                              title="Join Scheduled Google Meet"
                            >
                              <Video className="h-3.5 w-3.5" />
                            </a>
                          )}
                          {l.email && (
                            <button
                              type="button"
                              onClick={() => setEmailModalLead(l)}
                              className="p-1.5 hover:bg-indigo-500/20 text-indigo-400 rounded-lg transition-colors border border-indigo-500/20"
                              title={`Send Email to ${l.email}`}
                            >
                              <Mail className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-slate-400 hover:text-white"
                            onClick={() => {
                              setEditLead(l);
                              setFormOpen(true);
                            }}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ── Kanban Board View ───────────────────────────────────────── */
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3 overflow-x-auto pb-4">
          {STAGES.map((stage) => {
            const stageLeads = leads.filter((l) => l.lead_status === stage.key);
            return (
              <div
                key={stage.key}
                className={`rounded-2xl border ${stage.border} ${stage.bg} p-3 flex flex-col min-w-[220px] shadow-sm`}
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-3">
                  <span className={`text-xs font-bold uppercase tracking-wider ${stage.color}`}>
                    {stage.label}
                  </span>
                  <Badge className="bg-slate-800/80 text-white text-[10px] px-1.5 py-0 border-0">
                    {stageLeads.length}
                  </Badge>
                </div>
                <div className="space-y-2 flex-1">
                  {stageLeads.map((l) => (
                    <div
                      key={l.id}
                      onClick={() => setDrawerLeadId(l.id)}
                      className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-sm hover:border-slate-700 transition-all cursor-pointer space-y-1.5"
                    >
                      <div className="font-semibold text-xs text-white">{l.name}</div>
                      {l.company_name && (
                        <div className="text-[11px] text-slate-400">{l.company_name}</div>
                      )}
                      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800/60 mt-1">
                        <span className="text-cyan-400 font-mono text-[10px]">
                          {l.phone || l.email}
                        </span>
                        {l.deal_value > 0 && (
                          <span className="font-semibold text-emerald-400">₹{l.deal_value}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Dialogs ───────────────────────────────────────────────── */}
      <LeadFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        lead={editLead}
        isCandidate={isCandidate}
        onSuccess={fetchData}
      />

      <LeadDetailDrawer
        leadId={drawerLeadId}
        open={!!drawerLeadId}
        onClose={() => setDrawerLeadId(null)}
        onUpdate={fetchData}
      />

      <LeadImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        isCandidate={isCandidate}
        onSuccess={fetchData}
      />

      {emailModalLead && (
        <SendLeadEmailModal
          open={!!emailModalLead}
          onOpenChange={(isOpen) => !isOpen && setEmailModalLead(null)}
          lead={emailModalLead}
          onEmailSent={fetchData}
        />
      )}

      {/* ── AI VOICE CALL DISPATCH MODAL ───────────────────────── */}
      {callModalLead && (
        <Dialog open={!!callModalLead} onOpenChange={(open) => !open && setCallModalLead(null)}>
          <DialogContent className="sm:max-w-md bg-white border border-blue-100 shadow-2xl p-6 text-slate-800">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <PhoneCall className="h-5 w-5 text-blue-600" />
                Dispatch AI Voice Call
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Dial lead directly using connected Vapi AI Voice Telephony engine.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 space-y-1">
                <div className="text-xs font-semibold text-slate-800">{callModalLead.name}</div>
                <div className="text-xs text-slate-500 font-mono flex items-center gap-1.5">
                  <Phone className="h-3 w-3 text-blue-500" />
                  {callModalLead.phone}
                </div>
                {callModalLead.company_name && (
                  <div className="text-[11px] text-slate-500">{callModalLead.company_name}</div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                  <span>Select Voice AI Agent:</span>
                  <span className="text-[10px] text-blue-600 font-normal">Vapi Provider</span>
                </label>
                <Select value={callSelectedAgentId} onValueChange={setCallSelectedAgentId}>
                  <SelectTrigger className="w-full bg-white border-slate-200 text-xs h-9">
                    <SelectValue placeholder="Choose an AI Voice Agent..." />
                  </SelectTrigger>
                  <SelectContent>
                    {voiceAgents.map((ag) => (
                      <SelectItem key={ag.id} value={ag.id} className="text-xs">
                        {ag.name} ({ag.provider.toUpperCase()})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="flex items-center justify-between sm:justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setCallModalLead(null)}
                className="text-xs text-slate-600"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={dispatchingCall}
                onClick={async () => {
                  try {
                    setDispatchingCall(true);
                    const targetAgent = voiceAgents.find((a) => a.id === callSelectedAgentId);
                    toast.info(`Dialing ${callModalLead.name} via ${targetAgent?.name || "Voice Agent"}...`);
                    await LeadService.triggerVoiceCall(callModalLead.id, {
                      scheduledType: callModalLead.is_candidate ? "interview" : "demo",
                      agentId: callSelectedAgentId || undefined,
                      agentKey: targetAgent?.template_key,
                    });
                    toast.success(`📞 Outbound call dispatched to ${callModalLead.phone}!`);
                    setCallModalLead(null);
                    fetchData();
                  } catch (err: any) {
                    toast.error(err.response?.data?.message || err.message || "Failed to trigger call");
                  } finally {
                    setDispatchingCall(false);
                  }
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs h-9 px-4 gap-1.5 shadow-sm"
              >
                <PhoneCall className="h-3.5 w-3.5" />
                {dispatchingCall ? "Dispatching..." : "Dispatch Call Now"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
