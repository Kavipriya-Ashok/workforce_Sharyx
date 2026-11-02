import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Briefcase,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  MapPin,
  Clock,
  Sparkles,
  Building,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

export interface JobOpening {
  id: string;
  tenant_id: string;
  title: string;
  skills: string[];
  min_experience: number;
  locations: string[];
  work_mode: string;
  relocation_supported: boolean;
  status: "open" | "closed" | string;
  created_at?: string;
  updated_at?: string;
}

interface ManageOpeningsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRolesChanged?: () => void;
}

export const ManageOpeningsDialog: React.FC<ManageOpeningsDialogProps> = ({
  open,
  onOpenChange,
  onRolesChanged,
}) => {
  const [openings, setOpenings] = useState<JobOpening[]>([]);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [skillsInput, setSkillsInput] = useState("");
  const [minExp, setMinExp] = useState<number>(1);
  const [locationsInput, setLocationsInput] = useState("");
  const [workMode, setWorkMode] = useState<"Hybrid" | "Onsite" | "Remote">("Hybrid");
  const [relocationSupported, setRelocationSupported] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchOpenings = async () => {
    try {
      setLoading(true);
      const res = await axios.get("/api/openings");
      if (Array.isArray(res.data)) {
        setOpenings(res.data);
      } else if (res.data?.data) {
        setOpenings(res.data.data);
      }
    } catch (err: any) {
      toast.error("Failed to load job openings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchOpenings();
      resetForm();
    }
  }, [open]);

  const resetForm = () => {
    setTitle("");
    setSkillsInput("");
    setMinExp(1);
    setLocationsInput("");
    setWorkMode("Hybrid");
    setRelocationSupported(true);
    setIsEditing(false);
    setEditingId(null);
  };

  const handleStartCreate = () => {
    resetForm();
    setIsEditing(true);
  };

  const handleStartEdit = (op: JobOpening) => {
    setEditingId(op.id);
    setTitle(op.title);
    setSkillsInput(Array.isArray(op.skills) ? op.skills.join(", ") : "");
    setMinExp(Number(op.min_experience) || 0);
    setLocationsInput(Array.isArray(op.locations) ? op.locations.join(", ") : "");
    setWorkMode((op.work_mode as any) || "Hybrid");
    setRelocationSupported(Boolean(op.relocation_supported));
    setIsEditing(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Job title is required");
      return;
    }

    const skills = skillsInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const locations = locationsInput
      .split(",")
      .map((l) => l.trim())
      .filter(Boolean);

    if (locations.length === 0) {
      toast.error("Please provide at least one location (e.g. Chennai, Bengaluru)");
      return;
    }

    try {
      setSaving(true);
      const payload = {
        title: title.trim(),
        skills,
        min_experience: Number(minExp) || 0,
        locations,
        work_mode: workMode,
        relocation_supported: relocationSupported,
        status: "open",
      };

      if (editingId) {
        await axios.put(`/api/openings/${editingId}`, payload);
        toast.success("Job opening updated successfully!");
      } else {
        await axios.post("/api/openings", payload);
        toast.success("New job opening created!");
      }

      resetForm();
      fetchOpenings();
      if (onRolesChanged) onRolesChanged();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to save job opening");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (op: JobOpening) => {
    const nextStatus = op.status === "open" ? "closed" : "open";
    try {
      await axios.patch(`/api/openings/${op.id}/status`, { status: nextStatus });
      toast.success(`Role "${op.title}" marked as ${nextStatus}`);
      fetchOpenings();
      if (onRolesChanged) onRolesChanged();
    } catch (err: any) {
      toast.error("Failed to update role status");
    }
  };

  const handleDelete = async (id: string, roleTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${roleTitle}"?`)) return;
    try {
      await axios.delete(`/api/openings/${id}`);
      toast.success("Job opening deleted");
      fetchOpenings();
      if (onRolesChanged) onRolesChanged();
    } catch (err: any) {
      toast.error("Failed to delete role");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600">
                <Briefcase className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
                  Manage Active Job Openings
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Configure live roles, required skills, locations, and experience. WhatsApp & Voice AI dynamically read these in real time!
                </DialogDescription>
              </div>
            </div>
            {!isEditing && (
              <Button
                size="sm"
                onClick={handleStartCreate}
                className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 shadow-sm"
              >
                <Plus className="h-4 w-4" /> Add Opening
              </Button>
            )}
          </div>
        </DialogHeader>

        {isEditing && (
          <form onSubmit={handleSave} className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-indigo-100 dark:border-indigo-900/50 space-y-4 my-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-indigo-500" />
                {editingId ? "Edit Job Opening" : "Create New Job Opening"}
              </h4>
              <button
                type="button"
                onClick={resetForm}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Job Title <span className="text-red-500 font-bold ml-0.5">*</span>
                </label>
                <Input
                  required
                  placeholder="e.g. Frontend Developer"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-9 text-xs bg-white dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Min. Experience (Years)
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.5"
                  value={minExp}
                  onChange={(e) => setMinExp(parseFloat(e.target.value) || 0)}
                  className="h-9 text-xs bg-white dark:bg-slate-800"
                />
              </div>

              <div className="md:col-span-2">
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Key Skills (comma separated)
                </label>
                <Input
                  placeholder="e.g. React, TypeScript, Next.js, TailwindCSS"
                  value={skillsInput}
                  onChange={(e) => setSkillsInput(e.target.value)}
                  className="h-9 text-xs bg-white dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Locations (comma separated) <span className="text-red-500 font-bold ml-0.5">*</span>
                </label>
                <Input
                  required
                  placeholder="e.g. Bengaluru, Chennai"
                  value={locationsInput}
                  onChange={(e) => setLocationsInput(e.target.value)}
                  className="h-9 text-xs bg-white dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Work Mode
                </label>
                <select
                  value={workMode}
                  onChange={(e: any) => setWorkMode(e.target.value)}
                  className="w-full h-9 px-3 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100"
                >
                  <option value="Hybrid">Hybrid</option>
                  <option value="Onsite">Onsite</option>
                  <option value="Remote">Remote</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-2 md:col-span-2">
                <input
                  type="checkbox"
                  id="reloc_check"
                  checked={relocationSupported}
                  onChange={(e) => setRelocationSupported(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
                <label htmlFor="reloc_check" className="text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                  Relocation assistance / allowance supported for this role
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={resetForm}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={saving}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {saving ? "Saving..." : editingId ? "Update Role" : "Create Role"}
              </Button>
            </div>
          </form>
        )}

        <div className="space-y-3 py-2">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-xs text-slate-400">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Loading open positions...
            </div>
          ) : openings.length === 0 ? (
            <div className="text-center py-8 border border-dashed rounded-xl border-slate-200 dark:border-slate-800">
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">No job openings created yet</p>
              <p className="text-xs text-slate-400 mt-1">Click "Add Opening" to create your first role.</p>
            </div>
          ) : (
            openings.map((op) => (
              <div
                key={op.id}
                className={`p-4 rounded-xl border transition-all ${
                  op.status === "open"
                    ? "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs"
                    : "bg-slate-50 dark:bg-slate-950/40 border-slate-200/60 dark:border-slate-800/60 opacity-60"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                        {op.title}
                      </h3>
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-bold uppercase tracking-wider ${
                          op.status === "open"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800"
                            : "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400"
                        }`}
                      >
                        {op.status === "open" ? "Active / Open" : "Closed"}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800">
                        {op.work_mode}
                      </Badge>
                      {op.relocation_supported && (
                        <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                          ✓ Relocation Supported
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        Min Exp: <strong className="text-slate-700 dark:text-slate-300">{op.min_experience}+ years</strong>
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-slate-400" />
                        Locations: <strong className="text-slate-700 dark:text-slate-300">{Array.isArray(op.locations) ? op.locations.join(", ") : ""}</strong>
                      </span>
                    </div>

                    {Array.isArray(op.skills) && op.skills.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap pt-1">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Skills:</span>
                        {op.skills.map((s, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px] font-medium text-slate-700 dark:text-slate-300"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 self-end sm:self-start shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleStatus(op)}
                      className={`h-8 text-xs font-semibold ${
                        op.status === "open"
                          ? "text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                          : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                      }`}
                    >
                      {op.status === "open" ? "Close Role" : "Re-open Role"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStartEdit(op)}
                      className="h-8 w-8 p-0 text-slate-600 hover:text-indigo-600"
                      title="Edit role"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(op.id, op.title)}
                      className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600 hover:border-rose-200"
                      title="Delete role"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

