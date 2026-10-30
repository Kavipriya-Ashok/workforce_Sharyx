import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Phone,
  Mail,
  MessageSquare,
  Clock,
  X,
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
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  Play,
  Pause,
} from "lucide-react";
import { Lead } from "@/types/lead";
import { LeadService } from "@/service/leadService";
import { customerService } from "@/service/customerService";
import { VoiceService, VoiceAgentDto, VoiceCallLogItem } from "@/service/voiceService";
import { SendLeadEmailModal } from "./SendLeadEmailModal";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface Props {
  leadId: string | null;
  open: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

const CANDIDATE_STAGES = [
  { value: "new", label: "🆕 New", color: "bg-blue-100 text-blue-700" },
  { value: "screening", label: "🔍 Screening", color: "bg-amber-100 text-amber-700" },
  { value: "scheduled", label: "📅 Scheduled", color: "bg-purple-100 text-purple-700" },
  { value: "offered", label: "✉️ Offered", color: "bg-cyan-100 text-cyan-700" },
  { value: "joined", label: "✅ Joined", color: "bg-green-100 text-green-700" },
  { value: "rejected", label: "❌ Rejected", color: "bg-red-100 text-red-700" },
];

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value?: string | number | null }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex items-start gap-2 text-sm">
      <Icon className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
      <div>
        <span className="text-xs text-slate-500 block">{label}</span>
        <span className="font-medium text-slate-800">{value}</span>
      </div>
    </div>
  );
}

export function LeadDetailDrawer({ leadId, open, onClose, onUpdate }: Props) {
  const [lead, setLead] = useState<Lead | null>(null);
  const [note, setNote] = useState("");
  const [submittingNote, setSubmittingNote] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [stageUpdating, setStageUpdating] = useState(false);
  const [triggeringCall, setTriggeringCall] = useState(false);
  const [convertingCustomer, setConvertingCustomer] = useState(false);

  // Voice AI Agents & Call Logs
  const [voiceAgents, setVoiceAgents] = useState<VoiceAgentDto[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");
  const [leadCallLogs, setLeadCallLogs] = useState<VoiceCallLogItem[]>([]);
  const [loadingCallLogs, setLoadingCallLogs] = useState(false);
  const [expandedTranscriptId, setExpandedTranscriptId] = useState<string | null>(null);

  const fetchDetails = async () => {
    if (!leadId) return;
    try {
      const data = await LeadService.getLeadById(leadId);
      setLead(data);
      if (data?.phone) {
        fetchLeadCallLogs(data.phone);
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to load details");
    }
  };

  const fetchVoiceAgents = async () => {
    try {
      const agents = await VoiceService.listAgents();
      setVoiceAgents(agents);
      if (agents.length > 0 && !selectedAgentId) {
        // default select recruiter if candidate, otherwise sales specialist
        const defaultAgent = lead?.is_candidate
          ? agents.find((a) => a.template_key === "recruitment" || /recrui|maya|sarah/i.test(a.name)) || agents[0]
          : agents.find((a) => a.template_key === "sales" || /sales|alex/i.test(a.name)) || agents[0];
        setSelectedAgentId(defaultAgent?.id || agents[0].id);
      }
    } catch {
      // non-fatal
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
    } catch (err: any) {
      // silent or fallback
    } finally {
      setLoadingCallLogs(false);
    }
  };

  useEffect(() => {
    if (open && leadId) {
      fetchDetails();
      fetchVoiceAgents();
    }
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

  const handleStageChange = async (stage: string) => {
    if (!leadId) return;
    try {
      setStageUpdating(true);
      await LeadService.updateCandidateStage(leadId, stage);
      toast.success(`Stage updated to ${stage}`);
      fetchDetails();
      onUpdate();
    } catch {
      toast.error("Failed to update stage");
    } finally {
      setStageUpdating(false);
    }
  };

  const handleTriggerVoiceCall = async (agentOverrideId?: string) => {
    if (!leadId || !lead?.phone) {
      toast.error("Lead does not have a phone number");
      return;
    }
    const agentIdToUse = agentOverrideId || selectedAgentId;
    const targetAgent = voiceAgents.find((a) => a.id === agentIdToUse || a.remote_agent_id === agentIdToUse);
    try {
      setTriggeringCall(true);
      const isInterview = lead.is_candidate;
      const scheduledType = isInterview ? "interview" : "demo";
      const meetUrl = lead.interview_link || (lead as any).custom_fields?.interview?.gmeet_link;
      const slot =
        (lead as any).custom_fields?.interview?.interview_date ||
        (lead as any).custom_fields?.last_voice_call?.meeting_slot ||
        "Scheduled Session";

      toast.info(`Dialing ${lead.name} via ${targetAgent?.name || "AI Voice Agent"}...`);

      await LeadService.triggerVoiceCall(leadId, {
        scheduledType,
        meetUrl,
        slot,
        agentId: agentIdToUse || undefined,
        agentKey: targetAgent?.template_key || (isInterview ? "recruitment" : "sales"),
      });

      toast.success(`📞 Outbound call dispatched to ${lead.phone}!`);
      await fetchDetails();
      setTimeout(() => {
        fetchLeadCallLogs(lead.phone);
      }, 3500);
      onUpdate();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Failed to trigger voice call");
    } finally {
      setTriggeringCall(false);
    }
  };

  const handleConvertToCustomer = async () => {
    if (!leadId) return;
    try {
      setConvertingCustomer(true);
      await customerService.convertLeadToCustomer(leadId, {
        dealValue: lead?.deal_value || 5000,
        moveLeadStage: "WON",
        ruleName: "Manual 1-Click CRM Conversion",
      });
      toast.success(`🏆 Successfully converted Lead ${lead?.name} to Active Customer!`);
      await fetchDetails();
      onUpdate();
    } catch (err: any) {
      toast.error(err.message || "Conversion failed");
    } finally {
      setConvertingCustomer(false);
    }
  };

  if (!open || !lead) return null;

  const c = lead as any; // candidate extra fields
  const stageInfo = CANDIDATE_STAGES.find((s) => s.value === c.candidate_stage);

  const formatCTC = (val?: number, basis?: string) => {
    if (!val) return null;
    return `₹${Number(val).toLocaleString("en-IN")} / ${basis === "monthly" ? "month" : "year"}`;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-xl bg-white border-l border-blue-100 p-6 flex flex-col gap-5 shadow-2xl overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-blue-100 pb-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="border-blue-200 text-blue-600 text-xs">{lead.source}</Badge>
              <Badge className={`text-xs ${stageInfo ? stageInfo.color : "bg-slate-100 text-slate-600"}`}>
                {stageInfo?.label || lead.lead_status}
              </Badge>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-blue-600 p-1 rounded-lg hover:bg-blue-50">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Name */}
          <div>
            <h2 className="text-2xl font-bold text-slate-800">{lead.name}</h2>
            <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-1">
              <Building className="h-3.5 w-3.5" />
              {lead.company_name || "No Company"}{lead.job_title && ` • ${lead.job_title}`}
            </p>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-4 gap-2">
            {lead.phone && (
              <a href={`tel:${lead.phone}`}
                className="flex items-center justify-center gap-1.5 p-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-semibold border border-blue-100">
                <Phone className="h-3.5 w-3.5" /> Call
              </a>
            )}
            {lead.phone && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleTriggerVoiceCall()}
                disabled={triggeringCall}
                className="p-2 bg-violet-50 hover:bg-violet-100 text-violet-700 rounded-xl text-xs font-semibold border border-violet-100 h-auto gap-1"
                title="Trigger automated voice call via connected provider (Vapi / SaaS)"
              >
                <PhoneCall className="h-3.5 w-3.5 text-violet-600" /> AI Voice
              </Button>
            )}
            {lead.phone && (
              <a href={`https://wa.me/${lead.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer"
                className="flex items-center justify-center gap-1.5 p-2 bg-green-50 hover:bg-green-100 text-green-700 rounded-xl text-xs font-semibold border border-green-100">
                <MessageSquare className="h-3.5 w-3.5" /> WhatsApp
              </a>
            )}
            {lead.email && (
              <button type="button" onClick={() => setEmailModalOpen(true)}
                className="flex items-center justify-center gap-1.5 p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-semibold border border-indigo-100">
                <Mail className="h-3.5 w-3.5" /> Email
              </button>
            )}
          </div>

          {/* Lead ➔ Customer Conversion Status & Action Card */}
          {lead.lead_status === 'WON' || (lead as any).custom_fields?.converted_customer_id ? (
            <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 border border-emerald-200 rounded-2xl p-4 shadow-xs flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="p-2 rounded-xl bg-emerald-600 text-white shadow-xs">
                  <UserCheck className="h-4 w-4" />
                </span>
                <div>
                  <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                    Converted Customer Profile Active 🏆
                  </h4>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Tier: <span className="font-bold text-slate-900">{(lead as any).custom_fields?.converted_customer_tier || 'PROFESSIONAL'}</span> · Deal Value:{' '}
                    <span className="font-bold text-emerald-700">₹{Number(lead.deal_value || 5000).toLocaleString()} {lead.currency || 'INR'}</span>
                  </p>
                </div>
              </div>
              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] font-bold">
                WON DEAL
              </Badge>
            </div>
          ) : (
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-600 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-slate-800">Convert Lead to Customer</p>
                  <p className="text-[10px] text-slate-500">Creates Customer profile, linked CRM deal, & sends onboarding.</p>
                </div>
              </div>
              <Button
                size="sm"
                onClick={handleConvertToCustomer}
                disabled={convertingCustomer}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold text-xs h-8 px-3 gap-1.5 shrink-0 shadow-xs"
              >
                <UserCheck className="h-3.5 w-3.5" />
                {convertingCustomer ? 'Converting...' : 'Convert ➔ Customer'}
              </Button>
            </div>
          )}

          {/* Google Meet Link Banner (if scheduled) */}
          {((lead as any).interview_link || (lead as any).custom_fields?.interview?.gmeet_link) && (
            <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-indigo-600 text-white shadow-xs">
                  <Video className="h-4 w-4" />
                </span>
                <div>
                  <h4 className="text-xs font-bold text-indigo-950 uppercase tracking-wider">
                    Google Meet Session Scheduled
                  </h4>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Slot: <strong className="text-slate-800">{(lead as any).custom_fields?.interview?.interview_date || (lead as any).custom_fields?.last_voice_call?.meeting_slot || "Confirmed"}</strong>
                  </p>
                </div>
              </div>
              <a
                href={(lead as any).interview_link || (lead as any).custom_fields?.interview?.gmeet_link}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all shrink-0"
              >
                <span>Join Meet</span>
                <ExternalLink className="h-3 w-3 opacity-80" />
              </a>
            </div>
          )}

          {/* ── AI VOICE CALLS & VAPI OUTCOMES SECTION ── */}
          <div className="bg-white border border-blue-100 rounded-2xl p-4 space-y-3.5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-blue-600 text-white shadow-xs">
                  <PhoneCall className="h-4 w-4" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      AI Voice Calling & Vapi Outcomes
                    </h4>
                    <Badge variant="outline" className="text-[10px] py-0 px-1.5 bg-blue-50 text-blue-700 border-blue-200 font-semibold">
                      {leadCallLogs.length} calls
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Live telephony calls, audio recordings & detected outcomes
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => fetchLeadCallLogs(lead.phone)}
                className="text-slate-400 hover:text-blue-600 p-1.5 rounded-lg hover:bg-blue-50 transition-colors self-end sm:self-auto"
                title="Refresh call logs"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loadingCallLogs ? "animate-spin" : ""}`} />
              </button>
            </div>

            {/* Agent Selector & Direct Dial Bar */}
            {lead.phone && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <span className="text-[11px] font-semibold text-slate-700 flex items-center justify-between">
                  <span>Choose Voice Agent to Call:</span>
                  <span className="text-[10px] text-slate-400 font-normal">Connected via Vapi Engine</span>
                </span>
                <div className="flex items-center gap-2">
                  <Select value={selectedAgentId} onValueChange={(val) => setSelectedAgentId(val)}>
                    <SelectTrigger className="bg-white border-slate-200 text-xs h-9 flex-1">
                      <SelectValue placeholder="Select an AI Agent..." />
                    </SelectTrigger>
                    <SelectContent>
                      {voiceAgents.length > 0 ? (
                        voiceAgents.map((ag) => (
                          <SelectItem key={ag.id} value={ag.id} className="text-xs">
                            {ag.name} ({ag.provider.toUpperCase()})
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="default" className="text-xs">
                          {lead.is_candidate ? "Talent Recruiter (Sarah)" : "Sales Specialist (Alex)"}
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>

                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleTriggerVoiceCall()}
                    disabled={triggeringCall}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs h-9 px-4 gap-1.5 shadow-xs shrink-0"
                  >
                    <PhoneCall className="h-3.5 w-3.5" />
                    {triggeringCall ? "Dialing..." : "Call Lead Now"}
                  </Button>
                </div>
              </div>
            )}

            {/* List of Call Logs */}
            {loadingCallLogs ? (
              <div className="py-6 flex items-center justify-center gap-2 text-xs text-slate-400">
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                Loading call history & recordings...
              </div>
            ) : leadCallLogs.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-slate-200 text-center space-y-1">
                <p className="text-xs text-slate-600 font-medium">No Voice AI calls logged yet</p>
                <p className="text-[11px] text-slate-400">
                  Select a configured Voice Agent above and click "Call Lead Now" to initiate an automated phone call.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-96 overflow-y-auto pr-0.5">
                {leadCallLogs.map((log) => {
                  const isExpanded = expandedTranscriptId === log.id;
                  const durationMin = Math.floor((log.duration_seconds || 0) / 60);
                  const durationSec = (log.duration_seconds || 0) % 60;
                  const durationFormatted = `${durationMin}:${durationSec.toString().padStart(2, "0")}`;

                  return (
                    <div
                      key={log.id}
                      className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all space-y-2 shadow-xs"
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span
                            className={`p-1 rounded-md text-[10px] font-bold uppercase flex items-center gap-1 ${
                              log.direction === "inbound"
                                ? "bg-cyan-50 text-cyan-700 border border-cyan-200"
                                : "bg-blue-50 text-blue-700 border border-blue-200"
                            }`}
                          >
                            {log.direction === "inbound" ? (
                              <ArrowDownLeft className="h-3 w-3" />
                            ) : (
                              <ArrowUpRight className="h-3 w-3" />
                            )}
                            {log.direction}
                          </span>
                          <span className="text-xs font-bold text-slate-800">
                            {log.agent_name || "Voice AI Agent"}
                          </span>
                          <Badge
                            variant="outline"
                            className={`text-[9px] uppercase font-semibold py-0 ${
                              log.call_status === "completed"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {log.call_status}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {durationFormatted}
                          </span>
                          <span>•</span>
                          <span>{log.created_on ? formatDistanceToNow(new Date(log.created_on), { addSuffix: true }) : "Recent"}</span>
                        </div>
                      </div>

                      {/* VAPI DETECTED OUTCOME BADGE */}
                      {log.call_outcome && (
                        <div className="flex items-center gap-2 pt-0.5">
                          <span className="text-[10px] text-slate-400 uppercase font-semibold">Outcome:</span>
                          {log.call_outcome.toLowerCase().includes("quotation") ? (
                            <Badge className="bg-purple-100 text-purple-800 border-purple-300 text-[10px] font-semibold">
                              📄 Quotation Requested
                            </Badge>
                          ) : log.call_outcome.toLowerCase().includes("demo") || log.call_outcome.toLowerCase().includes("meeting") ? (
                            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] font-semibold">
                              📅 Demo Booked
                            </Badge>
                          ) : log.call_outcome.toLowerCase().includes("interview") ? (
                            <Badge className="bg-cyan-100 text-cyan-800 border-cyan-300 text-[10px] font-semibold">
                              🎓 Interview Scheduled
                            </Badge>
                          ) : log.call_outcome.toLowerCase().includes("not_interested") ? (
                            <Badge className="bg-rose-100 text-rose-800 border-rose-300 text-[10px] font-semibold">
                              ❌ Not Interested
                            </Badge>
                          ) : (
                            <Badge className="bg-blue-100 text-blue-800 border-blue-300 text-[10px] font-semibold">
                              ✨ {log.call_outcome}
                            </Badge>
                          )}
                        </div>
                      )}

                      {/* AI CALL SUMMARY */}
                      {log.summary && (
                        <div className="p-2.5 rounded-lg bg-blue-50/50 border border-blue-100/80 text-xs text-slate-700 leading-relaxed">
                          <span className="font-semibold text-blue-900 block text-[10px] uppercase tracking-wider mb-0.5">
                            AI Summary:
                          </span>
                          {log.summary}
                        </div>
                      )}

                      {/* AUDIO RECORDING PLAYER */}
                      {log.recording_url && (
                        <div className="pt-1">
                          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1 flex items-center gap-1">
                            <Volume2 className="h-3 w-3 text-blue-600" />
                            Call Recording Audio:
                          </span>
                          <audio
                            controls
                            src={log.recording_url}
                            preload="none"
                            className="w-full h-8 rounded-lg bg-slate-50 border border-slate-200"
                          />
                        </div>
                      )}

                      {/* TRANSCRIPT TOGGLE */}
                      {log.transcript && (
                        <div className="pt-1 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() => setExpandedTranscriptId(isExpanded ? null : log.id)}
                            className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors"
                          >
                            <span>{isExpanded ? "Hide Call Transcript" : "View Full Call Transcript"}</span>
                            {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                          </button>

                          {isExpanded && (
                            <div className="mt-2 p-3 rounded-xl bg-slate-900 text-slate-100 text-xs font-mono max-h-52 overflow-y-auto space-y-2 leading-relaxed">
                              {log.transcript.split("\n").filter(Boolean).map((line, idx) => {
                                const isBot = line.toLowerCase().startsWith("ai:") || line.toLowerCase().startsWith("assistant:") || line.toLowerCase().startsWith("bot:");
                                return (
                                  <div
                                    key={idx}
                                    className={`p-2 rounded-lg ${
                                      isBot ? "bg-slate-800 text-blue-300 border-l-2 border-blue-400" : "bg-slate-800/60 text-slate-200"
                                    }`}
                                  >
                                    {line}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Candidate Profile */}
          {lead.is_candidate && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-3">
              <h4 className="text-xs font-bold text-blue-700 uppercase tracking-wider">Candidate Profile</h4>
              <div className="grid grid-cols-2 gap-3">
                <InfoRow icon={Briefcase} label="Total Experience" value={c.total_experience ? `${c.total_experience} yrs` : null} />
                <InfoRow icon={Briefcase} label="Relevant Experience" value={c.relevant_experience ? `${c.relevant_experience} yrs` : null} />
                <InfoRow icon={Building} label="Employment Status" value={c.employment_status} />
                <InfoRow icon={Calendar} label="Relieving / Last Date" value={c.relieving_date ? new Date(c.relieving_date).toLocaleDateString("en-IN") : null} />
                <InfoRow icon={BadgeDollarSign} label="Current CTC" value={formatCTC(c.current_ctc, c.ctc_basis)} />
                <InfoRow icon={BadgeDollarSign} label="Expected CTC" value={formatCTC(c.expected_ctc, c.ctc_basis)} />
                <InfoRow icon={MapPin} label="Relocation" value={c.relocation} />
                <InfoRow icon={Clock} label="Preferred Slot" value={c.preferred_interview_slot} />
              </div>
              {c.resume_url && (
                <a href={c.resume_url} target="_blank" rel="noreferrer"
                  className="flex items-center gap-1.5 text-blue-600 text-xs font-semibold hover:underline mt-1">
                  <FileText className="h-4 w-4" /> View Resume / CV <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
              {c.interview_link && (
                <a href={c.interview_link} target="_blank" rel="noreferrer"
                  className="flex items-center gap-1.5 text-purple-600 text-xs font-semibold hover:underline">
                  <Calendar className="h-4 w-4" /> Interview Meet Link <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          )}

          {/* Stage Changer (candidates only) */}
          {lead.is_candidate && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Move Stage</h4>
              <Select
                value={c.candidate_stage || "new"}
                onValueChange={handleStageChange}
                disabled={stageUpdating}
              >
                <SelectTrigger className="bg-white border-blue-100 text-slate-800 h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CANDIDATE_STAGES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Log Note */}
          <div className="space-y-2 border border-blue-100 rounded-xl p-4 bg-blue-50/40">
            <span className="text-xs font-semibold text-blue-700">Log Activity / Note</span>
            <Textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Type meeting summary, call notes, or follow-up reminders..."
              className="bg-white border-blue-100 text-slate-800 text-xs"
            />
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={handleAddNote}
                disabled={submittingNote || !note.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8"
              >
                Save Note
              </Button>
            </div>
          </div>

          {/* Activity Timeline */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Clock className="h-4 w-4" /> Activity Timeline
            </h4>
            <div className="space-y-4 pl-2 border-l border-blue-100 ml-1">
              {lead.activities && lead.activities.length > 0 ? (
                lead.activities.map((act: any) => (
                  <div key={act.id} className="relative pl-5 space-y-0.5">
                    <div className="absolute -left-[5px] top-1.5 h-2 w-2 rounded-full bg-blue-400" />
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700">{act.title}</span>
                      <span className="text-slate-400 text-[10px]">
                        {formatDistanceToNow(new Date(act.created_on), { addSuffix: true })}
                      </span>
                    </div>
                    {act.description && (
                      <p className="text-xs text-slate-500">{act.description}</p>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 italic pl-4">No activities logged yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {emailModalOpen && lead && (
        <SendLeadEmailModal
          open={emailModalOpen}
          onOpenChange={setEmailModalOpen}
          lead={lead}
          onEmailSent={() => { fetchDetails(); onUpdate(); }}
        />
      )}
    </div>
  );
}
