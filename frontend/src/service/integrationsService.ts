import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';

export type IntegrationState = 'not_configured' | 'connected' | 'failed' | 'degraded';
export type IntegrationType = 'whatsapp' | 'whatsapp_webhook' | 'email_smtp' | 'email_imap' | 'llm' | 'voice';

export interface IntegrationItem {
  type: IntegrationType;
  label: string;
  status: IntegrationState;
  configured: boolean;
  display_name: string | null;
  last_checked_at: string | null;
  last_success_at: string | null;
  error_code: string | null;
  error_message: string | null;
  checking: boolean;
  verified: boolean;
  detail: Record<string, any>;
}

export interface ChecklistItem {
  key: string;
  title: string;
  state: 'done' | 'pending' | 'failed';
  detail: string | null;
  action: { label: string; route: string };
  optional: boolean;
}

export interface IntegrationStatusResponse {
  tenant_id: string;
  generated_at: string;
  checking: boolean;
  durable: boolean;
  onboarding: { completed: boolean; step: number; whatsapp_skipped: boolean; email_skipped: boolean };
  items: IntegrationItem[];
  checklist: { items: ChecklistItem[]; required_done: number; required_total: number; percent: number };
}

type Listener = (s: IntegrationStatusResponse) => void;
const listeners = new Set<Listener>();
let current: IntegrationStatusResponse | null = null;
const channel: BroadcastChannel | null = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('sharyx-integrations') : null;

function publish(s: IntegrationStatusResponse, broadcast = true) {
  current = s;
  listeners.forEach((l) => l(s));
  // other browser tabs of the same user update live too
  if (broadcast) channel?.postMessage({ type: 'status', payload: s });
}
if (channel) {
  channel.onmessage = (e) => {
    if (e.data?.type === 'status' && e.data.payload) publish(e.data.payload, false);
  };
}

/** Never throws a secret: the API only returns status, plain-language reasons and non-secret display values. */
export const integrationsService = {
  get current() {
    return current;
  },
  subscribe(fn: Listener) {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },
  async fetch(): Promise<IntegrationStatusResponse> {
    const res = await axios.get('/api/v1/Integrations/Status');
    publish(res.data);
    return res.data;
  },
  /** Runs the live check on the server, which SAVES the result (pass or fail); then reloads the saved status. */
  async test(type: IntegrationType) {
    await axios.post(`/api/v1/Integrations/${type}/Test`);
    return this.fetch();
  },
  async disconnect(type: IntegrationType) {
    const res = await axios.post(`/api/v1/Integrations/${type}/Disconnect`);
    publish(res.data);
    return res.data as IntegrationStatusResponse;
  },
  /** called after something else changed a connection (wizard test, save, OAuth): re-read the saved status */
  refresh() {
    return this.fetch();
  },
};

export const byType = (s: IntegrationStatusResponse | null, t: IntegrationType) => s?.items.find((i) => i.type === t) || null;

/** friendly "3 minutes ago" */
export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return 'never';
  const sec = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (sec < 45) return 'just now';
  if (sec < 3600) return `${Math.round(sec / 60)} min ago`;
  if (sec < 86400) return `${Math.round(sec / 3600)} h ago`;
  return `${Math.round(sec / 86400)} d ago`;
}

/**
 * Live integration status. Loads on mount, follows changes made elsewhere in the app/other tabs, polls every
 * `pollMs` while the tab is visible (and faster while the server says a background check is running).
 */
export function useIntegrationStatus(pollMs = 30000) {
  const [status, setStatus] = useState<IntegrationStatusResponse | null>(integrationsService.current);
  const [loading, setLoading] = useState(!integrationsService.current);
  const [error, setError] = useState<string | null>(null);
  const alive = useRef(true);

  const reload = useCallback(async () => {
    try {
      await integrationsService.fetch();
      if (alive.current) setError(null);
    } catch (e: any) {
      if (alive.current) setError(e?.response?.data?.message || 'Could not load the connection status.');
    } finally {
      if (alive.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    alive.current = true;
    const unsub = integrationsService.subscribe((s) => alive.current && setStatus(s));
    reload();
    return () => {
      alive.current = false;
      unsub();
    };
  }, [reload]);

  useEffect(() => {
    const ms = status?.checking ? 2500 : pollMs;
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') reload();
    }, ms);
    return () => clearInterval(id);
  }, [pollMs, reload, status?.checking]);

  return { status, loading, error, reload };
}
