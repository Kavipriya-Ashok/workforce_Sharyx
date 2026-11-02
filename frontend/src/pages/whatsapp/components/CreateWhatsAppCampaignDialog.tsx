import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WhatsAppService } from "@/service/whatsappService";
import { toast } from "sonner";
import { Zap } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: any[];
  campaign?: any | null;
  onSuccess: () => void;
}

export const CreateWhatsAppCampaignDialog: React.FC<Props> = ({
  open,
  onOpenChange,
  templates,
  campaign,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: "",
    description: "",
    trigger_event: "quotation_requested",
    outcome_filter: "Quotation Requested",
    template_name: "",
    delay_minutes: 0,
    is_active: true,
  });

  React.useEffect(() => {
    if (open) {
      if (campaign) {
        setForm({
          name: campaign.name || "",
          description: campaign.description || "",
          trigger_event: campaign.trigger_event || "quotation_requested",
          outcome_filter: (campaign as any).outcome_filter || "Quotation Requested",
          template_name: campaign.template_name || (templates[0]?.name || ""),
          delay_minutes: campaign.delay_minutes || 0,
          is_active: campaign.is_active ?? true,
        });
      } else {
        setForm({
          name: "",
          description: "",
          trigger_event: "quotation_requested",
          outcome_filter: "Quotation Requested",
          template_name: templates[0]?.name || "",
          delay_minutes: 0,
          is_active: true,
        });
      }
    }
  }, [open, campaign, templates]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.template_name) {
      toast.error("Name and Template selection are required");
      return;
    }

    try {
      setLoading(true);
      if (campaign?.id) {
        await WhatsAppService.updateCampaign(campaign.id, form);
        toast.success("Campaign updated! ⚡");
      } else {
        await WhatsAppService.createCampaign(form);
        toast.success("Automated campaign created! 🚀");
      }
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to save campaign");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-white border border-blue-150 shadow-2xl text-slate-900">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-900">
            <Zap className="h-5 w-5 text-blue-600" />
            {campaign ? "Edit Campaign" : "New Automated WhatsApp Campaign"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">Campaign Title *</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Round 2 Google Meet Invite"
              className="bg-slate-50 border-slate-200 focus:bg-white text-xs text-slate-900"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">Trigger Event *</Label>
            <Select
              value={form.trigger_event}
              onValueChange={(val) => {
                const autoOutcomeMap: Record<string, string> = {
                  quotation_requested: "Pricing & Quotation Requested",
                  whatsapp_details_requested: "WhatsApp Details Requested",
                  appointment_booked: "Appointment Scheduled",
                  demo_booked: "Demo Booked",
                  interview_booked: "Interview Scheduled",
                  lead_qualified: "Interested - Info Requested",
                  callback_requested: "Callback Requested",
                  deal_won: "Deal Won",
                  after_call_ends: "ALL",
                };
                const autoTplMap: Record<string, string> = {
                  quotation_requested: "quotation_dispatch",
                  whatsapp_details_requested: "quotation_dispatch",
                  appointment_booked: "demo_meeting_link_confirmation",
                  demo_booked: "demo_meeting_link_confirmation",
                  interview_booked: "interview_meeting_link_confirmation",
                };
                const matchedTpl = templates.find((t) => t.name === autoTplMap[val]);
                setForm({
                  ...form,
                  trigger_event: val,
                  outcome_filter: autoOutcomeMap[val] || form.outcome_filter,
                  template_name: matchedTpl ? matchedTpl.name : form.template_name,
                });
              }}
            >
              <SelectTrigger className="bg-slate-50 border-slate-200 focus:bg-white text-xs text-slate-900">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white border-slate-200">
                <SelectItem value="appointment_booked">📅 Appointment / Meeting Scheduled ➔ Send Google Meet Link</SelectItem>
                <SelectItem value="demo_booked">🎥 Live Demo Booked ➔ Send Demo Google Meet Link</SelectItem>
                <SelectItem value="interview_booked">🎓 Placement / Candidate Interview ➔ Send Interview Meet Link</SelectItem>
                <SelectItem value="quotation_requested">📄 Pricing & Quotation Requested ➔ Send Pricing & Quote</SelectItem>
                <SelectItem value="whatsapp_details_requested">📲 Client Asked Details on WhatsApp ➔ Send Details Template</SelectItem>
                <SelectItem value="lead_qualified">⭐ Interested / Info Requested ➔ Send Product Overview</SelectItem>
                <SelectItem value="callback_requested">📞 Callback Requested ➔ Send Callback Confirmation</SelectItem>
                <SelectItem value="after_call_ends">🔔 Any Completed Call (Post-Call Summary Dispatch)</SelectItem>
                <SelectItem value="round_1_cleared">✅ Candidate: Round 1 Cleared ➔ Send Round 2</SelectItem>
                <SelectItem value="deal_won">🏆 Sales: Deal Won VIP Welcome</SelectItem>
                <SelectItem value="manual_broadcast">📢 Manual Broadcast</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">Outcome Trigger Filter (When Outcome Matches) *</Label>
            <Select
              value={form.outcome_filter}
              onValueChange={(val) => setForm({ ...form, outcome_filter: val })}
            >
              <SelectTrigger className="bg-slate-50 border-slate-200 focus:bg-white text-xs text-slate-900">
                <SelectValue placeholder="Select outcome condition" />
              </SelectTrigger>
              <SelectContent className="bg-white border-slate-200">
                <SelectItem value="ALL">⚡ ALL - Fire for any call outcome</SelectItem>
                <SelectItem value="Appointment Scheduled">📅 Appointment Scheduled (Doctor / Service / General Meet)</SelectItem>
                <SelectItem value="Demo Booked">🎥 Demo Booked (Product Walkthrough + Google Meet)</SelectItem>
                <SelectItem value="Interview Scheduled">🎓 Interview Scheduled (Candidate / Placement Round + Meet)</SelectItem>
                <SelectItem value="Placement & Interview Inquiry">💼 Placement & Interview Inquiry (Career / Job Opening)</SelectItem>
                <SelectItem value="Pricing & Quotation Requested">💰 Pricing & Quotation Requested (Plans & Pricing)</SelectItem>
                <SelectItem value="Quotation Requested">📄 Quotation Requested (Proposal / Estimate)</SelectItem>
                <SelectItem value="WhatsApp Details Requested">📲 WhatsApp Details Requested (Asked to send on WhatsApp)</SelectItem>
                <SelectItem value="Interested - Info Requested">⭐ Interested - Info Requested (General Inquiry)</SelectItem>
                <SelectItem value="Interested">🔥 Interested / Hot Lead</SelectItem>
                <SelectItem value="Callback Requested">📞 Callback Requested</SelectItem>
                <SelectItem value="Price Objection">💳 Price Objection / Budget Discussion</SelectItem>
                <SelectItem value="Not Interested">❌ Not Interested</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">WhatsApp Template *</Label>
            <Select
              value={form.template_name}
              onValueChange={(val) => setForm({ ...form, template_name: val })}
            >
              <SelectTrigger className="bg-slate-50 border-slate-200 focus:bg-white text-xs text-slate-900">
                <SelectValue placeholder="Select an approved template" />
              </SelectTrigger>
              <SelectContent className="bg-white border-slate-200">
                {templates.map((t) => (
                  <SelectItem key={t.id || t.name} value={t.name}>
                    {t.name} ({t.category || "UTILITY"})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3 items-center">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Delay (Minutes)</Label>
              <Input
                type="number"
                min={0}
                value={form.delay_minutes}
                onChange={(e) => setForm({ ...form, delay_minutes: Number(e.target.value) })}
                className="bg-slate-50 border-slate-200 focus:bg-white text-xs text-slate-900"
              />
            </div>
            <div className="flex items-center justify-between pt-5">
              <Label className="text-xs font-semibold text-slate-700">Active Now</Label>
              <Switch
                checked={form.is_active}
                onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
              />
            </div>
          </div>

          <DialogFooter className="border-t border-slate-100 pt-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-xs text-slate-600 hover:text-slate-800"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !form.name || !form.template_name}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs"
            >
              {loading ? "Saving..." : campaign ? "Update Campaign" : "Create Campaign"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
