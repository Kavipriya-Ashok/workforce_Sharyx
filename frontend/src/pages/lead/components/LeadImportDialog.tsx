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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-bold flex items-center gap-2">
            <UploadCloud className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <span>Import {isCandidate ? "Candidates" : "Leads"} from CSV</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex flex-col items-center justify-center text-center hover:bg-slate-50 dark:hover:bg-slate-850/50 cursor-pointer transition-colors">
            <UploadCloud className="h-8 w-8 text-emerald-600 dark:text-emerald-400 mb-2" />
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="text-xs text-slate-600 dark:text-slate-400 cursor-pointer"
            />
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
              Supported CSV headers: name, phone, email, company
            </p>
          </div>

          {rows.length > 0 && (
            <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 rounded-xl p-3 text-xs flex items-center justify-between">
              <span>
                Ready to import <strong>{rows.length}</strong> {isCandidate ? "candidates" : "leads"}
              </span>
              <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs text-slate-700 dark:text-slate-300 font-semibold">
              Duplicate Phone Handling
            </label>
            <Select value={duplicateStrategy} onValueChange={setDuplicateStrategy}>
              <SelectTrigger className="bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl text-xs h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                <SelectItem value="skip">Skip duplicates (Recommended)</SelectItem>
                <SelectItem value="update">Update existing lead details</SelectItem>
                <SelectItem value="allow">Allow multiple records</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="border-t border-slate-100 dark:border-slate-800 pt-3">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          >
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={importing || rows.length === 0}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs rounded-xl"
          >
            {importing ? "Processing..." : `Import ${rows.length} Records`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
