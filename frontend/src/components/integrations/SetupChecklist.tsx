import React from 'react';
import { useLocation } from 'wouter';
import { AlertTriangle, ArrowRight, CheckCircle2, ChevronDown, Circle, Loader2, RefreshCw, XCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { integrationsService, useIntegrationStatus, type ChecklistItem } from '@/service/integrationsService';

const ICON: Record<ChecklistItem['state'], { Icon: React.ElementType; cls: string; label: string }> = {
  done: { Icon: CheckCircle2, cls: 'text-emerald-600 dark:text-emerald-400', label: 'Done' },
  pending: { Icon: Circle, cls: 'text-slate-400 dark:text-slate-500', label: 'Pending' },
  failed: { Icon: XCircle, cls: 'text-rose-600 dark:text-rose-400', label: 'Failed' },
};
const PILL: Record<ChecklistItem['state'], string> = {
  done: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300',
  pending: 'bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300',
  failed: 'bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300',
};

/**
 * Dashboard "Setup checklist": every item is Done / Pending / Failed, with a button that opens the exact place to fix it.
 * It follows the saved backend status live (polling + updates pushed from other pages and tabs), so a test run on the
 * Profile page or in the wizard is reflected here without a manual refresh.
 */
export const SetupChecklist: React.FC = () => {
  const [, setLocation] = useLocation();
  const { status, loading, error, reload } = useIntegrationStatus(20000);
  const [open, setOpen] = React.useState(true);
  const [rechecking, setRechecking] = React.useState(false);

  if (loading && !status) {
    return (
      <Card data-testid="setup-checklist" className="mb-4"><CardContent className="flex items-center gap-2 p-4 text-xs text-slate-600 dark:text-slate-400"><Loader2 className="h-4 w-4 animate-spin" /> Checking your connections…</CardContent></Card>
    );
  }
  if (!status) {
    return error ? (
      <Card data-testid="setup-checklist" className="mb-4"><CardContent className="flex items-center justify-between gap-3 p-4 text-xs text-rose-700 dark:text-rose-300"><span className="flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> {error}</span><Button size="sm" variant="outline" onClick={reload}>Try again</Button></CardContent></Card>
    ) : null;
  }

  const cl = status.checklist;
  const failed = cl.items.filter((i) => i.state === 'failed').length;
  const allDone = cl.required_done === cl.required_total && failed === 0;
  const go = (route: string) => setLocation(route);

  const recheck = async () => {
    setRechecking(true);
    try {
      // runs the live checks that apply, saves each result, then the list refreshes itself
      for (const i of status.items.filter((x) => x.configured && x.type !== 'whatsapp_webhook')) await integrationsService.test(i.type).catch(() => undefined);
      await reload();
    } finally {
      setRechecking(false);
    }
  };

  return (
    <Card data-testid="setup-checklist" className="mb-4 overflow-hidden border-slate-200 dark:border-slate-800">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center gap-3 p-4 text-left" aria-expanded={open}>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">Setup checklist</h2>
            <span data-testid="checklist-progress" className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${failed ? PILL.failed : allDone ? PILL.done : PILL.pending}`}>
              {failed ? `${failed} need${failed === 1 ? 's' : ''} attention` : allDone ? 'All set' : `${cl.required_done} of ${cl.required_total} done`}
            </span>
            {status.checking && <span className="inline-flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-400"><Loader2 className="h-3 w-3 animate-spin" /> checking…</span>}
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800" role="progressbar" aria-valuenow={cl.percent} aria-valuemin={0} aria-valuemax={100}>
            <div className={`h-full rounded-full transition-all ${failed ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${cl.percent}%` }} />
          </div>
        </div>
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <CardContent className="space-y-1 border-t border-slate-100 p-2 dark:border-slate-800 sm:p-3">
          {cl.items.map((it) => {
            const { Icon, cls, label } = ICON[it.state];
            return (
              <div key={it.key} data-testid={`check-${it.key}`} data-state={it.state} className="flex flex-col gap-2 rounded-xl p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-start gap-2.5">
                  <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${cls}`} aria-hidden />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {it.title}
                      <span className={`ml-2 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${PILL[it.state]}`}>{label}</span>
                      {it.optional && <span className="ml-1.5 text-[10px] font-medium text-slate-500 dark:text-slate-400">optional</span>}
                    </p>
                    {it.detail && <p className="mt-0.5 text-[11px] leading-snug text-slate-600 dark:text-slate-400">{it.detail}</p>}
                  </div>
                </div>
                <Button type="button" size="sm" variant={it.state === 'failed' ? 'default' : 'outline'} onClick={() => go(it.action.route)} className="h-8 shrink-0 self-start text-[11px] sm:self-center">
                  {it.action.label} <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </div>
            );
          })}
          <div className="flex justify-end px-2 pt-1">
            <Button type="button" size="sm" variant="ghost" onClick={recheck} disabled={rechecking} className="h-7 text-[11px] text-slate-600 dark:text-slate-400">
              {rechecking ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <RefreshCw className="mr-1 h-3 w-3" />} Re-check now
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
};
