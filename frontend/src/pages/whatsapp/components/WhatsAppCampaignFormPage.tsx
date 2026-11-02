import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { WhatsAppService } from "@/service/whatsappService";
import { WhatsAppCampaign, WhatsAppTemplate } from "@/types/whatsapp";
import { CreateWhatsAppCampaignDialog } from "./CreateWhatsAppCampaignDialog";
import {
  Zap,
  Megaphone,
  Send,
  Users,
  CheckCircle,
  Eye,
  Clock,
  Plus,
  Trash2,
  Edit,
  Radio,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

export const WhatsAppCampaignFormPage: React.FC = () => {
  const [campaigns, setCampaigns] = useState<WhatsAppCampaign[]>([]);
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<WhatsAppCampaign | null>(null);

  // Manual broadcast state
  const [broadcastName, setBroadcastName] = useState("");
  const [broadcastTemplate, setBroadcastTemplate] = useState("");
  const [recipientsText, setRecipientsText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [camps, tpls] = await Promise.all([
        WhatsAppService.getCampaigns(),
        WhatsAppService.getTemplates(),
      ]);
      setCampaigns(camps || []);
      setTemplates(tpls || []);
      if (tpls?.length && !broadcastTemplate) {
        setBroadcastTemplate(tpls[0].name);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load campaigns");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleToggle = async (id: string, currentStatus: boolean) => {
    try {
      await WhatsAppService.toggleCampaign(id, !currentStatus);
      toast.success(!currentStatus ? "Campaign activated ⚡" : "Campaign paused ⏸️");
      setCampaigns((prev) =>
        prev.map((c) => (c.id === id ? { ...c, is_active: !currentStatus } : c))
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to toggle campaign");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete campaign "${name}"?`)) return;
    try {
      await WhatsAppService.deleteCampaign(id);
      toast.success("Campaign deleted");
      setCampaigns((prev) => prev.filter((c) => c.id !== id));
    } catch (err: any) {
      toast.error(err.message || "Failed to delete campaign");
    }
  };

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    const phones = recipientsText
      .split(/[\n,]+/)
      .map((p) => p.trim())
      .filter((p) => p.length > 5);

    if (phones.length === 0) {
      toast.error("Please add at least one recipient phone number");
      return;
    }

    setSubmitting(true);
    try {
      await WhatsAppService.createCampaign({
        name: broadcastName,
        template_name: broadcastTemplate,
        trigger_event: "manual_broadcast",
        total_recipients: phones.length,
        is_active: true,
      });
      toast.success(`Broadcast "${broadcastName}" dispatched to ${phones.length} recipients! 🚀`);
      setBroadcastName("");
      setRecipientsText("");
      await fetchData();
    } catch {
      toast.error("Failed to create broadcast campaign");
    } finally {
      setSubmitting(false);
    }
  };

  const getTriggerLabel = (event?: string) => {
    switch (event) {
      case "appointment_booked":
        return { label: "📅 Appointment Scheduled ➔ Send Google Meet Link", color: "bg-blue-50 text-blue-700 border-blue-200" };
      case "demo_booked":
        return { label: "🎥 Live Demo Booked ➔ Send Demo GMeet Link", color: "bg-indigo-50 text-indigo-700 border-indigo-200" };
      case "interview_booked":
        return { label: "🎓 Placement / Interview ➔ Send Interview Meet Link", color: "bg-purple-50 text-purple-700 border-purple-200" };
      case "quotation_requested":
        return { label: "📄 Pricing & Quotation Requested ➔ Send Quote", color: "bg-amber-50 text-amber-800 border-amber-200" };
      case "whatsapp_details_requested":
        return { label: "📲 WhatsApp Details Requested ➔ Send Details", color: "bg-emerald-50 text-emerald-700 border-emerald-200" };
      case "lead_qualified":
        return { label: "⭐ Interested / Info Requested ➔ Send Overview", color: "bg-cyan-50 text-cyan-700 border-cyan-200" };
      case "round_1_cleared":
        return { label: "Candidate: Round 1 Cleared ➔ Round 2", color: "bg-emerald-50 text-emerald-700 border-emerald-200" };
      case "after_call_ends":
        return { label: "🔔 Any Completed Call ➔ Post-Call Summary", color: "bg-indigo-50 text-indigo-700 border-indigo-200" };
      case "deal_won":
        return { label: "🏆 Sales: Deal Won VIP Welcome", color: "bg-amber-50 text-amber-700 border-amber-200" };
      case "inactive_followup":
        return { label: "24h Inactive Re-engagement", color: "bg-purple-50 text-purple-700 border-purple-200" };
      default:
        return { label: event || "Manual Segment Broadcast", color: "bg-slate-100 text-slate-700 border-slate-200" };
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border border-blue-150 bg-white shadow-xs">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              Automated WhatsApp Campaigns & Broadcasts
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Event-driven triggers that automatically dispatch pre-approved Meta templates on key candidate and CRM milestones.
            </p>
          </div>
        </div>

        <Button
          size="sm"
          onClick={() => {
            setEditingCampaign(null);
            setDialogOpen(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs gap-1.5 shadow-sm shadow-blue-500/20"
        >
          <Plus className="h-4 w-4" />
          New Automated Campaign
        </Button>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Active Automated Trigger Campaigns List */}
        <div className="lg:col-span-7 space-y-4">
          <Card className="bg-white border-blue-150 shadow-xs">
            <CardHeader className="pb-3 border-b border-blue-100">
              <CardTitle className="text-sm font-bold flex items-center justify-between text-slate-900">
                <span className="flex items-center gap-2">
                  <Radio className="h-4 w-4 text-emerald-500 animate-pulse" />
                  Active Event Triggers ({campaigns.length})
                </span>
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                System automations sending templates on candidate interview and CRM events
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 divide-y divide-blue-50">
              {loading ? (
                <div className="space-y-3 py-4">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-24 rounded-xl bg-slate-50 border border-slate-150 animate-pulse" />
                  ))}
                </div>
              ) : campaigns.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs">
                  No automated campaigns active. Click "New Automated Campaign" to create one.
                </div>
              ) : (
                campaigns.map((camp) => {
                  const triggerInfo = getTriggerLabel(camp.trigger_event);
                  return (
                    <div key={camp.id} className="py-4 first:pt-0 last:pb-0">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-xs font-bold text-slate-900">{camp.name}</h4>
                            <Badge variant="outline" className={`text-[10px] font-semibold ${triggerInfo.color}`}>
                              {triggerInfo.label}
                            </Badge>
                          </div>
                          <p className="text-xs text-slate-500 mt-1">
                            Template:{" "}
                            <span className="text-blue-700 font-mono font-semibold">
                              {camp.template_name}
                            </span>
                            {camp.delay_minutes ? ` • Delay: ${camp.delay_minutes}m` : " • Instant Dispatch"}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <Switch
                            checked={camp.is_active ?? true}
                            onCheckedChange={() => handleToggle(camp.id, camp.is_active ?? true)}
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingCampaign(camp);
                              setDialogOpen(true);
                            }}
                            className="h-7 w-7 p-0 text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(camp.id, camp.name)}
                            className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>

                      {/* Performance Metric Bar */}
                      <div className="grid grid-cols-4 gap-2 text-center bg-slate-50 p-2.5 rounded-xl border border-blue-100 mt-2">
                        <div>
                          <p className="text-[10px] font-medium text-slate-400">Recipients</p>
                          <p className="text-xs font-bold text-slate-900">{camp.total_recipients || 0}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-medium text-slate-400 flex items-center justify-center gap-0.5">
                            <CheckCircle className="h-2.5 w-2.5 text-blue-600" /> Sent
                          </p>
                          <p className="text-xs font-bold text-blue-700">{camp.sent_count || 0}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-medium text-slate-400 flex items-center justify-center gap-0.5">
                            <CheckCircle className="h-2.5 w-2.5 text-emerald-600" /> Delivered
                          </p>
                          <p className="text-xs font-bold text-emerald-700">{camp.delivered_count || 0}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-medium text-slate-400 flex items-center justify-center gap-0.5">
                            <Eye className="h-2.5 w-2.5 text-cyan-600" /> Read
                          </p>
                          <p className="text-xs font-bold text-cyan-700">{camp.read_count || 0}</p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Manual Instant Broadcast Dispatcher */}
        <div className="lg:col-span-5">
          <Card className="bg-white border-blue-150 shadow-xs">
            <CardHeader className="pb-3 border-b border-blue-100">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-900">
                <Megaphone className="h-4 w-4 text-blue-600" />
                Manual Broadcast Launcher
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Dispatch an approved template directly to a list of candidate or client phone numbers
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <form onSubmit={handleBroadcast} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700">Broadcast Title</label>
                  <Input
                    placeholder="e.g. Batch 2026 Interview Callout"
                    className="mt-1 bg-slate-50 border-slate-200 focus:bg-white text-xs text-slate-900"
                    value={broadcastName}
                    onChange={(e) => setBroadcastName(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700">Meta Template</label>
                  <select
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    value={broadcastTemplate}
                    onChange={(e) => setBroadcastTemplate(e.target.value)}
                    required
                  >
                    {templates.map((t) => (
                      <option key={t.id || t.name} value={t.name}>
                        {t.name} ({t.category || "UTILITY"})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700">
                    Recipients (One per line or comma separated)
                  </label>
                  <Textarea
                    placeholder="+919876543210&#10;+919655509060"
                    rows={4}
                    className="mt-1 font-mono text-xs bg-slate-50 border-slate-200 focus:bg-white text-slate-900"
                    value={recipientsText}
                    onChange={(e) => setRecipientsText(e.target.value)}
                    required
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs gap-1.5 shadow-sm shadow-blue-500/20"
                  disabled={submitting}
                >
                  <Send className="h-4 w-4" />
                  {submitting ? "Dispatching Broadcast..." : "Launch Broadcast"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Create / Edit Campaign Dialog */}
      <CreateWhatsAppCampaignDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        templates={templates}
        campaign={editingCampaign}
        onSuccess={fetchData}
      />
    </div>
  );
};
