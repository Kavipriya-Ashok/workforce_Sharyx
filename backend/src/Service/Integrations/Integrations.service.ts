import { BadRequestException, ConflictException, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import axios from 'axios';
import { company } from '@Database/Table/Admin/company';
import { WhatsAppConfig } from '@Database/Table/WhatsApp/WhatsAppConfig.entity';
import { EmailAccountConfig } from '@Database/Table/Email/EmailAccountConfig.entity';
import { WhatsAppAIConfig } from '@Database/Table/WhatsApp/WhatsAppAIConfig.entity';
import { EmailAIConfig } from '@Database/Table/Email/EmailAIConfig.entity';
import { VoiceProviderConfig } from '@Database/Table/Voice/VoiceProviderConfig.entity';
import { WhatsAppService } from '../../WhatsApp/Services/WhatsApp.service';
import { EmailService } from '../../Email/Services/Email.service';
import { VoiceConfigService } from '../../Voice/Services/VoiceConfig.service';
import { redactSecrets } from '@Helper/Redact';
import {
  INTEGRATION_TYPES,
  IntegrationState,
  IntegrationType,
  StatusRow,
  classifyError,
  getAllStatuses,
  markConnected,
  markDegraded,
  markFailed,
  markNotConfigured,
  usingMemoryFallback,
} from './IntegrationStatus';

const HOUR = 3_600_000;
/** Status older than this is re-checked in the background when the status page loads (env override for tests). */
const staleMs = () => Number(process.env.INTEGRATIONS_STALE_MS) || 6 * HOUR;
/** A tenant is queued for a background re-check at most once per this window (protects Meta / mail servers). */
const cooldownMs = () => Number(process.env.INTEGRATIONS_RECHECK_COOLDOWN_MS) || 10 * 60_000;
const MAX_QUEUED_TENANTS = 50;

interface Descriptor {
  configured: boolean;
  display?: string | null;
  detail?: Record<string, any>;
}

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
  /** true while a background check for this tenant is queued/running */
  checking: boolean;
  /** false => no check has ever been recorded for the current credentials (status is the legacy flag) */
  verified: boolean;
  detail: Record<string, any>;
}

const LABELS: Record<IntegrationType, string> = {
  whatsapp: 'WhatsApp (Meta Cloud API)',
  whatsapp_webhook: 'WhatsApp webhook (incoming messages)',
  email_smtp: 'Email sending (SMTP / Google)',
  email_imap: 'Email inbox (IMAP / Gmail)',
  llm: 'AI model key (LLM)',
  voice: 'Voice AI provider',
};

@Injectable()
export class IntegrationsService {
  private readonly logger = new Logger(IntegrationsService.name);
  private readonly queueState = new Map<string, { queuedAt: number; running: boolean }>();
  private chain: Promise<void> = Promise.resolve();
  private queuedCount = 0;

  constructor(
    private readonly whatsApp: WhatsAppService,
    private readonly email: EmailService,
    private readonly voice: VoiceConfigService
  ) {}

  private requireTenant(tenantId: string | null | undefined): string {
    if (!tenantId || tenantId === 'all' || tenantId === 'default') {
      throw new BadRequestException('Select a specific tenant to manage its integrations.');
    }
    return tenantId;
  }

  // ------------------------------------------------------------------------------------------ descriptors
  private async describe(tenant: string, hasRow: (t: IntegrationType) => boolean): Promise<Record<IntegrationType, Descriptor>> {
    const [wa, mail, waAi, mailAi, voiceRows] = await Promise.all([
      WhatsAppConfig.findOne({ where: { tenant_id: tenant, status: true } }),
      EmailAccountConfig.findOne({ where: { tenant_id: tenant, is_active: true } }),
      WhatsAppAIConfig.findOne({ where: { tenant_id: tenant } }),
      EmailAIConfig.findOne({ where: { tenant_id: tenant } }),
      VoiceProviderConfig.find({ where: { tenant_id: tenant } }),
    ]);

    const waConfigured = !!(wa && wa.access_token && wa.phone_number_id && (wa.is_connected || hasRow('whatsapp')));
    const isGoogle = mail?.provider === 'google-email';
    const smtpConfigured = !!mail && (isGoogle ? !!mail.refresh_token : !!(mail.smtp_host && mail.smtp_password));
    const imapHost = mail ? mail.imap_host || this.email.guessImapHost(mail.smtp_host) : null;
    const imapConfigured = !!mail && (isGoogle ? !!mail.refresh_token : !!(imapHost && mail.smtp_password));
    const llmCfg = waAi?.api_key ? { p: waAi.llm_provider, m: waAi.llm_model } : mailAi?.api_key ? { p: mailAi.llm_provider, m: (mailAi as any).llm_model } : null;
    const voiceCfg = voiceRows.find((v) => v.api_key && v.is_active);

    return {
      whatsapp: {
        configured: waConfigured,
        display: wa?.phone_number || null,
        detail: wa ? { provider: wa.provider, phone_number: wa.phone_number, phone_number_id: wa.phone_number_id, waba_id: wa.waba_id, has_access_token: !!wa.access_token } : {},
      },
      whatsapp_webhook: {
        configured: waConfigured,
        display: null,
        detail: wa ? { verify_token: wa.verify_token, has_app_secret: !!wa.app_secret || !!process.env.META_APP_SECRET } : {},
      },
      email_smtp: {
        configured: smtpConfigured,
        display: mail?.email_address || null,
        detail: mail ? { provider: mail.provider, email_address: mail.email_address, smtp_host: mail.smtp_host, smtp_port: mail.smtp_port, has_password: !!mail.smtp_password } : {},
      },
      email_imap: {
        configured: imapConfigured,
        display: mail?.email_address || null,
        detail: mail ? { provider: mail.provider, email_address: mail.email_address, imap_host: isGoogle ? 'Gmail API' : imapHost, imap_port: mail.imap_port } : {},
      },
      llm: {
        configured: !!llmCfg,
        display: llmCfg ? `${llmCfg.p}${llmCfg.m ? ' · ' + llmCfg.m : ''}` : null,
        detail: { provider: llmCfg?.p, model: llmCfg?.m, has_key: !!llmCfg, platform_key_available: !!(process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY) },
      },
      voice: {
        configured: !!voiceCfg,
        display: voiceCfg ? `${voiceCfg.provider}${voiceCfg.caller_id ? ' · ' + voiceCfg.caller_id : ''}` : null,
        detail: { provider: voiceCfg?.provider, caller_id: voiceCfg?.caller_id, has_key: !!voiceCfg },
      },
    };
  }

  // ------------------------------------------------------------------------------------------ status
  async getStatus(tenantIdIn: string | null) {
    const tenant = this.requireTenant(tenantIdIn);
    const rows = await getAllStatuses(tenant);
    const desc = await this.describe(tenant, (t) => !!rows[t]);
    const state = this.queueState.get(tenant);

    const items: IntegrationItem[] = INTEGRATION_TYPES.map((type) => {
      const d = desc[type];
      const row: StatusRow | undefined = rows[type];
      let status: IntegrationState;
      let verified = true;
      let errorCode: string | null = null;
      let errorMessage: string | null = null;
      if (!d.configured) {
        status = 'not_configured';
      } else if (row && row.status !== 'not_configured') {
        status = row.status;
        errorCode = row.error_code;
        errorMessage = row.error_message;
      } else if (type === 'whatsapp_webhook') {
        status = 'degraded';
        verified = false;
        errorCode = 'WEBHOOK_UNVERIFIED';
        errorMessage = "Meta has not confirmed the webhook yet. Paste the callback URL and verify token into your Meta app, then send a test message.";
      } else {
        status = 'connected'; // legacy flag; no check recorded yet, a background check is queued below
        verified = false;
      }
      return {
        type,
        label: LABELS[type],
        status,
        configured: d.configured,
        display_name: d.configured ? row?.display_name || d.display || null : null,
        last_checked_at: d.configured && row?.last_checked_at ? row.last_checked_at.toISOString() : null,
        last_success_at: d.configured && row?.last_success_at ? row.last_success_at.toISOString() : null,
        error_code: errorCode,
        error_message: errorMessage,
        checking: !!state?.running,
        verified,
        detail: d.detail || {},
      };
    });

    // Safe re-check: one queued background run per tenant, rate limited, never blocks this response.
    const stale = items
      .filter((i) => i.configured && i.type !== 'whatsapp_webhook')
      .filter((i) => !i.last_checked_at || Date.now() - new Date(i.last_checked_at).getTime() > staleMs())
      .map((i) => i.type);
    const queued = this.maybeQueue(tenant, stale, false);
    if (queued) for (const i of items) if (stale.includes(i.type)) i.checking = true;

    const company_ = await company.findOne({ where: { id: tenant } });
    const od: Record<string, any> = company_?.onboarding_data || {};
    return {
      tenant_id: tenant,
      generated_at: new Date().toISOString(),
      durable: !usingMemoryFallback(),
      checking: items.some((i) => i.checking),
      onboarding: {
        completed: !!company_?.onboarding_completed,
        step: company_?.onboarding_step || 1,
        whatsapp_skipped: !!od.whatsapp_skipped,
        email_skipped: !!od.email_skipped,
      },
      items,
      checklist: this.buildChecklist(items, company_, od),
    };
  }

  private buildChecklist(items: IntegrationItem[], c: company | null, od: Record<string, any>) {
    const by = (t: IntegrationType) => items.find((i) => i.type === t)!;
    const onboarding = !!c?.onboarding_completed;
    const fix = (anchor: string, step?: number) => (!onboarding && step ? `/onboarding?step=${step}` : `/admin/profile#${anchor}`);
    const mapState = (i: IntegrationItem): 'done' | 'pending' | 'failed' =>
      !i.configured ? 'pending' : i.status === 'connected' ? 'done' : i.status === 'failed' ? 'failed' : 'pending';

    const profileDone = !!(c && c.name && c.email && c.address && c.postal_code);
    const wa = by('whatsapp'), hook = by('whatsapp_webhook'), smtp = by('email_smtp'), imap = by('email_imap'), llm = by('llm'), voice = by('voice');
    const emailState: 'done' | 'pending' | 'failed' =
      smtp.status === 'failed' || imap.status === 'failed' ? 'failed' : smtp.configured && smtp.status === 'connected' && imap.configured && imap.status === 'connected' ? 'done' : 'pending';
    const emailDetail =
      smtp.status === 'failed' ? smtp.error_message : imap.status === 'failed' ? imap.error_message
      : !smtp.configured ? (od.email_skipped ? 'Skipped during setup. Connect a mailbox to send and read email.' : 'No mailbox connected yet.')
      : !imap.configured ? 'Sending works; the inbox (IMAP) is not connected so replies are not read.'
      : emailState === 'done' ? `${smtp.display_name} is sending and receiving.` : 'Checking the mailbox…';

    const list = [
      { key: 'profile', title: 'Company profile', state: profileDone ? 'done' : 'pending', detail: profileDone ? c!.name : 'Add your company name, email and address.', action: { label: profileDone ? 'Edit profile' : 'Complete profile', route: '/admin/profile#profile' }, optional: false },
      { key: 'whatsapp', title: 'WhatsApp connected', state: mapState(wa), detail: wa.status === 'failed' || wa.status === 'degraded' ? wa.error_message : !wa.configured ? (od.whatsapp_skipped ? 'Skipped during setup. Connect WhatsApp to chat with customers.' : 'WhatsApp is not connected yet.') : `${wa.display_name || 'WhatsApp'} is connected.`, action: { label: wa.status === 'failed' ? 'Fix connection' : wa.configured ? 'Manage' : 'Connect WhatsApp', route: fix('whatsapp', 9) }, optional: false },
      { key: 'whatsapp_webhook', title: 'WhatsApp messages arriving', state: !hook.configured ? 'pending' : hook.status === 'connected' ? 'done' : hook.status === 'failed' ? 'failed' : 'pending', detail: !hook.configured ? 'Connect WhatsApp first.' : hook.status === 'connected' ? 'Meta is delivering incoming messages.' : hook.error_message, action: { label: hook.status === 'failed' ? 'Fix webhook' : 'View webhook', route: '/admin/profile#whatsapp' }, optional: false },
      { key: 'email', title: 'Email (sending + inbox)', state: emailState, detail: emailDetail, action: { label: emailState === 'failed' ? 'Fix connection' : smtp.configured ? 'Manage' : 'Connect email', route: fix('email', 10) }, optional: false },
      { key: 'llm', title: 'AI model key', state: mapState(llm), detail: llm.status === 'failed' || llm.status === 'degraded' ? llm.error_message : llm.configured ? `${llm.display_name} key works.` : 'Optional: add your own AI key (otherwise the platform key is used).', action: { label: llm.configured ? 'Manage' : 'Add key', route: '/admin/profile#llm' }, optional: true },
      { key: 'voice', title: 'Voice AI provider', state: mapState(voice), detail: voice.status === 'failed' || voice.status === 'degraded' ? voice.error_message : voice.configured ? `${voice.display_name} is connected.` : 'Optional: connect a voice provider to take phone calls.', action: { label: voice.configured ? 'Manage' : 'Connect voice', route: '/admin/profile#voice' }, optional: true },
    ];
    const required = list.filter((l) => !l.optional);
    const done = required.filter((l) => l.state === 'done').length;
    return { items: list, required_done: done, required_total: required.length, percent: Math.round((done / required.length) * 100) };
  }

  // ------------------------------------------------------------------------------------------ test
  /** Runs the live check for one integration, SAVES the outcome (pass or fail) and returns the stored status. */
  async test(tenantIdIn: string | null, type: IntegrationType, userId?: string) {
    const tenant = this.requireTenant(tenantIdIn);
    await this.runCheck(tenant, type, userId, true);
    const status = await this.getStatus(tenant);
    return { item: status.items.find((i) => i.type === type), checklist: status.checklist };
  }

  /** The actual check for one type; records status itself. With `strict` a not-connected integration is a 400. */
  private async runCheck(tenant: string, type: IntegrationType, userId: string | undefined, strict: boolean) {
    const rows = await getAllStatuses(tenant);
    const desc = (await this.describe(tenant, (t) => !!rows[t]))[type];
    if (!desc.configured) {
      if (strict) throw new BadRequestException(`${LABELS[type]} is not connected yet. Connect it first.`);
      return;
    }
    switch (type) {
      case 'whatsapp': {
        const cfg = await WhatsAppConfig.findOne({ where: { tenant_id: tenant } });
        if (!cfg) return;
        try {
          await this.whatsApp.testConnection(
            { phone_number: cfg.phone_number, phone_number_id: cfg.phone_number_id, waba_id: cfg.waba_id, provider: cfg.provider, api_url: cfg.api_url } as any,
            userId,
            tenant
          );
        } catch (e: any) {
          if (e instanceof ConflictException) throw e; // anything else was already recorded as Failed/Degraded
        }
        return;
      }
      case 'whatsapp_webhook': {
        const cfg = await WhatsAppConfig.findOne({ where: { tenant_id: tenant } });
        const prev = rows.whatsapp_webhook;
        if (!cfg?.app_secret && !process.env.META_APP_SECRET) {
          await markDegraded(tenant, 'whatsapp_webhook', 'WEBHOOK_NO_SECRET', 'No Meta App Secret is saved, so incoming messages cannot be verified. Add it, then send a test message.');
        } else if (prev?.status === 'connected' || prev?.last_success_at) {
          await markConnected(tenant, 'whatsapp_webhook', prev?.display_name || 'Receiving messages from Meta');
        } else {
          await markDegraded(tenant, 'whatsapp_webhook', 'WEBHOOK_UNVERIFIED', "Meta has not confirmed the webhook yet. Paste the callback URL and verify token into your Meta app, then send a test message.");
        }
        return;
      }
      case 'email_smtp':
      case 'email_imap': {
        const cfg = await this.email.getConfigAny(tenant);
        if (!cfg) return;
        const r = type === 'email_smtp' ? await this.email.checkSmtp(cfg) : await this.email.checkImap(cfg);
        const name = cfg.email_address;
        if (r.ok) await markConnected(tenant, type, name);
        else if (r.status === 'not_configured') await markNotConfigured(tenant, type);
        else if (r.status === 'degraded') await markDegraded(tenant, type, r.code || 'EMAIL_ERROR', r.message, name);
        else await markFailed(tenant, type, r.code || 'EMAIL_ERROR', r.message, name);
        return;
      }
      case 'llm': {
        const wa = await WhatsAppAIConfig.findOne({ where: { tenant_id: tenant } });
        const em = await EmailAIConfig.findOne({ where: { tenant_id: tenant } });
        const src = wa?.api_key ? wa : em?.api_key ? em : null;
        if (!src) return;
        await this.checkLlm(tenant, src.llm_provider, src.api_key, `${src.llm_provider}`);
        return;
      }
      case 'voice': {
        const rowsV = await VoiceProviderConfig.find({ where: { tenant_id: tenant } });
        const v = rowsV.find((x) => x.api_key && x.is_active);
        if (!v) return;
        const label = `${v.provider}${v.caller_id ? ' · ' + v.caller_id : ''}`;
        const r = await this.voice.testConnection(tenant, v.provider);
        if (r.ok) await markConnected(tenant, 'voice', label);
        else {
          const c = classifyError('voice', { message: r.message, status: /401|403|unauthor|invalid|forbidden/i.test(r.message) ? 401 : 0, code: /timeout|ECONN|ENOTFOUND/i.test(r.message) ? 'ETIMEDOUT' : '' });
          if (c?.status === 'failed') await markFailed(tenant, 'voice', c.code, c.message, label);
          else await markDegraded(tenant, 'voice', c?.code || 'VOICE_UNREACHABLE', c?.message || 'We could not reach the voice provider just now. It will be checked again automatically.', label);
        }
        return;
      }
    }
  }

  private async checkLlm(tenant: string, provider: string, key: string, label: string) {
    try {
      if (provider === 'gemini') {
        await axios.get(`${process.env.LLM_GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta'}/models`, { params: { key, pageSize: 1 }, timeout: 8000 });
      } else if (provider === 'openai') {
        await axios.get(`${process.env.LLM_OPENAI_BASE_URL || 'https://api.openai.com/v1'}/models`, { headers: { Authorization: `Bearer ${key}` }, timeout: 8000 });
      }
      await markConnected(tenant, 'llm', label);
    } catch (err: any) {
      this.logger.warn(`LLM check failed for tenant ${tenant}: ${redactSecrets(err?.response?.data || err.message)}`);
      const c = classifyError('llm', err);
      if (c?.status === 'failed') await markFailed(tenant, 'llm', c.code, c.message, label);
      else await markDegraded(tenant, 'llm', c?.code || 'LLM_UNREACHABLE', c?.message || 'We could not reach the AI provider just now. It will be checked again automatically.', label);
    }
  }

  // ------------------------------------------------------------------------------------------ disconnect
  async disconnect(tenantIdIn: string | null, type: IntegrationType, userId?: string) {
    const tenant = this.requireTenant(tenantIdIn);
    switch (type) {
      case 'whatsapp':
      case 'whatsapp_webhook': {
        const cfg = await WhatsAppConfig.findOne({ where: { tenant_id: tenant } });
        if (cfg) await this.whatsApp.disconnect(tenant, userId);
        else {
          await markNotConfigured(tenant, 'whatsapp');
          await markNotConfigured(tenant, 'whatsapp_webhook');
        }
        break;
      }
      case 'email_smtp':
      case 'email_imap':
        await this.email.disconnect(tenant, userId);
        break;
      case 'llm': {
        for (const E of [WhatsAppAIConfig, EmailAIConfig] as any[]) {
          const c = await E.findOne({ where: { tenant_id: tenant } });
          if (c?.api_key) {
            c.api_key = null;
            c.updated_by_id = userId || 'system';
            c.updated_on = new Date();
            await c.save();
          }
        }
        await markNotConfigured(tenant, 'llm');
        break;
      }
      case 'voice': {
        const all = await VoiceProviderConfig.find({ where: { tenant_id: tenant } });
        for (const v of all) {
          v.api_key = null as any;
          v.is_active = false;
          v.updated_on = new Date();
          await v.save();
        }
        await markNotConfigured(tenant, 'voice');
        break;
      }
    }
    return this.getStatus(tenant);
  }

  // ------------------------------------------------------------------------------------------ background re-check
  /** Queues ONE background run for the tenant. Returns true if a run is queued/running for it. */
  private maybeQueue(tenant: string, types: IntegrationType[], force: boolean): boolean {
    if (!types.length) return !!this.queueState.get(tenant)?.running;
    const st = this.queueState.get(tenant);
    if (st?.running) return true;
    const now = Date.now();
    const wait = force ? Math.min(cooldownMs(), 15_000) : cooldownMs();
    if (st && now - st.queuedAt < wait) return false; // rate limit: this tenant was queued very recently
    if (this.queuedCount >= MAX_QUEUED_TENANTS) return false; // global back-pressure
    const entry = { queuedAt: now, running: true };
    this.queueState.set(tenant, entry);
    this.queuedCount++;
    // single global lane: tenants are checked one after another, never in a burst
    this.chain = this.chain
      .then(async () => {
        for (const t of types) {
          try {
            await this.runCheck(tenant, t, undefined, false);
          } catch (e: any) {
            this.logger.debug(`background check ${t} for ${tenant} ignored: ${redactSecrets(e?.message)}`);
          }
        }
      })
      .catch(() => undefined)
      .finally(() => {
        entry.running = false;
        this.queuedCount--;
      });
    return true;
  }

  /** Something changed (new credentials saved, Google connected): verify right away, in the background. */
  @OnEvent('integration.recheck')
  onRecheck(payload: { tenantId: string; types: IntegrationType[]; force?: boolean }) {
    if (!payload?.tenantId || payload.tenantId === 'default' || payload.tenantId === 'all') return;
    this.maybeQueue(payload.tenantId, (payload.types || []).filter((t) => INTEGRATION_TYPES.includes(t)), true);
  }

  /** test hook: wait for the queued background work to finish */
  async _drain() {
    await this.chain;
  }
}
