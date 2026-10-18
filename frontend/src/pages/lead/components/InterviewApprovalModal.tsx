import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LeadService } from "@/service/leadService";
import { toast } from "sonner";
import { Video, Building2 } from "lucide-react";

export function InterviewApprovalModal({
  leadId,
  candidateName,
  open,
  onOpenChange,
  onSuccess,
}: any) {
  const [mode, setMode] = useState<"ONLINE" | "OFFICE">("ONLINE");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [gmeetLink, setGmeetLink] = useState("https://meet.google.com/sha-vdec-zha");
  const [submitting, setSubmitting] = useState(false);

  const handleApprove = async () => {
    try {
      setSubmitting(true);
      await LeadService.approveCandidateInterview(leadId, {
        mode,
        interview_date: date,
        interview_time: time,
        gmeet_link: mode === "ONLINE" ? gmeetLink : undefined,
      });
      toast.success("Interview Approved & GMeet link scheduled!");
      onSuccess();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "Approval Failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-slate-900 border-slate-800 text-slate-100">
        <DialogHeader>
          <DialogTitle className="text-white font-bold">
            Approve Interview for {candidateName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex gap-2">
            <Button
              type="button"
              variant={mode === "ONLINE" ? "default" : "outline"}
              className={`flex-1 gap-1.5 h-9 text-xs ${
                mode === "ONLINE"
                  ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                  : "border-slate-800 text-slate-400"
              }`}
              onClick={() => setMode("ONLINE")}
            >
              <Video className="h-4 w-4" /> Online (Google Meet)
            </Button>
            <Button
              type="button"
              variant={mode === "OFFICE" ? "default" : "outline"}
              className={`flex-1 gap-1.5 h-9 text-xs ${
                mode === "OFFICE"
                  ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                  : "border-slate-800 text-slate-400"
              }`}
              onClick={() => setMode("OFFICE")}
            >
              <Building2 className="h-4 w-4" /> In-Office
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-slate-400">Date</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="bg-slate-950 border-slate-800 text-white"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-400">Time</Label>
              <Input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="bg-slate-950 border-slate-800 text-white"
              />
            </div>
          </div>

          {mode === "ONLINE" && (
            <div className="space-y-1">
              <Label className="text-xs text-slate-400">Google Meet Link</Label>
              <Input
                value={gmeetLink}
                onChange={(e) => setGmeetLink(e.target.value)}
                placeholder="https://meet.google.com/..."
                className="bg-slate-950 border-slate-800 text-white"
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-slate-800 text-slate-400 hover:text-white"
          >
            Cancel
          </Button>
          <Button
            onClick={handleApprove}
            disabled={submitting || !date || !time}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
          >
            {submitting ? "Sending..." : "Approve & Send Invites"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
