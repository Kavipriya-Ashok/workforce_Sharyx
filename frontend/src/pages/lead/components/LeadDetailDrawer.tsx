import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Phone,
  Mail,
  MessageSquare,
  Clock,
  X,
  User,
  Calendar,
  Building,
  Tag,
  Sparkles,
} from "lucide-react";
import { Lead } from "@/types/lead";
import { LeadService } from "@/service/leadService";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface Props {
  leadId: string | null;
  open: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export function LeadDetailDrawer({ leadId, open, onClose, onUpdate }: Props) {
  const [lead, setLead] = useState<Lead | null>(null);
  const [note, setNote] = useState("");
  const [submittingNote, setSubmittingNote] = useState(false);

  const fetchDetails = async () => {
    if (!leadId) return;
    try {
      const data = await LeadService.getLeadById(leadId);
      setLead(data);
    } catch (e: any) {
      toast.error(e.message || "Failed to load lead details");
    }
  };

  useEffect(() => {
    if (open && leadId) fetchDetails();
  }, [open, leadId]);

  const handleAddNote = async () => {
    if (!note.trim() || !leadId) return;
    try {
      setSubmittingNote(true);
      await LeadService.addActivity(leadId, "Manual Note", note, "NOTE");
      setNote("");
      toast.success("Note added");
      fetchDetails();
      onUpdate();
    } catch {
      toast.error("Failed to add note");
    } finally {
      setSubmittingNote(false);
    }
  };

  if (!open || !lead) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-xl bg-slate-900 border-l border-slate-800 p-6 flex flex-col justify-between shadow-2xl overflow-y-auto">
          {/* Header */}
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-slate-700 text-slate-400">
                  {lead.source}
                </Badge>
                <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {lead.lead_status}
                </Badge>
              </div>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-white">{lead.name}</h2>
              <p className="text-sm text-slate-400 flex items-center gap-1.5 mt-1">
                <Building className="h-3.5 w-3.5" />
                {lead.company_name || "No Company Specified"}
                {lead.job_title && ` • ${lead.job_title}`}
              </p>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-3 gap-2">
              {lead.phone ? (
                <a
                  href={`tel:${lead.phone}`}
                  className="flex items-center justify-center gap-1.5 p-2.5 bg-slate-800/80 hover:bg-slate-800 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700/50"
                >
                  <Phone className="h-3.5 w-3.5 text-cyan-400" /> Call
                </a>
              ) : null}
              {lead.phone ? (
                <a
                  href={`https://wa.me/${lead.phone.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-1.5 p-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-xl text-xs font-semibold border border-emerald-500/20"
                >
                  <MessageSquare className="h-3.5 w-3.5" /> WhatsApp
                </a>
              ) : null}
              {lead.email ? (
                <a
                  href={`mailto:${lead.email}`}
                  className="flex items-center justify-center gap-1.5 p-2.5 bg-slate-800/80 hover:bg-slate-800 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700/50"
                >
                  <Mail className="h-3.5 w-3.5 text-blue-400" /> Email
                </a>
              ) : null}
            </div>

            {/* Log Note */}
            <div className="space-y-2 border border-slate-800 rounded-2xl p-4 bg-slate-950/50">
              <span className="text-xs font-semibold text-slate-300">Log Activity / Note</span>
              <Textarea
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Type meeting summary, call notes, or follow-up reminders..."
                className="bg-slate-900 border-slate-800 text-white text-xs"
              />
              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={handleAddNote}
                  disabled={submittingNote || !note.trim()}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-8"
                >
                  Save Note
                </Button>
              </div>
            </div>

            {/* Activity Timeline */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-slate-500" /> Activity Timeline
              </h4>
              <div className="space-y-4 pl-2 border-l border-slate-800 ml-1">
                {lead.activities && lead.activities.length > 0 ? (
                  lead.activities.map((act) => (
                    <div key={act.id} className="relative pl-5 space-y-1">
                      <div className="absolute -left-[5px] top-1.5 h-2 w-2 rounded-full bg-emerald-400" />
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-white">{act.title}</span>
                        <span className="text-slate-500 text-[10px]">
                          {formatDistanceToNow(new Date(act.created_on), { addSuffix: true })}
                        </span>
                      </div>
                      {act.description && (
                        <p className="text-xs text-slate-400">{act.description}</p>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 italic pl-4">No activities logged yet.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
