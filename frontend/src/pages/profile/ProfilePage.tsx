import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useLocation } from 'wouter';
import { toast } from 'sonner';
import { Building2, Check, KeyRound, Loader2, Mail, MessageSquare, Mic, Pencil, PlugZap, RefreshCw, Sparkles, Trash2, Unplug, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { StatusBadge } from '@/components/integrations/StatusBadge';
import { byType, integrationsService, timeAgo, useIntegrationStatus, type IntegrationItem, type IntegrationType } from '@/service/integrationsService';
import { GOOGLE_NOT_CONFIGURED_MESSAGE, getGoogleClientId } from '@/lib/google';

interface Profile { id: string; name: string; email: string; website: string; address: string; postal_code: string; industry: string; company_size: string; logo_url: string }
const errText = (e: any, fallback: string) => {
  if (!e?.response) return 'Cannot reach the server. Check your connection and try again.';
  if (e.response.status >= 500) return 'Something went wrong on our side. Please try again.';
  const m = e.response?.data?.message || e.response?.data?.Message;
  return typeof m === 'string' && m.trim() ? m.split('\n')[0] : fallback;
};
const Field: React.FC<{ id: string; label: string; hint?: string; children: React.ReactNode }> = ({ id, label, hint, children }) => (
  <div>
    <label htmlFor={id} className="text-xs font-medium text-slate-700 dark:text-slate-300">{label}</label>
    <div className="mt-1">{children}</div>
    {hint && <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-400">{hint}</p>}
  </div>
);

// ------------------------------------------------------------------------------------------------ company profile
const CompanyProfile: React.FC = () => {
  const [p, setP] = useState<Profile | null>(null);
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  const load = () => axios.get('/api/v1/Profile').then((r) => { setP(r.data); setLoadErr(null); }).catch((e) => setLoadErr(errText(e, 'Could not load your company profile.')));
  useEffect(() => { load(); }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setSaving(true); setErr(null);
    try {
      const { id, ...body } = form;
      const r = await axios.put('/api/v1/Profile', body);
      setP(r.data); setEdit(false); toast.success('Company profile saved.');
    } catch (ex) { setErr(errText(ex, 'Could not save the profile.')); } finally { setSaving(false); }
  };
  const set = (k: keyof Profile) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => (f ? { ...f, [k]: e.target.value } : f));

  return (
    <Card id="profile" className="scroll-mt-4">
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
        <div className="flex items-center gap-3">
          {p?.logo_url ? <img src={p.logo_url} alt="Company logo" className="h-11 w-11 rounded-xl border border-slate-200 object-cover dark:border-slate-700" onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')} /> : <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300"><Building2 className="h-5 w-5" /></div>}
          <div>
            <CardTitle className="text-base">Company profile</CardTitle>
            <CardDescription>Used on your invoices, e-mails and by your AI agents.</CardDescription>
          </div>
        </div>
        {p && !edit && <Button size="sm" variant="outline" onClick={() => { setForm(p); setEdit(true); setErr(null); }}><Pencil className="mr-1.5 h-3.5 w-3.5" />Edit</Button>}
      </CardHeader>
      <CardContent>
        {loadErr && <p role="alert" className="text-xs text-rose-700 dark:text-rose-300">{loadErr} <button className="underline" onClick={load}>Try again</button></p>}
        {!p && !loadErr && <p className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400"><Loader2 className="h-4 w-4 animate-spin" />Loading…</p>}
        {p && !edit && (
          <dl data-testid="profile-view" className="grid grid-cols-1 gap-x-8 gap-y-3 text-xs sm:grid-cols-2">
            {([['Company name', p.name], ['Business email', p.email], ['Website', p.website], ['Industry', p.industry], ['Company size', p.company_size], ['Postal code', p.postal_code], ['Address', p.address]] as const).map(([k, v]) => (
              <div key={k} className={k === 'Address' ? 'sm:col-span-2' : ''}><dt className="text-[11px] uppercase tracking-wide text-slate-600 dark:text-slate-400">{k}</dt><dd className="mt-0.5 break-words font-medium text-slate-900 dark:text-slate-100">{v || <span className="text-slate-500 dark:text-slate-400">Not set</span>}</dd></div>
            ))}
          </dl>
        )}
        {edit && form && (
          <form onSubmit={save} className="space-y-3" data-testid="profile-form" noValidate>
            {err && <p role="alert" data-testid="profile-error" className="rounded-lg border border-rose-300 bg-rose-50 p-2.5 text-xs text-rose-800 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300">{err}</p>}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field id="pf-name" label="Company name *"><Input id="pf-name" maxLength={255} value={form.name} onChange={set('name')} /></Field>
              <Field id="pf-email" label="Business email *"><Input id="pf-email" type="email" maxLength={255} value={form.email} onChange={set('email')} /></Field>
              <Field id="pf-web" label="Website" hint="e.g. https://example.com"><Input id="pf-web" maxLength={255} value={form.website} onChange={set('website')} /></Field>
              <Field id="pf-ind" label="Industry"><Input id="pf-ind" maxLength={100} value={form.industry} onChange={set('industry')} /></Field>
              <Field id="pf-size" label="Company size"><Input id="pf-size" maxLength={50} value={form.company_size} onChange={set('company_size')} /></Field>
              <Field id="pf-zip" label="Postal code *"><Input id="pf-zip" maxLength={20} value={form.postal_code} onChange={set('postal_code')} /></Field>
              <div className="sm:col-span-2"><Field id="pf-addr" label="Address *"><Input id="pf-addr" maxLength={500} value={form.address} onChange={set('address')} /></Field></div>
              <div className="sm:col-span-2"><Field id="pf-logo" label="Logo (https image link)" hint="Leave empty to remove the logo."><Input id="pf-logo" maxLength={500} placeholder="https://…/logo.png" value={form.logo_url} onChange={set('logo_url')} /></Field></div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="ghost" size="sm" onClick={() => setEdit(false)} disabled={saving}><X className="mr-1 h-3.5 w-3.5" />Cancel</Button>
              <Button type="submit" size="sm" disabled={saving}>{saving ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Saving…</> : <><Check className="mr-1 h-3.5 w-3.5" />Save changes</>}</Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
};

// ------------------------------------------------------------------------------------------------ integration row
const ROW_ICON: Record<IntegrationType, React.ElementType> = { whatsapp: MessageSquare, whatsapp_webhook: PlugZap, email_smtp: Mail, email_imap: Mail, llm: Sparkles, voice: Mic };

const Row: React.FC<{ item: IntegrationItem; subtitle?: string; busy: string | null; actions: React.ReactNode; extra?: React.ReactNode }> = ({ item, subtitle, busy, actions, extra }) => {
  const Icon = ROW_ICON[item.type];
  return (
    <div data-testid={`int-${item.type}`} data-state={item.status} className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
      <div className="flex flex-wrap items-start gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"><Icon className="h-4 w-4" /></div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{subtitle || item.label}</p>
            <p className="mt-0.5 break-all text-[11px] text-slate-600 dark:text-slate-400">{item.configured ? item.display_name || 'Saved' : 'Not connected yet'}</p>
          </div>
        </div>
        <StatusBadge state={item.status} checking={item.checking || busy === item.type} />
      </div>
      {item.configured && (
        <p className="mt-2 text-[11px] text-slate-600 dark:text-slate-400" data-testid="last-checked">
          Last checked: <span className="font-medium">{item.last_checked_at ? `${timeAgo(item.last_checked_at)}` : 'not checked yet'}</span>
          {item.last_success_at && item.status !== 'connected' && <> · last worked {timeAgo(item.last_success_at)}</>}
        </p>
      )}
      {item.error_message && item.configured && (
        <p role="alert" data-testid="int-error" className={`mt-2 rounded-lg border p-2 text-[11px] leading-snug ${item.status === 'failed' ? 'border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200' : 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200'}`}>{item.error_message}</p>
      )}
      {extra}
      <div className="mt-3 flex flex-wrap gap-2">{actions}</div>
    </div>
  );
};

// ------------------------------------------------------------------------------------------------ edit dialogs
const WhatsAppDialog: React.FC<{ open: boolean; onClose: () => void; detail: Record<string, any> }> = ({ open, onClose, detail }) => {
  const [f, setF] = useState({ phone_number: '', phone_number_id: '', waba_id: '', access_token: '', app_secret: '' });
  const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null);
  useEffect(() => { if (open) { setF({ phone_number: detail.phone_number || '', phone_number_id: detail.phone_number_id || '', waba_id: detail.waba_id || '', access_token: '', app_secret: '' }); setErr(null); } }, [open, detail]);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr(null);
    try {
      const body: any = { phone_number: f.phone_number, phone_number_id: f.phone_number_id, waba_id: f.waba_id || undefined, provider: 'meta_cloud' };
      if (f.access_token) body.access_token = f.access_token; if (f.app_secret) body.app_secret = f.app_secret;
      await axios.post('/api/v1/WhatsApp/Test-Connection', body);
      toast.success('WhatsApp connected.'); onClose();
    } catch (ex) { setErr(errText(ex, 'WhatsApp could not verify these details.')); } finally { await integrationsService.refresh().catch(() => undefined); setBusy(false); }
  };
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF((x) => ({ ...x, [k]: e.target.value }));
  return (
    <Dialog open={open} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent data-testid="wa-dialog">
        <DialogHeader><DialogTitle>WhatsApp connection</DialogTitle><DialogDescription>We test the details with Meta and save the result. Secrets you saved earlier are never shown; leave a box empty to keep it.</DialogDescription></DialogHeader>
        <form onSubmit={submit} className="space-y-3" noValidate>
          {err && <p role="alert" data-testid="dialog-error" className="rounded-lg border border-rose-300 bg-rose-50 p-2.5 text-xs text-rose-800 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300">{err}</p>}
          <Field id="wa-phone" label="WhatsApp number *"><Input id="wa-phone" value={f.phone_number} onChange={set('phone_number')} maxLength={30} placeholder="+1 555 010 0100" /></Field>
          <Field id="wa-pid" label="Phone Number ID *"><Input id="wa-pid" value={f.phone_number_id} onChange={set('phone_number_id')} maxLength={100} /></Field>
          <Field id="wa-waba" label="WhatsApp Business Account ID"><Input id="wa-waba" value={f.waba_id} onChange={set('waba_id')} maxLength={100} /></Field>
          <Field id="wa-token" label="Access token" hint={detail.has_access_token ? 'A token is saved. Paste a new one only to replace it.' : 'Required for a new connection.'}><Input id="wa-token" type="password" autoComplete="off" value={f.access_token} onChange={set('access_token')} placeholder={detail.has_access_token ? '•••••••• saved' : 'EAAG…'} maxLength={1024} /></Field>
          <Field id="wa-secret" label="Meta App Secret" hint="Lets us reject fake incoming messages. Leave empty to keep the saved one."><Input id="wa-secret" type="password" autoComplete="off" value={f.app_secret} onChange={set('app_secret')} placeholder={detail.has_app_secret ? '•••••••• saved' : ''} maxLength={256} /></Field>
          <div className="flex justify-end gap-2"><Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={busy}>Cancel</Button><Button type="submit" size="sm" disabled={busy}>{busy ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Testing…</> : 'Save & test'}</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const EmailDialog: React.FC<{ open: boolean; onClose: () => void; detail: Record<string, any>; imapDetail: Record<string, any> }> = ({ open, onClose, detail, imapDetail }) => {
  const [f, setF] = useState({ email_address: '', smtp_host: '', smtp_port: '587', smtp_user: '', smtp_password: '', imap_host: '', imap_port: '993' });
  const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null);
  useEffect(() => { if (open) { setF({ email_address: detail.email_address || '', smtp_host: detail.smtp_host || 'smtp.gmail.com', smtp_port: String(detail.smtp_port || 587), smtp_user: '', smtp_password: '', imap_host: imapDetail.provider === 'google-email' ? '' : imapDetail.imap_host || 'imap.gmail.com', imap_port: String(imapDetail.imap_port || 993) }); setErr(null); } }, [open, detail, imapDetail]);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF((x) => ({ ...x, [k]: e.target.value }));
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr(null);
    try {
      const body: any = { email_address: f.email_address, smtp_host: f.smtp_host, smtp_port: Number(f.smtp_port), smtp_user: f.smtp_user || f.email_address, imap_host: f.imap_host || undefined, imap_port: Number(f.imap_port), use_ssl: true, provider: 'smtp' };
      if (f.smtp_password) body.smtp_password = f.smtp_password;
      await axios.post('/api/v1/Email/Test-Connection', body);
      toast.success('Email connected.'); onClose();
    } catch (ex) { setErr(errText(ex, 'The mail server did not accept these details.')); } finally { await integrationsService.refresh().catch(() => undefined); setBusy(false); }
  };
  const google = () => {
    const id = getGoogleClientId();
    if (!id) { setErr(GOOGLE_NOT_CONFIGURED_MESSAGE); return; }
    try { sessionStorage.setItem('sharyx_oauth_return', '/admin/profile#email'); } catch { /* ignore */ }
    const redirect = encodeURIComponent(`${window.location.origin}/oauth/callback`);
    const scope = encodeURIComponent('https://mail.google.com/ https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/gmail.send openid email profile');
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(id)}&redirect_uri=${redirect}&response_type=code&scope=${scope}&access_type=offline&prompt=consent`;
  };
  return (
    <Dialog open={open} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent data-testid="email-dialog">
        <DialogHeader><DialogTitle>Email connection</DialogTitle><DialogDescription>Sending (SMTP) and the inbox (IMAP) are tested separately. A saved password is never shown; leave it empty to keep it.</DialogDescription></DialogHeader>
        <Button type="button" variant="outline" size="sm" onClick={google} className="w-full"><Mail className="mr-2 h-4 w-4" />Reconnect with Google instead</Button>
        <form onSubmit={submit} className="space-y-3" noValidate>
          {err && <p role="alert" data-testid="dialog-error" className="rounded-lg border border-rose-300 bg-rose-50 p-2.5 text-xs text-rose-800 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300">{err}</p>}
          <Field id="em-addr" label="Mailbox address *"><Input id="em-addr" type="email" value={f.email_address} onChange={set('email_address')} maxLength={150} /></Field>
          <div className="grid grid-cols-3 gap-3"><div className="col-span-2"><Field id="em-host" label="SMTP host *"><Input id="em-host" value={f.smtp_host} onChange={set('smtp_host')} maxLength={253} /></Field></div><Field id="em-port" label="Port"><Input id="em-port" inputMode="numeric" value={f.smtp_port} onChange={set('smtp_port')} /></Field></div>
          <Field id="em-user" label="Username" hint="Usually the same as the mailbox address."><Input id="em-user" value={f.smtp_user} onChange={set('smtp_user')} maxLength={150} placeholder={f.email_address} /></Field>
          <Field id="em-pass" label="Password / App password" hint={detail.has_password ? 'A password is saved. Type a new one only to replace it.' : 'For Gmail use a 16-character App Password.'}><Input id="em-pass" type="password" autoComplete="off" value={f.smtp_password} onChange={set('smtp_password')} placeholder={detail.has_password ? '•••••••• saved' : ''} maxLength={256} /></Field>
          <div className="grid grid-cols-3 gap-3"><div className="col-span-2"><Field id="em-ihost" label="IMAP host (inbox)"><Input id="em-ihost" value={f.imap_host} onChange={set('imap_host')} maxLength={253} /></Field></div><Field id="em-iport" label="Port"><Input id="em-iport" inputMode="numeric" value={f.imap_port} onChange={set('imap_port')} /></Field></div>
          <div className="flex justify-end gap-2"><Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={busy}>Cancel</Button><Button type="submit" size="sm" disabled={busy}>{busy ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Testing…</> : 'Save & test'}</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// ------------------------------------------------------------------------------------------------ page
export const ProfilePage: React.FC = () => {
  const [, setLocation] = useLocation();
  const { status, loading, error, reload } = useIntegrationStatus(30000);
  const [busy, setBusy] = useState<string | null>(null);
  const [dialog, setDialog] = useState<'wa' | 'email' | null>(null);
  const [confirm, setConfirm] = useState<IntegrationType | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);

  // deep links from the dashboard checklist: /admin/profile#whatsapp etc.
  useEffect(() => {
    const id = window.location.hash.replace('#', '');
    if (!id || !status) return;
    const t = setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
    return () => clearTimeout(t);
  }, [status?.generated_at ? 'ready' : 'wait']); // eslint-disable-line react-hooks/exhaustive-deps

  const get = (t: IntegrationType) => byType(status, t);
  const test = async (t: IntegrationType) => {
    setBusy(t);
    try { const s = await integrationsService.test(t); const it = byType(s, t); toast[it?.status === 'connected' ? 'success' : 'error'](it?.status === 'connected' ? 'Connection works.' : it?.error_message || 'The check did not pass.'); }
    catch (e) { toast.error(errText(e, 'Could not run the check.')); } finally { setBusy(null); }
  };
  const doDisconnect = async () => {
    if (!confirm) return; setDisconnecting(true);
    try { await integrationsService.disconnect(confirm); toast.success('Disconnected. The saved keys were erased and nothing will be sent.'); setConfirm(null); }
    catch (e) { toast.error(errText(e, 'Could not disconnect.')); } finally { setDisconnecting(false); }
  };

  const wa = get('whatsapp'), hook = get('whatsapp_webhook'), smtp = get('email_smtp'), imap = get('email_imap'), llm = get('llm'), voice = get('voice');
  const act = (t: IntegrationType, item: IntegrationItem, edit: () => void, opts?: { editLabel?: string }) => (
    <>
      <Button size="sm" variant="outline" className="h-8 text-[11px]" disabled={!item.configured || busy === t} onClick={() => test(t)} data-testid={`test-${t}`}>{busy === t ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <RefreshCw className="mr-1 h-3 w-3" />}Test again</Button>
      <Button size="sm" variant="outline" className="h-8 text-[11px]" onClick={edit} data-testid={`edit-${t}`}><Pencil className="mr-1 h-3 w-3" />{opts?.editLabel || (item.configured ? 'Edit' : 'Connect')}</Button>
      {item.configured && (item.status === 'failed' || item.status === 'degraded') && <Button size="sm" className="h-8 text-[11px]" onClick={edit} data-testid={`reconnect-${t}`}><PlugZap className="mr-1 h-3 w-3" />Reconnect</Button>}
      {item.configured && <Button size="sm" variant="ghost" className="h-8 text-[11px] text-rose-700 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-500/10" onClick={() => setConfirm(t)} data-testid={`disconnect-${t}`}><Unplug className="mr-1 h-3 w-3" />Disconnect</Button>}
    </>
  );
  const labels: Partial<Record<IntegrationType, string>> = { whatsapp: 'WhatsApp', whatsapp_webhook: 'WhatsApp', email_smtp: 'email', email_imap: 'email', llm: 'AI key', voice: 'voice provider' };

  const Saved: React.FC<{ on: boolean; what: string }> = ({ on, what }) => (
    <p className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-300"><KeyRound className="h-3 w-3" />{what}: {on ? <span data-testid="key-saved" className="font-bold text-emerald-700 dark:text-emerald-300">saved</span> : <span className="text-slate-500 dark:text-slate-400">not saved</span>}</p>
  );

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5" data-testid="profile-page">
      <div>
        <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">Company profile &amp; integrations</h1>
        <p className="mt-1 text-xs text-slate-700 dark:text-slate-300">Everything connected to your account, with the real, saved status of each connection.</p>
      </div>
      <CompanyProfile />

      <section aria-labelledby="int-h" className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 id="int-h" className="text-sm font-extrabold text-slate-900 dark:text-white">Integrations</h2>
          <Button size="sm" variant="ghost" className="h-8 text-[11px]" onClick={reload}><RefreshCw className="mr-1 h-3 w-3" />Refresh</Button>
        </div>
        {error && !status && <p role="alert" className="text-xs text-rose-700 dark:text-rose-300">{error}</p>}
        {loading && !status && <p className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400"><Loader2 className="h-4 w-4 animate-spin" />Loading connection status…</p>}
        {status && wa && hook && smtp && imap && llm && voice && (
          <div className="space-y-4">
            <Card id="whatsapp" className="scroll-mt-4"><CardHeader className="pb-3"><CardTitle className="text-sm">WhatsApp</CardTitle><CardDescription>Meta WhatsApp Cloud API: sending/receiving, and the webhook that delivers incoming messages.</CardDescription></CardHeader>
              <CardContent className="space-y-3">
                <Row item={wa} subtitle="WhatsApp API (sending)" busy={busy} extra={<Saved on={!!wa.detail.has_access_token} what="Access token" />} actions={act('whatsapp', wa, () => setDialog('wa'))} />
                <Row item={hook} subtitle="Webhook (incoming messages)" busy={busy} extra={hook.configured ? <p className="mt-2 text-[11px] text-slate-600 dark:text-slate-400">Verify token: <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">{hook.detail.verify_token || '—'}</code> · App secret: {hook.detail.has_app_secret ? <b className="text-emerald-700 dark:text-emerald-300">saved</b> : <b className="text-amber-700 dark:text-amber-300">not saved</b>}</p> : null} actions={<Button size="sm" variant="outline" className="h-8 text-[11px]" disabled={!hook.configured || busy === 'whatsapp_webhook'} onClick={() => test('whatsapp_webhook')}><RefreshCw className="mr-1 h-3 w-3" />Test again</Button>} />
              </CardContent></Card>
            <Card id="email" className="scroll-mt-4"><CardHeader className="pb-3"><CardTitle className="text-sm">Email</CardTitle><CardDescription>Sending (SMTP / Google) and reading your inbox (IMAP / Gmail) are checked separately.</CardDescription></CardHeader>
              <CardContent className="space-y-3">
                <Row item={smtp} subtitle="Sending (SMTP / Google)" busy={busy} extra={<Saved on={!!smtp.detail.has_password || smtp.detail.provider === 'google-email'} what={smtp.detail.provider === 'google-email' ? 'Google sign-in' : 'Password'} />} actions={act('email_smtp', smtp, () => setDialog('email'))} />
                <Row item={imap} subtitle="Inbox (IMAP / Gmail)" busy={busy} actions={act('email_imap', imap, () => setDialog('email'))} />
              </CardContent></Card>
            <Card id="llm" className="scroll-mt-4"><CardHeader className="pb-3"><CardTitle className="text-sm">AI model key</CardTitle><CardDescription>Your own OpenAI / Gemini key for the AI agents. If you add none, the platform key is used.</CardDescription></CardHeader>
              <CardContent><Row item={llm} busy={busy} extra={<Saved on={!!llm.detail.has_key} what="API key" />} actions={act('llm', llm, () => setLocation('/admin/whatsapp/brain'), { editLabel: llm.configured ? 'Edit in AI Brain' : 'Add key' })} /></CardContent></Card>
            <Card id="voice" className="scroll-mt-4"><CardHeader className="pb-3"><CardTitle className="text-sm">Voice AI</CardTitle><CardDescription>Phone calls through your voice provider.</CardDescription></CardHeader>
              <CardContent><Row item={voice} busy={busy} extra={<Saved on={!!voice.detail.has_key} what="API key" />} actions={act('voice', voice, () => setLocation('/admin/voice'), { editLabel: voice.configured ? 'Edit in Voice AI' : 'Connect' })} /></CardContent></Card>
          </div>
        )}
      </section>

      <WhatsAppDialog open={dialog === 'wa'} onClose={() => setDialog(null)} detail={{ ...(wa?.detail || {}), has_app_secret: hook?.detail?.has_app_secret }} />
      <EmailDialog open={dialog === 'email'} onClose={() => setDialog(null)} detail={smtp?.detail || {}} imapDetail={imap?.detail || {}} />

      <Dialog open={!!confirm} onOpenChange={(o) => !o && !disconnecting && setConfirm(null)}>
        <DialogContent data-testid="disconnect-dialog">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Trash2 className="h-4 w-4 text-rose-600" />Disconnect {confirm ? labels[confirm] : ''}?</DialogTitle><DialogDescription>The saved keys and passwords are erased and nothing will be sent or read through it. You can connect again later with fresh details.</DialogDescription></DialogHeader>
          <div className="flex justify-end gap-2"><Button variant="ghost" size="sm" onClick={() => setConfirm(null)} disabled={disconnecting}>Keep it connected</Button><Button size="sm" onClick={doDisconnect} disabled={disconnecting} data-testid="confirm-disconnect" className="bg-rose-600 text-white hover:bg-rose-700">{disconnecting ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Disconnecting…</> : 'Yes, disconnect'}</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProfilePage;
