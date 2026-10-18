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
  ChevronRight,
  IndianRupee,
  CheckCircle2,
  Clock,
  Sparkles,
  Award,
  RefreshCw,
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
import { Lead, LeadFilter, LeadStats } from "@/types/lead";
import { LeadService } from "@/service/leadService";
import { LeadFormDialog } from "./components/LeadFormDialog";
import { LeadDetailDrawer } from "./components/LeadDetailDrawer";
import { LeadImportDialog } from "./components/LeadImportDialog";
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

  const fetchData = async () => {
    try {
      setLoading(true);
      const [leadsRes, statsRes] = await Promise.all([
        LeadService.getLeads(filter),
        LeadService.getStats(isCandidate),
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
  }, [filter.keyword, filter.status, filter.source, filter.skip, isCandidate]);

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

  return (
    <div className="space-y-6">
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
                  <th className="p-3">Contact Name</th>
                  <th className="p-3">Phone & Email</th>
                  <th className="p-3">Source</th>
                  <th className="p-3">Pipeline Status</th>
                  <th className="p-3">AI Score</th>
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
                        <div className="font-semibold text-white">{l.name}</div>
                        {l.company_name && (
                          <div className="text-[11px] text-slate-400">{l.company_name}</div>
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
                      <td className="p-3">
                        <Badge
                          variant="outline"
                          className="border-slate-700 text-slate-300 bg-slate-800/50 text-[10px]"
                        >
                          {l.source}
                        </Badge>
                      </td>
                      <td className="p-3" onClick={(e) => e.stopPropagation()}>
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
                      </td>
                      <td className="p-3">
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
                      </td>
                      <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
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
    </div>
  );
}
