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
  TrendingUp,
  MoreHorizontal,
  Pencil,
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
import { LeadDetailPage } from "./components/LeadDetailPage";
import { LeadImportDialog } from "./components/LeadImportDialog";
import { SendLeadEmailModal } from "./components/SendLeadEmailModal";
import { toast } from "sonner";

const STAGES = [
  { key: "NEW", label: "New", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50/60 dark:bg-blue-500/10", border: "border-blue-200/80 dark:border-blue-500/20" },
  { key: "CONTACTED", label: "Contacted", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50/60 dark:bg-amber-500/10", border: "border-amber-200/80 dark:border-amber-500/20" },
  { key: "QUALIFIED", label: "Qualified", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50/60 dark:bg-emerald-500/10", border: "border-emerald-200/80 dark:border-emerald-500/20" },
  { key: "PROPOSAL", label: "Proposal", color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50/60 dark:bg-purple-500/10", border: "border-purple-200/80 dark:border-purple-500/20" },
  { key: "WON", label: "Won", color: "text-green-600 dark:text-green-400", bg: "bg-green-50/60 dark:bg-green-500/10", border: "border-green-200/80 dark:border-green-500/20" },
  { key: "LOST", label: "Lost", color: "text-red-600 dark:text-red-400", bg: "bg-red-50/60 dark:bg-red-500/10", border: "border-red-200/80 dark:border-red-500/20" },
];

export default function Leads({ isCandidate = false }: { isCandidate?: boolean }) {
  const [activeTab, setActiveTab] = useState<"leads" | "candidates">(isCandidate ? "candidates" : "leads");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState<LeadStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"table" | "kanban">("table");
  const [candidateRole, setCandidateRole] = useState<string>("ALL");

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

  const filteredLeads = leads.filter((l) => {
    if (activeTab === "candidates" && candidateRole !== "ALL") {
      return (l.job_title || "").toLowerCase().includes(candidateRole.toLowerCase());
    }
    return true;
  });

  if (drawerLeadId) {
    return (
      <LeadDetailPage
        leadId={drawerLeadId}
        onBack={() => setDrawerLeadId(null)}
        onUpdate={fetchData}
        onEdit={(lead) => {
          setEditLead(lead);
          setFormOpen(true);
        }}
        onOpenVoiceCall={(l) => setCallModalLead(l)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Page Header: Leads & Contacts / Candidates & Interviews ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {activeTab === "candidates" ? "Candidates & Interviews" : "Leads & Contacts"}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {activeTab === "candidates"
              ? "Manage candidates, track interview schedules, and hiring pipeline."
              : "Manage inquiries, track pipeline, and convert leads."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === "leads" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setImportOpen(true)}
              className="h-8 text-xs font-semibold border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 gap-1.5 rounded-xl shadow-2xs"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400" />
              <span>Import CSV</span>
            </Button>
          )}
          <Button
            size="sm"
            onClick={() => {
              setEditLead(null);
              setFormOpen(true);
            }}
            className="h-8 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white gap-1.5 rounded-xl shadow-xs shadow-blue-600/20"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{activeTab === "candidates" ? "Add Candidate" : "Add Lead"}</span>
          </Button>
        </div>
      </div>

      {/* ── Sub-Navigation Ribbon ── */}
      <div className="flex items-center gap-2">
        {activeTab === "leads" ? (
          <>
            <button
              type="button"
              className="px-4 py-1.5 rounded-full text-xs font-bold bg-blue-600 text-white shadow-xs cursor-pointer"
            >
              All CRM Leads
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("candidates");
                setFilter((prev) => ({ ...prev, is_candidate: true, skip: 0 }));
              }}
              className="px-4 py-1.5 rounded-full text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Candidates & Scheduled Interviews {scheduledInterviews.length > 0 && `(${scheduledInterviews.length})`}
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => {
                setActiveTab("leads");
                setFilter((prev) => ({ ...prev, is_candidate: false, skip: 0 }));
              }}
              className="px-4 py-1.5 rounded-full text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              All CRM Leads
            </button>
            <button
              type="button"
              className="px-4 py-1.5 rounded-full text-xs font-bold bg-blue-600 text-white shadow-xs cursor-pointer"
            >
              Candidates
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("candidates");
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Calendar className="h-3.5 w-3.5 text-slate-500" />
              <span>Interview Schedule</span>
              {scheduledInterviews.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300 text-[10px] font-bold">
                  {scheduledInterviews.length}
                </span>
              )}
            </button>
          </>
        )}
      </div>

      {/* ── Scheduled Interviews Reminder Banner ── */}
      {activeTab === "candidates" && scheduledInterviews.length > 0 && (
        <div className="rounded-2xl border border-indigo-200 dark:border-indigo-500/40 bg-gradient-to-r from-indigo-50 via-purple-50 to-blue-50 dark:from-indigo-950/70 dark:via-purple-950/50 dark:to-slate-900/80 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
              </span>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Calendar className="h-4 w-4 text-indigo-400" />
                Upcoming Scheduled Interviews & Reminders ({scheduledInterviews.length})
              </h3>
            </div>
            <span className="text-[11px] text-indigo-700 dark:text-indigo-300 font-medium">
              Google Meet links synced • Telephony voice reminders automated
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {scheduledInterviews.map((cand) => (
              <div
                key={cand.id}
                className="p-3.5 rounded-xl border border-indigo-200 dark:border-indigo-500/30 bg-white dark:bg-slate-900/80 hover:border-indigo-400/60 transition-all flex flex-col justify-between space-y-2.5 shadow-2xs"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white text-xs">{cand.name}</span>
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
        {(activeTab === "candidates"
          ? [
              { label: "Total Candidates", value: stats?.totalLeads ?? 0, icon: Users, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/60" },
              { label: "Interviews Today", value: stats?.newToday ?? 0, icon: Calendar, color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-50 dark:bg-indigo-950/60" },
              { label: "Scheduled", value: scheduledInterviews.length, icon: Clock, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/60" },
              { label: "In Process", value: stats?.inProgressLeads ?? 0, icon: CheckCircle2, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/60" },
              { label: "Hired", value: stats?.wonLeads ?? 0, icon: Award, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/60" },
              { label: "Offer Pending", value: stats?.qualifiedLeads ?? 0, icon: FileText, color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-950/60" },
            ]
          : [
              { label: "Total Inquiries", value: stats?.totalLeads ?? 0, icon: Users, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/60", trend: "+12%" },
              { label: "New Today", value: stats?.newToday ?? 0, icon: Sparkles, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/60" },
              { label: "In Progress", value: stats?.inProgressLeads ?? 0, icon: Clock, color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-50 dark:bg-indigo-950/60" },
              { label: "Qualified", value: stats?.qualifiedLeads ?? 0, icon: CheckCircle2, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/60" },
              { label: "Converted / Won", value: stats?.wonLeads ?? 0, icon: Award, color: "text-teal-600 dark:text-teal-400", bg: "bg-teal-50 dark:bg-teal-950/60" },
              { label: "Pipeline Value", value: `₹${(stats?.pipelineValue || 0).toLocaleString()}`, icon: IndianRupee, color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-950/60" },
            ]
        ).map((kpi, idx) => (
          <div
            key={idx}
            className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl p-4.5 shadow-sm hover:shadow-md shadow-[0_1px_3px_0_rgba(15,23,42,0.06),0_1px_2px_-1px_rgba(15,23,42,0.04)] hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{kpi.label}</span>
              <div className={`p-1.5 rounded-lg ${(kpi as any).bg || 'bg-slate-100 dark:bg-slate-800'} ${kpi.color}`}>
                <kpi.icon className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{kpi.value}</span>
              {(kpi as any).trend && (
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 px-1.5 py-0.2 rounded-full">
                  {(kpi as any).trend}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── Action Bar & Filters ──────────────────────────────────── */}
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 p-3.5 rounded-xl shadow-xs shadow-[0_1px_3px_0_rgba(15,23,42,0.06),0_1px_2px_-1px_rgba(15,23,42,0.04)]">
        <div className="flex items-center gap-2 w-full md:w-auto flex-wrap sm:flex-nowrap">
          <div className="relative w-full sm:w-64 md:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 dark:text-slate-500" />
            <Input
              placeholder={activeTab === "candidates" ? "Search candidate, role, skills..." : "Search name, phone, email..."}
              value={filter.keyword}
              onChange={(e) => setFilter({ ...filter, keyword: e.target.value, skip: 0 })}
              className="pl-9 h-9 bg-slate-50/70 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs rounded-lg"
            />
          </div>

          {activeTab === "candidates" ? (
            <>
              <Select
                value={filter.status}
                onValueChange={(val) => setFilter({ ...filter, status: val, skip: 0 })}
              >
                <SelectTrigger className="w-32 h-9 bg-slate-50/70 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs rounded-lg">
                  <SelectValue placeholder="All Stages" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs">
                  <SelectItem value="ALL">All Stages</SelectItem>
                  {STAGES.map((s) => (
                    <SelectItem key={s.key} value={s.key}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={candidateRole}
                onValueChange={setCandidateRole}
              >
                <SelectTrigger className="w-32 h-9 bg-slate-50/70 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs rounded-lg">
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs">
                  <SelectItem value="ALL">All Roles</SelectItem>
                  <SelectItem value="Python Developer">Python Developer</SelectItem>
                  <SelectItem value="Data Analyst">Data Analyst</SelectItem>
                  <SelectItem value="ML Intern">ML Intern</SelectItem>
                  <SelectItem value="Frontend Developer">Frontend Developer</SelectItem>
                  <SelectItem value="Fullstack Engineer">Fullstack Engineer</SelectItem>
                </SelectContent>
              </Select>
            </>
          ) : (
            <>
              <Select
                value={filter.status}
                onValueChange={(val) => setFilter({ ...filter, status: val, skip: 0 })}
              >
                <SelectTrigger className="w-32 h-9 bg-slate-50/70 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs rounded-lg">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs">
                  <SelectItem value="ALL">All Status</SelectItem>
                  {STAGES.map((s) => (
                    <SelectItem key={s.key} value={s.key}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={filter.source}
                onValueChange={(val) => setFilter({ ...filter, source: val, skip: 0 })}
              >
                <SelectTrigger className="w-32 h-9 bg-slate-50/70 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs rounded-lg">
                  <SelectValue placeholder="All Sources" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs">
                  <SelectItem value="ALL">All Sources</SelectItem>
                  <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                  <SelectItem value="EMAIL">Email</SelectItem>
                  <SelectItem value="PHONE">Phone</SelectItem>
                  <SelectItem value="WEBSITE">Website</SelectItem>
                  <SelectItem value="MANUAL">Manual</SelectItem>
                </SelectContent>
              </Select>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-950 p-1 rounded-lg border border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === "table"
                  ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold shadow-xs"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <List className="h-3.5 w-3.5" /> Table
            </button>
            <button
              onClick={() => setViewMode("kanban")}
              className={`p-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === "kanban"
                  ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold shadow-xs"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Kanban className="h-3.5 w-3.5" /> Kanban
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            className="h-9 w-9 p-0 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-900 rounded-lg"
            title="Refresh"
          >
            <RefreshCw className="h-3.5 w-3.5" />
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
              className="h-8 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white text-xs"
            >
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* ── Table View ────────────────────────────────────────────── */}
      {viewMode === "table" ? (
        <div className="border border-slate-300 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 dark:bg-slate-950/80 border-b border-slate-300 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="p-3 w-10">
                    <input
                      type="checkbox"
                      checked={filteredLeads.length > 0 && selectedIds.length === filteredLeads.length}
                      onChange={(e) =>
                        setSelectedIds(e.target.checked ? filteredLeads.map((l) => l.id) : [])
                      }
                      className="h-4 w-4 rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </th>
                  <th className="p-3">{activeTab === "candidates" ? "Candidate" : "Contact Name"}</th>
                  <th className="p-3">Phone & Email</th>
                  <th className="p-3">{activeTab === "candidates" ? "Resume" : "Source"}</th>
                  <th className="p-3">{activeTab === "candidates" ? "Interview" : "Pipeline Status"}</th>
                  <th className="p-3">{activeTab === "candidates" ? "Stage" : "AI Score"}</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-16 px-4">
                      Loading inquiries & leads...
                    </td>
                  </tr>
                ) : filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-16 px-4">
                      <div className="max-w-sm mx-auto space-y-3 p-6 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                        <div className="h-12 w-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/60 flex items-center justify-center mx-auto text-blue-600 dark:text-blue-400 shadow-2xs">
                          {activeTab === "candidates" ? <GraduationCap className="h-6 w-6" /> : <Users className="h-6 w-6" />}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                            {activeTab === "candidates" ? "No candidates found" : "No leads in pipeline"}
                          </h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            {activeTab === "candidates"
                              ? "Candidates from recruitment pipelines, WhatsApp interviews, or CSV imports will appear here."
                              : "New inquiries from WhatsApp chats, inbound emails, and phone calls will appear here automatically."}
                          </p>
                        </div>
                        <div className="flex items-center justify-center gap-2 pt-1">
                          <Button
                            size="sm"
                            onClick={() => {
                              setEditLead(null);
                              setFormOpen(true);
                            }}
                            className="h-8 gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            <span>{activeTab === "candidates" ? "Add Candidate" : "Add Lead"}</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setImportOpen(true)}
                            className="h-8 gap-1.5 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs rounded-lg"
                          >
                            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span>Import CSV</span>
                          </Button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map((l) => (
                    <tr
                      key={l.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
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
                          className="h-4 w-4 rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>
                      <td className="p-3">
                        {activeTab === "candidates" ? (
                          <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                              {l.name ? l.name.slice(0, 2).toUpperCase() : 'CD'}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-slate-900 dark:text-white truncate">
                                {l.name}
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                {l.job_title || "Python Developer"}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                              {l.name}
                              {(l.interview_link || (l as any).custom_fields?.last_voice_call) && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-bold rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                  <Video className="h-2.5 w-2.5" />
                                  {(l as any).custom_fields?.last_voice_call?.scheduled_type === "interview" ? "Interview" : "Demo"}
                                </span>
                              )}
                            </div>
                            {l.company_name && (
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{l.company_name}</div>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="p-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex flex-col space-y-0.5">
                          {l.phone && (
                            <a
                              href={`tel:${l.phone}`}
                              className="flex items-center gap-1.5 text-blue-600 dark:text-cyan-400 hover:underline font-mono"
                            >
                              <Phone className="h-3 w-3" /> {l.phone}
                            </a>
                          )}
                          {l.email && <span className="text-slate-500 dark:text-slate-400 text-[11px]">{l.email}</span>}
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
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30 text-[10px] font-semibold transition-all"
                            >
                              <FileText className="h-3 w-3 text-rose-600 dark:text-rose-400" />
                              <span>Resume (PDF)</span>
                            </a>
                          ) : (
                            <span className="text-slate-500 text-[11px] italic">Pending</span>
                          )
                        ) : (
                          <Badge
                            variant="outline"
                            className="border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 text-[10px]"
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
                              <div className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                                <Calendar className="h-3 w-3 text-indigo-600 dark:text-indigo-400 shrink-0" />
                                <span>{l.preferred_interview_slot || (l.interview_date ? new Date(l.interview_date).toLocaleString() : "Scheduled")}</span>
                              </div>
                              {l.interview_link && (
                                <a
                                  href={l.interview_link}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-[10px] text-blue-600 dark:text-cyan-400 hover:underline font-mono"
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
                            <SelectTrigger className="h-7 w-28 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white text-[11px] rounded-lg">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs">
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
                          <Badge className="bg-purple-50 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-500/40 text-[10px] uppercase font-bold tracking-wider">
                            {l.candidate_stage || "interview_scheduled"}
                          </Badge>
                        ) : (
                          <div className="flex items-center gap-2">
                            <div className="w-12 bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-emerald-500 h-full rounded-full"
                                style={{ width: `${l.score || 50}%` }}
                              />
                            </div>
                            <span className="text-xs font-semibold text-slate-900 dark:text-white">
                              {l.score || 50}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {activeTab === "candidates" ? (
                            <>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditLead(l);
                                  setFormOpen(true);
                                }}
                                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                title="Edit Candidate"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>

                              {l.phone && (
                                <a
                                  href={`tel:${l.phone}`}
                                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                  title="Call Candidate"
                                >
                                  <Phone className="h-3.5 w-3.5" />
                                </a>
                              )}

                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                                onClick={(e) => { e.stopPropagation(); setDrawerLeadId(l.id); }}
                                title="View Details"
                              >
                                <MoreHorizontal className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          ) : (
                            <>
                              {l.email && (
                                <button
                                  type="button"
                                  onClick={() => setEmailModalLead(l)}
                                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                  title={`Send Email to ${l.email}`}
                                >
                                  <Mail className="h-3.5 w-3.5" />
                                </button>
                              )}

                              {l.phone && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const def = voiceAgents.find((a) => a.template_key === "sales" || /sales|alex/i.test(a.name)) || voiceAgents[0];
                                    if (def) setCallSelectedAgentId(def.id);
                                    setCallModalLead(l);
                                  }}
                                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
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
                                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
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
                                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                  title="Join Scheduled Google Meet"
                                >
                                  <Video className="h-3.5 w-3.5" />
                                </a>
                              )}

                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                                onClick={(e) => { e.stopPropagation(); setDrawerLeadId(l.id); }}
                                title="View Details"
                              >
                                <MoreHorizontal className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
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
        /* ── Modern Interactive Kanban Board View ───────────────────────── */
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span>💡 Drag & drop cards between stages to update status, or use the quick action buttons on each card.</span>
            <span className="font-semibold text-slate-700">{filteredLeads.length} Total Records</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-6 gap-3 overflow-x-auto pb-4">
            {STAGES.map((stage) => {
              const stageLeads = filteredLeads.filter((l) => (l.lead_status || 'NEW').toUpperCase() === stage.key);
              const stageValue = stageLeads.reduce((acc, curr) => acc + (Number(curr.deal_value) || 0), 0);

              return (
                <div
                  key={stage.key}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const draggedId = e.dataTransfer.getData('text/plain');
                    if (draggedId) {
                      const item = leads.find((l) => l.id === draggedId);
                      if (item && item.lead_status !== stage.key) {
                        handleStatusChange(draggedId, stage.key);
                      }
                    }
                  }}
                  className={`rounded-2xl border ${stage.border} ${stage.bg} p-3 flex flex-col min-w-[240px] shadow-xs transition-colors hover:border-blue-400/50`}
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-200 dark:border-slate-800 mb-3">
                    <div>
                      <span className={`text-xs font-black uppercase tracking-wider ${stage.color} block`}>
                        {stage.label}
                      </span>
                      {stageValue > 0 && (
                        <span className="text-[10px] font-mono font-bold text-emerald-600 block mt-0.5">
                          ₹{stageValue.toLocaleString('en-IN')}
                        </span>
                      )}
                    </div>
                    <Badge className="bg-white text-slate-800 dark:bg-slate-800 dark:text-white text-[10px] font-bold px-2 py-0.5 border border-slate-200 dark:border-slate-700">
                      {stageLeads.length}
                    </Badge>
                  </div>

                  {/* Cards Container */}
                  <div className="space-y-2.5 flex-1 min-h-[120px]">
                    {stageLeads.map((l) => (
                      <div
                        key={l.id}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/plain', l.id);
                          e.dataTransfer.effectAllowed = 'move';
                        }}
                        onClick={() => setDrawerLeadId(l.id)}
                        className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl p-3 shadow-xs hover:shadow-md hover:border-blue-400 transition-all cursor-pointer space-y-2 group"
                      >
                        {/* Header: Name & Avatar */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="h-7 w-7 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-[11px] shrink-0 shadow-xs">
                              {l.name ? l.name[0].toUpperCase() : 'L'}
                            </div>
                            <div className="min-w-0">
                              <span className="font-bold text-xs text-slate-900 dark:text-white block truncate group-hover:text-blue-600 transition-colors">
                                {l.name}
                              </span>
                              <span className="text-[10px] text-slate-500 truncate block">
                                {l.company_name || (l.is_candidate ? l.job_title : 'Direct Contact')}
                              </span>
                            </div>
                          </div>
                          {l.is_candidate ? (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 shrink-0">
                              Candidate
                            </span>
                          ) : (
                            l.deal_value > 0 && (
                              <span className="text-[10px] font-mono font-bold text-emerald-600 shrink-0">
                                ₹{Number(l.deal_value).toLocaleString('en-IN')}
                              </span>
                            )
                          )}
                        </div>

                        {/* Middle info */}
                        <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-100 dark:border-slate-800">
                          <span className="text-slate-600 dark:text-slate-400 font-mono text-[10px] truncate max-w-[140px]">
                            {l.phone || l.email}
                          </span>
                          <span className="text-[10px] text-slate-400 uppercase font-semibold">
                            {l.source || 'Voice'}
                          </span>
                        </div>

                        {/* Quick action buttons on card */}
                        <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1">
                            {l.phone && (
                              <button
                                type="button"
                                title="Call via Voice AI"
                                onClick={() => setCallModalLead(l)}
                                className="p-1 rounded-md text-cyan-600 hover:bg-cyan-50 dark:hover:bg-cyan-950/40 transition-colors"
                              >
                                <PhoneCall className="h-3 w-3" />
                              </button>
                            )}
                            {l.phone && (
                              <a
                                href={`https://wa.me/${l.phone.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noreferrer"
                                title="Chat on WhatsApp"
                                className="p-1 rounded-md text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                              >
                                <MessageSquare className="h-3 w-3" />
                              </a>
                            )}
                            <button
                              type="button"
                              title="Send Email"
                              onClick={() => setEmailModalLead(l)}
                              className="p-1 rounded-md text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
                            >
                              <Mail className="h-3 w-3" />
                            </button>
                          </div>

                          {/* Quick stage advance pill */}
                          <select
                            value={l.lead_status || 'NEW'}
                            onChange={(e) => handleStatusChange(l.id, e.target.value)}
                            className="text-[9px] font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-1.5 py-0.5 text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700"
                          >
                            {STAGES.map((s) => (
                              <option key={s.key} value={s.key}>
                                → {s.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))}
                    {stageLeads.length === 0 && (
                      <div className="h-24 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-center text-[11px] text-slate-400">
                        Drop leads here
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
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
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <PhoneCall className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                Dispatch AI Voice Call
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Dial lead directly using connected Vapi AI Voice Telephony engine.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="p-3 bg-blue-50/70 dark:bg-blue-950/40 rounded-xl border border-blue-200/80 dark:border-blue-800/60 space-y-1">
                <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">{callModalLead.name}</div>
                <div className="text-xs text-slate-500 font-mono flex items-center gap-1.5">
                  <Phone className="h-3 w-3 text-blue-500" />
                  {callModalLead.phone}
                </div>
                {callModalLead.company_name && (
                  <div className="text-[11px] text-slate-500">{callModalLead.company_name}</div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Select Voice AI Agent:</span>
                  <span className="text-[10px] text-blue-600 font-normal">Vapi Provider</span>
                </label>
                <Select value={callSelectedAgentId} onValueChange={setCallSelectedAgentId}>
                  <SelectTrigger className="w-full bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs h-9 rounded-xl">
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
            </div>

            <DialogFooter className="flex items-center justify-between sm:justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setCallModalLead(null)}
                className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
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
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs h-9 px-4 gap-1.5 shadow-xs shadow-blue-600/20 rounded-xl"
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
