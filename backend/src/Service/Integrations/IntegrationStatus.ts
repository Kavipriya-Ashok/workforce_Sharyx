import { Logger } from '@nestjs/common';
import { company } from '@Database/Table/Admin/company';
import { redactSecrets } from '@Helper/Redact';

/**
 * Unified, per-tenant integration status (R1/R5).
 *
 * Stored in `tenant_integration_status` (migrations/1731100000000-IntegrationStatus.sql). If that table does not
 * exist yet, the same API transparently falls back to an in-memory map, so this code is safe to deploy BEFORE the
 * migration (nest --watch never breaks); status then simply is not durable until the table exists.
 *
 * Every error text stored here has been passed through redactSecrets() and is written in plain words for the user.
 */
export const INTEGRATION_TYPES = ['whatsapp', 'whatsapp_webhook', 'email_smtp', 'email_imap', 'llm', 'voice'] as const;
export type IntegrationType = (typeof INTEGRATION_TYPES)[number];
export type IntegrationState = 'not_configured' | 'connected' | 'failed' | 'degraded';

export interface StatusRow {
  tenant_id: string;
  type: IntegrationType;
  status: IntegrationState;
  display_name: string | null;
  last_checked_at: Date | null;
  last_success_at: Date | null;
  error_code: string | null;
  error_message: string | null;
  updated_at: Date | null;
}

const logger = new Logger('IntegrationStatus');
const key = (t: string, ty: string) => `${t}|${ty}`;
const rowsOf = (res: any): any[] => (Array.isArray(res) && Array.isArray(res[0]) ? res[0] : res);
const isMissingTable = (e: any) => (e?.code || e?.driverError?.code) === '42P01';

/** in-memory fallback (used only while the table is missing) + a read-through cache of the last known state */
const mem = new Map<string, StatusRow>();
const lastKnown = new Map<string, IntegrationState>();
let tableMissingUntil = 0;

const toRow = (r: any): StatusRow => ({
  tenant_id: r.tenant_id,
  type: r.type,
  status: r.status,
  display_name: r.display_name ?? null,
  last_checked_at: r.last_checked_at ? new Date(r.last_checked_at) : null,
  last_success_at: r.last_success_at ? new Date(r.last_success_at) : null,
  error_code: r.error_code ?? null,
  error_message: r.error_message ?? null,
  updated_at: r.updated_at ? new Date(r.updated_at) : null,
});

export const usingMemoryFallback = () => Date.now() < tableMissingUntil;

export async function getAllStatuses(tenantId: string): Promise<Partial<Record<IntegrationType, StatusRow>>> {
  const out: Partial<Record<IntegrationType, StatusRow>> = {};
  if (!usingMemoryFallback()) {
    try {
      const rows = rowsOf(await company.query(`SELECT * FROM tenant_integration_status WHERE tenant_id = $1`, [tenantId]));
      for (const r of rows) {
        out[r.type as IntegrationType] = toRow(r);
        lastKnown.set(key(tenantId, r.type), r.status);
      }
      return out;
    } catch (e) {
      if (!isMissingTable(e)) throw e;
      tableMissingUntil = Date.now() + 60_000;
      logger.warn('Table tenant_integration_status is missing - run migrations/1731100000000-IntegrationStatus.sql. Using in-memory status until then.');
    }
  }
  for (const t of INTEGRATION_TYPES) {
    const r = mem.get(key(tenantId, t));
    if (r) out[t] = r;
  }
  return out;
}

export interface RecordInput {
  status: IntegrationState;
  displayName?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  /** true => this check counts as a success (sets last_success_at = now) */
  success?: boolean;
  /** true => forget the previous success time (used when credentials are removed) */
  resetSuccess?: boolean;
  /** false => do not touch last_checked_at (e.g. a passive observation rather than a check) */
  checked?: boolean;
}

/** Upserts the status of one integration and returns the stored row. Never throws on a missing table. */
export async function recordStatus(tenantId: string, type: IntegrationType, input: RecordInput): Promise<StatusRow> {
  const now = new Date();
  const message = input.errorMessage ? redactSecrets(input.errorMessage).slice(0, 500) : null;
  const row: StatusRow = {
    tenant_id: tenantId,
    type,
    status: input.status,
    display_name: input.displayName ?? null,
    last_checked_at: input.checked === false ? null : now,
    last_success_at: input.success ? now : null,
    error_code: input.status === 'connected' || input.status === 'not_configured' ? null : input.errorCode || null,
    error_message: input.status === 'connected' || input.status === 'not_configured' ? null : message,
    updated_at: now,
  };
  lastKnown.set(key(tenantId, type), input.status);

  if (!usingMemoryFallback()) {
    try {
      const res = rowsOf(
        await company.query(
          `INSERT INTO tenant_integration_status
             (tenant_id, type, status, display_name, last_checked_at, last_success_at, error_code, error_message, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,now())
           ON CONFLICT (tenant_id, type) DO UPDATE SET
             status = EXCLUDED.status,
             display_name = CASE WHEN $9 THEN NULL ELSE COALESCE(EXCLUDED.display_name, tenant_integration_status.display_name) END,
             last_checked_at = COALESCE(EXCLUDED.last_checked_at, tenant_integration_status.last_checked_at),
             last_success_at = CASE WHEN $9 THEN NULL ELSE COALESCE(EXCLUDED.last_success_at, tenant_integration_status.last_success_at) END,
             error_code = EXCLUDED.error_code,
             error_message = EXCLUDED.error_message,
             updated_at = now()
           RETURNING *`,
          [tenantId, type, row.status, row.display_name, row.last_checked_at, row.last_success_at, row.error_code, row.error_message, !!input.resetSuccess]
        )
      );
      return toRow(res[0]);
    } catch (e) {
      if (!isMissingTable(e)) {
        logger.warn(`could not save ${type} status for ${tenantId}: ${redactSecrets(e)}`);
        return row;
      }
      tableMissingUntil = Date.now() + 60_000;
    }
  }
  const prev = mem.get(key(tenantId, type));
  const merged: StatusRow = {
    ...row,
    display_name: input.resetSuccess ? null : row.display_name ?? prev?.display_name ?? null,
    last_checked_at: row.last_checked_at ?? prev?.last_checked_at ?? null,
    last_success_at: input.resetSuccess ? null : row.last_success_at ?? prev?.last_success_at ?? null,
  };
  mem.set(key(tenantId, type), merged);
  return merged;
}

export const markConnected = (tenantId: string, type: IntegrationType, displayName?: string | null, checked = true) =>
  recordStatus(tenantId, type, { status: 'connected', displayName, success: true, checked });

export const markFailed = (tenantId: string, type: IntegrationType, errorCode: string, errorMessage: string, displayName?: string | null) =>
  recordStatus(tenantId, type, { status: 'failed', errorCode, errorMessage, displayName });

export const markDegraded = (tenantId: string, type: IntegrationType, errorCode: string, errorMessage: string, displayName?: string | null) =>
  recordStatus(tenantId, type, { status: 'degraded', errorCode, errorMessage, displayName });

export const markNotConfigured = (tenantId: string, type: IntegrationType) =>
  recordStatus(tenantId, type, { status: 'not_configured', resetSuccess: true });

/**
 * Cheap hook for hot paths (every successful send / receive): only touches the DB when the integration is
 * currently NOT 'connected' (e.g. flips Failed/Degraded back to Connected after a send works again).
 */
export async function noteSuccess(tenantId: string, type: IntegrationType, displayName?: string | null): Promise<void> {
  try {
    const k = key(tenantId, type);
    let known = lastKnown.get(k);
    if (!known) {
      const all = await getAllStatuses(tenantId);
      known = all[type]?.status;
    }
    if (known !== 'connected') await markConnected(tenantId, type, displayName, true);
  } catch (e) {
    logger.debug(`noteSuccess(${type}) ignored: ${redactSecrets(e)}`);
  }
}

/** Hook for real failures: classifies the error and records Failed (auth) or Degraded (temporary). */
export async function noteFailure(tenantId: string, type: IntegrationType, err: unknown, displayName?: string | null): Promise<StatusRow | null> {
  try {
    const c = classifyError(type, err);
    if (!c) return null; // not a connection problem (e.g. one recipient bounced)
    return c.status === 'failed'
      ? await markFailed(tenantId, type, c.code, c.message, displayName)
      : await markDegraded(tenantId, type, c.code, c.message, displayName);
  } catch (e) {
    logger.debug(`noteFailure(${type}) ignored: ${redactSecrets(e)}`);
    return null;
  }
}

export interface Classified {
  status: 'failed' | 'degraded';
  code: string;
  message: string;
}

const NET_CODES = ['ETIMEDOUT', 'ESOCKET', 'ECONNRESET', 'ECONNREFUSED', 'ECONNECTION', 'EAI_AGAIN', 'EPIPE', 'ECONNABORTED', 'EDNS', 'EHOSTUNREACH', 'ENETUNREACH'];

/**
 * Turns a low-level error into { status, code, plain-words message }.
 *  - auth / credential problems  => failed   (Meta 190, SMTP 535/EAUTH, IMAP login, Google invalid_grant, LLM 401)
 *  - timeouts / 5xx / rate limit => degraded (temporary, will recover by itself)
 *  - anything else               => null     (not a connection health signal)
 */
export function classifyError(type: IntegrationType, err: any): Classified | null {
  const raw = redactSecrets(err?.response?.data?.error?.message || err?.response?.data?.error_description || err?.message || String(err || ''));
  const text = raw.toLowerCase();
  const http = Number(err?.response?.status || err?.status || err?.code) || 0;
  const code = String(err?.code || '');
  const metaCode = Number(err?.response?.data?.error?.code || 0);
  const net = NET_CODES.includes(code) || /timeout|timed out|socket hang up|network|getaddrinfo eai_again|econnreset|econnrefused/.test(text);

  switch (type) {
    case 'whatsapp':
    case 'whatsapp_webhook': {
      if (metaCode === 190 || metaCode === 102 || http === 401 || /access token|oauth|session has expired|error 190/.test(text) && http !== 500) {
        return { status: 'failed', code: 'META_TOKEN_INVALID', message: 'WhatsApp rejected the access token (it expired or was revoked). Create a new token in Meta and reconnect.' };
      }
      if (metaCode === 100 || http === 400 || http === 404) {
        return { status: 'failed', code: 'META_REJECTED', message: 'WhatsApp could not find this phone number ID, or the token has no access to it. Check the Phone Number ID and token permissions.' };
      }
      if (http === 403) return { status: 'failed', code: 'META_FORBIDDEN', message: 'WhatsApp refused this request. The token is missing a permission or the account is restricted.' };
      if (http === 429 || metaCode === 4 || metaCode === 80007 || metaCode === 130429) return { status: 'degraded', code: 'META_RATE_LIMIT', message: 'WhatsApp is limiting requests right now. It will retry automatically.' };
      if (net || http >= 500 || metaCode === 1 || metaCode === 2) return { status: 'degraded', code: 'META_UNREACHABLE', message: 'We could not reach WhatsApp just now (timeout or Meta outage). It will be checked again automatically.' };
      return null;
    }
    case 'email_smtp': {
      if (code === 'EAUTH' || err?.responseCode === 535 || /\b535\b|invalid login|authentication (failed|unsuccessful)|username and password not accepted|invalid_grant|invalid_client|unauthorized_client|invalid credentials|token has been expired or revoked|invalid_request|login denied/.test(text) || http === 401) {
        return { status: 'failed', code: /invalid_grant|invalid_client|unauthorized_client|revoked/.test(text) ? 'GOOGLE_TOKEN_REVOKED' : 'SMTP_AUTH', message: /invalid_grant|invalid_client|unauthorized_client|revoked|invalid_request/.test(text) ? 'Google no longer accepts this mailbox connection (access was revoked or expired). Reconnect your Google account.' : 'The mail server rejected the username or password. Check them (for Gmail use an App Password) and reconnect.' };
      }
      if (code === 'ENOTFOUND') return { status: 'failed', code: 'SMTP_HOST_NOT_FOUND', message: 'We could not find that mail server. Check the SMTP host name.' };
      if (net || /\b4\d\d\b.*try again|temporar/.test(text) || http >= 500) return { status: 'degraded', code: 'SMTP_UNREACHABLE', message: 'We could not reach the mail server just now. It will be checked again automatically.' };
      return null;
    }
    case 'email_imap': {
      if (/authenticationfailed|invalid credentials|login failed|\[auth|authentication failed|no \[authenticationfailed\]|invalid_grant|invalid_client|unauthorized_client|username and password not accepted|login denied|logon failure/.test(text) || http === 401) {
        return { status: 'failed', code: /invalid_grant|invalid_client|unauthorized_client/.test(text) ? 'GOOGLE_TOKEN_REVOKED' : 'IMAP_AUTH', message: /invalid_grant|invalid_client|unauthorized_client/.test(text) ? 'Google no longer accepts this mailbox connection. Reconnect your Google account.' : 'The inbox (IMAP) rejected the username or password. Check them, and make sure IMAP is switched on for this mailbox.' };
      }
      if (code === 'ENOTFOUND') return { status: 'failed', code: 'IMAP_HOST_NOT_FOUND', message: 'We could not find that inbox (IMAP) server. Check the IMAP host name.' };
      if (net || /timed out|timeout/.test(text) || http >= 500) return { status: 'degraded', code: 'IMAP_UNREACHABLE', message: 'We could not reach the inbox server just now. It will be checked again automatically.' };
      return null;
    }
    case 'llm': {
      if (http === 401 || http === 403 || /incorrect api key|invalid api key|api key not valid|permission denied|unauthorized/.test(text)) {
        return { status: 'failed', code: 'LLM_KEY_INVALID', message: 'The AI provider rejected the saved API key. Paste a valid key and save again.' };
      }
      if (http === 429 || /quota|rate limit/.test(text)) return { status: 'degraded', code: 'LLM_RATE_LIMIT', message: 'The AI provider is limiting requests (rate limit or quota). It will recover by itself.' };
      if (net || http >= 500) return { status: 'degraded', code: 'LLM_UNREACHABLE', message: 'We could not reach the AI provider just now. It will be checked again automatically.' };
      return null;
    }
    case 'voice': {
      if (http === 401 || http === 403 || /unauthorized|invalid api key|forbidden/.test(text)) {
        return { status: 'failed', code: 'VOICE_KEY_INVALID', message: 'The voice provider rejected the saved API key. Paste a valid key and save again.' };
      }
      if (net || http === 429 || http >= 500) return { status: 'degraded', code: 'VOICE_UNREACHABLE', message: 'We could not reach the voice provider just now. It will be checked again automatically.' };
      return null;
    }
  }
}

/** test helper: forget everything held in memory */
export function _resetStatusCaches() {
  mem.clear();
  lastKnown.clear();
  tableMissingUntil = 0;
}
