import React from 'react';
import { AlertTriangle, CheckCircle2, CircleSlash, Loader2, XCircle } from 'lucide-react';
import type { IntegrationState } from '@/service/integrationsService';

const STYLE: Record<IntegrationState, { text: string; cls: string; Icon: React.ElementType }> = {
  connected: { text: 'Connected', cls: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/40', Icon: CheckCircle2 },
  failed: { text: 'Failed', cls: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/40', Icon: XCircle },
  degraded: { text: 'Degraded', cls: 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/40', Icon: AlertTriangle },
  not_configured: { text: 'Not connected', cls: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-500/15 dark:text-slate-300 dark:border-slate-500/40', Icon: CircleSlash },
};

/** Colour + icon + text (never colour alone), so it reads for colour-blind users and in light and dark. */
export const StatusBadge: React.FC<{ state: IntegrationState; checking?: boolean; className?: string }> = ({ state, checking, className = '' }) => {
  const s = STYLE[state];
  return (
    <span
      data-testid="status-badge"
      data-state={state}
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-bold ${s.cls} ${className}`}
    >
      {checking ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <s.Icon className="h-3.5 w-3.5" aria-hidden />}
      {checking ? 'Checking…' : s.text}
    </span>
  );
};
