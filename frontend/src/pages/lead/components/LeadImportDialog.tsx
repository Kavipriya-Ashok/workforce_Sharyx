import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LeadService } from "@/service/leadService";
import { toast } from "sonner";
import { UploadCloud, CheckCircle } from "lucide-react";

export function LeadImportDialog({ open, onOpenChange, isCandidate = false, onSuccess }: any) {
  const [rows, setRows] = useState<any[]>([]);
  const [duplicateStrategy, setDuplicateStrategy] = useState("skip");
  const [importing, setImporting] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split("\n").filter((l) => l.trim().length > 0);
      if (lines.length < 2) return;
      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());

      const parsedRows = lines.slice(1).map((line) => {
        const values = line.split(",").map((v) => v.trim());
        const rowObj: any = { is_candidate: isCandidate, source: "CSV_IMPORT" };
        headers.forEach((h, idx) => {
          if (h.includes("name")) rowObj.name = values[idx];
          else if (h.includes("phone") || h.includes("mobile")) rowObj.phone = values[idx];
          else if (h.includes("email")) rowObj.email = values[idx];
          else if (h.includes("company")) rowObj.company_name = values[idx];
        });
        return rowObj;
      });

      setRows(parsedRows.filter((r) => r.name || r.phone));
    };
    reader.readAsText(f);
  };

  const handleImport = async () => {
    if (rows.length === 0) return;
    try {
      setImporting(true);
      const res = await LeadService.importLeads({
        rows,
        duplicate_strategy: duplicateStrategy,
        source: "CSV_IMPORT",
      });
      toast.success(`Imported ${res?.imported || rows.length} leads successfully!`);
      onSuccess();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "Import failed");
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-slate-900 border-slate-800 text-slate-100">
        <DialogHeader>
          <DialogTitle className="text-white font-bold">Import Leads from CSV</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="border-2 border-dashed border-slate-800 rounded-2xl p-6 flex flex-col items-center justify-center text-center hover:bg-slate-950/50 cursor-pointer">
            <UploadCloud className="h-8 w-8 text-emerald-400 mb-2" />
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="text-xs text-slate-400"
            />
            <p className="text-[11px] text-slate-500 mt-2">
              Supported CSV headers: name, phone, email, company
            </p>
          </div>

          {rows.length > 0 && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl p-3 text-xs flex items-center justify-between">
              <span>
                Ready to import <strong>{rows.length}</strong> leads
              </span>
              <CheckCircle className="h-4 w-4" />
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs text-slate-400 font-semibold">
              Duplicate Phone Handling
            </label>
            <Select value={duplicateStrategy} onValueChange={setDuplicateStrategy}>
              <SelectTrigger className="bg-slate-950 border-slate-800 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-800 text-white">
                <SelectItem value="skip">Skip duplicates (Recommended)</SelectItem>
                <SelectItem value="update">Update existing lead details</SelectItem>
                <SelectItem value="allow">Allow multiple records</SelectItem>
              </SelectContent>
            </Select>
          </div>
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
            onClick={handleImport}
            disabled={importing || rows.length === 0}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
          >
            {importing ? "Processing..." : `Import ${rows.length} Leads`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
