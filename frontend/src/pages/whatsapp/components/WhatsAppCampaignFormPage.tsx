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
      case "round_1_cleared":
        return { label: "Candidate: Round 1 Cleared ➔ Round 2", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" };
      case "demo_booked":
        return { label: "Meeting Booked ➔ GMeet Link", color: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30" };
      case "after_call_ends":
        return { label: "Post-Call Summary Dispatch", color: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30" };
      case "deal_won":
        return { label: "Sales: Deal Won VIP Welcome", color: "bg-amber-500/10 text-amber-400 border-amber-500/30" };
      case "inactive_followup":
        return { label: "24h Inactive Re-engagement", color: "bg-purple-500/10 text-purple-400 border-purple-500/30" };
      default:
        return { label: "Manual Segment Broadcast", color: "bg-slate-800 text-slate-300 border-slate-700" };
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-400" />
            Automated WhatsApp Campaigns
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Event-driven triggers that automatically dispatch pre-approved Meta templates on key customer milestones.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => {
            setEditingCampaign(null);
            setDialogOpen(true);
          }}
          className="gap-1.5 bg-amber-600 hover:bg-amber-500 text-white"
        >
          <Plus className="h-4 w-4" />
          New Automated Campaign
        </Button>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Active Automated Trigger Campaigns List */}
        <div className="lg:col-span-7 space-y-4">
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader className="pb-3 border-b border-slate-800">
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2 text-white">
                  <Radio className="h-4 w-4 text-emerald-400 animate-pulse" />
                  Active Event Triggers ({campaigns.length})
                </span>
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                System automations sending templates on candidate & CRM events
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 divide-y divide-slate-800/80">
              {loading ? (
                <div className="space-y-3 py-4">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-24 rounded-lg bg-slate-800/40 animate-pulse" />
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
                            <h4 className="text-sm font-semibold text-white">{camp.name}</h4>
                            <Badge variant="outline" className={`text-[10px] ${triggerInfo.color}`}>
                              {triggerInfo.label}
                            </Badge>
                          </div>
                          <p className="text-xs text-slate-400 mt-1">
                            Template:{" "}
                            <span className="text-emerald-400 font-mono font-medium">
                              {camp.template_name}
                            </span>
                            {camp.delay_minutes ? ` • Delay: ${camp.delay_minutes}m` : " • Instant"}
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
                            className="h-8 w-8 p-0 text-slate-400 hover:text-white"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(camp.id, camp.name)}
                            className="h-8 w-8 p-0 text-slate-400 hover:text-rose-400"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>

                      {/* Performance Metric Bar */}
                      <div className="grid grid-cols-4 gap-2 text-center bg-slate-950/60 p-2 rounded-lg border border-slate-800 mt-2">
                        <div>
                          <p className="text-[10px] text-slate-400">Recipients</p>
                          <p className="text-xs font-bold text-white">{camp.total_recipients || 0}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 flex items-center justify-center gap-0.5">
                            <CheckCircle className="h-2.5 w-2.5 text-blue-400" /> Sent
                          </p>
                          <p className="text-xs font-bold text-blue-400">{camp.sent_count || 0}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 flex items-center justify-center gap-0.5">
                            <CheckCircle className="h-2.5 w-2.5 text-emerald-400" /> Delivered
                          </p>
                          <p className="text-xs font-bold text-emerald-400">{camp.delivered_count || 0}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 flex items-center justify-center gap-0.5">
                            <Eye className="h-2.5 w-2.5 text-cyan-400" /> Read
                          </p>
                          <p className="text-xs font-bold text-cyan-400">{camp.read_count || 0}</p>
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
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader className="pb-3 border-b border-slate-800">
              <CardTitle className="text-base flex items-center gap-2 text-white">
                <Megaphone className="h-4 w-4 text-emerald-400" />
                Manual Broadcast Launcher
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Dispatch an approved template directly to a list of phone numbers
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <form onSubmit={handleBroadcast} className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-slate-300">Broadcast Title</label>
                  <Input
                    placeholder="e.g. Weekend Special Announcement"
                    className="mt-1 bg-slate-950 border-slate-800 text-white"
                    value={broadcastName}
                    onChange={(e) => setBroadcastName(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-300">Meta Template</label>
                  <select
                    className="w-full mt-1 px-3 py-2 rounded-md bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
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
                  <label className="text-xs font-medium text-slate-300">
                    Recipients (One per line or comma separated)
                  </label>
                  <Textarea
                    placeholder="+919876543210&#10;+919123456789"
                    rows={4}
                    className="mt-1 font-mono text-xs bg-slate-950 border-slate-800 text-white"
                    value={recipientsText}
                    onChange={(e) => setRecipientsText(e.target.value)}
                    required
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white"
                  disabled={submitting}
                >
                  <Send className="mr-2 h-4 w-4" />
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
