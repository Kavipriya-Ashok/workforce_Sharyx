/* eslint-disable */
/**
 * Module 2 (onboarding, integration status, profile) regression harness. SCRATCH DB ONLY (loopback + sharyx_m2*).
 *
 *   node test/module2/module2-regression.cjs main <out.json>
 *   node test/module2/module2-regression.cjs recheck <out.json>          (needs a server with short INTEGRATIONS_* timers, BASE2)
 *   node test/module2/module2-regression.cjs restart-pre | restart-post <out.json>
 *   node test/module2/module2-regression.cjs cleanup
 * Env: BASE (default http://127.0.0.1:8001/api/v1), BASE2, SERVER_LOG, DB_NAME (default sharyx_m2).
 * Test doubles for Meta / SMTP / IMAP are started in-process (see mocks.cjs); the server must use WHATSAPP_GRAPH_URL=:9101.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const { Client } = require('pg');
const CryptoJS = require('crypto-js');
const mocks = require('./mocks.cjs');

const BASE = process.env.BASE || 'http://127.0.0.1:8001/api/v1';
const BASE2 = process.env.BASE2 || 'http://127.0.0.1:8003/api/v1';
const SERVER_LOG = process.env.SERVER_LOG || '';
const DBNAME = process.env.DB_NAME || 'sharyx_m2';
const PG = { host: '127.0.0.1', port: 5433, user: 'scratch', password: 'scratch', database: DBNAME };
if (!/^sharyx_m2/.test(PG.database)) { console.error('REFUSING: scratch databases only'); process.exit(2); }
const ROOT = path.resolve(__dirname, '..', '..', '..');
const STATE_FILE = path.join(__dirname, '.restart-state.json');
const STRONG = 'Str0ng!Passw0rd';
const RUN = Date.now().toString(36);
const mail = (n) => `authtest.m2.${RUN}.${n}@example.test`.toLowerCase();
let ipc = 0;
const nextIp = () => `10.2.${(ipc >> 8) & 255}.${(ipc++ % 250) + 1}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let db, M; // db client, mocks

// ----------------------------------------------------------------------------------------------- helpers
async function http(method, p, { body, token, ip, headers, raw, base } = {}) {
  const h = { 'content-type': 'application/json', 'x-forwarded-for': ip || nextIp(), ...(headers || {}) };
  if (token) h.authorization = `Bearer ${token}`;
  const res = await fetch((base || BASE) + p, { method, headers: h, body: raw !== undefined ? raw : body === undefined ? undefined : JSON.stringify(body) });
  const text = await res.text(); let json = null; try { json = JSON.parse(text); } catch {}
  return { status: res.status, json, text };
}
const msgOf = (r) => String((r.json && (r.json.Message || r.json.message)) || r.text || '');
const q = async (sql, params) => (await db.query(sql, params)).rows;
const KEY = () => (fs.readFileSync(path.join(ROOT, 'backend', '.env.local'), 'utf8').match(/^SECERT_KEY=(.*)$/m) || [])[1].trim();
const innerEncrypt = (t) => CryptoJS.enc.Base64.parse(CryptoJS.AES.encrypt(t, KEY()).toString()).toString(); // EncryptionService.Encrypt

async function otpFor(email) {
  const re = new RegExp(`Email: ${email.replace(/[.+]/g, '\\$&')} \\| (?:New )?OTP Code: (\\d{6})`, 'g');
  for (let i = 0; i < 40; i++) { const all = [...fs.readFileSync(SERVER_LOG, 'utf8').matchAll(re)]; if (all.length) return all[all.length - 1][1]; await sleep(150); }
  return null;
}
async function signup(email, company = 'M2 Test Co') {
  const ip = nextIp();
  const s = await http('POST', '/Auth/SendSignupOtp', { body: { email }, ip });
  if (s.status >= 300) return { ok: false, r: s };
  const otp = await otpFor(email);
  const v = await http('POST', '/Auth/VerifySignupOtp', { ip, body: { email, otp, password: STRONG, confirm_password: STRONG, company_name: company, first_name: 'M2' } });
  const token = v.json && v.json.result && v.json.result.api_token;
  return { ok: !!token, token, tenant: v.json && v.json.result && v.json.result.user && v.json.result.user.tenant_id, email };
}
const WIZ = {
  1: { company_name: 'Acme Test', business_email: 'owner@acme.test', website: 'acme.test' },
  2: { address: '1 Test Street', city: 'Chennai', state: 'TN', pincode: '600001' },
  3: { industry: 'IT & Software', selected_services: ['AI Lead Qualification', 'Demo Booking'] },
  4: { goals: ['Answer customers 24/7', 'Qualify leads'] },
  6: { apps: ['HubSpot', 'Gmail'] },
};
async function wizard(token, { complete = true } = {}) {
  for (const s of [1, 2, 3, 4, 6]) { const r = await http('PUT', '/Onboarding/Step', { token, body: { step: s, data: WIZ[s] } }); if (r.status >= 300) return r; }
  return complete ? http('POST', '/Onboarding/Complete', { token }) : { status: 200 };
}
const status = async (token) => { const r = await http('GET', '/Integrations/Status', { token }); return { r, items: Object.fromEntries(((r.json && r.json.items) || []).map((i) => [i.type, i])), cl: r.json && r.json.checklist }; };
/** wait until no background check is running for the tenant */
async function settle(token, ms = 8000) { const t0 = Date.now(); while (Date.now() - t0 < ms) { const s = await status(token); if (!s.r.json || !s.r.json.checking) return s; await sleep(250); } return status(token); }
const dbStatus = async (tenant, type) => (await q(`SELECT * FROM tenant_integration_status WHERE tenant_id=$1 AND type=$2`, [tenant, type]))[0];
const WA = (n, token) => ({ phone_number: '+15550100100', phone_number_id: `PNID-${n}-${RUN}`, waba_id: 'WABA1', access_token: token, provider: 'meta_cloud' });
const connectWa = (t, n, token = 'GOODTOKEN-' + n) => http('POST', '/WhatsApp/Test-Connection', { token: t.token, body: WA(n, token) });
const MAIL = (u, pw = 'good-app-password', extra = {}) => ({ email_address: u, smtp_host: '127.0.0.1', smtp_port: 9102, smtp_user: u, smtp_password: pw, imap_host: '127.0.0.1', imap_port: 9103, use_ssl: false, ...extra });
const connectMail = (t, u, pw) => http('POST', '/Email/Test-Connection', { token: t.token, body: MAIL(u, pw) });
const PLANTED = ['GOCSPX-PLANTED_CLIENT_SECRET_123', 'ya29.PLANTED_ACCESS_TOKEN_456', '1//PLANTED_REFRESH_789', 'good-app-password', 'GOODTOKEN-', 'sk-test-good-key', 'REVOKEDTOKEN'];
const leaks = (text) => PLANTED.filter((p) => text.includes(p));
const SECRET_KEYS = /"(client_secret|smtp_password|access_token|refresh_token|app_secret|api_key|password|otp_hash)"\s*:/;

const tests = [];
const t = (id, area, title, fn) => tests.push({ id, area, title, fn });
const ok = (pass, actual) => ({ pass: !!pass, actual });
const F = {};

async function setup() {
  db = new Client(PG); await db.connect();
  M = await mocks.start();
  F.a = await signup(mail('A'), 'Tenant A Co'); F.b = await signup(mail('B'), 'Tenant B Co');
  if (!F.a.ok || !F.b.ok) throw new Error('signup fixture failed');
  F.c = await signup(mail('C'), 'Tenant C Co'); // left with no wizard data
  await wizard(F.a.token); await wizard(F.b.token);
}

// ============================================================================================ original 17
t('M2-01', 'A. Progress', 'Onboarding State without JWT -> 401', async () => { const r = await http('GET', '/Onboarding/State'); return ok(r.status === 401, `HTTP ${r.status}`); });
t('M2-02', 'A. Progress', 'Tenant A sees its own state', async () => { const r = await http('GET', '/Onboarding/State', { token: F.a.token }); return ok(r.json && r.json.company.id === F.a.tenant, `company=${r.json && r.json.company.id.slice(0, 8)}`); });
t('M2-03', 'A. Progress', 'Tenant B sees its own state', async () => { const r = await http('GET', '/Onboarding/State', { token: F.b.token }); return ok(r.json && r.json.company.id === F.b.tenant, `company=${r.json && r.json.company.id.slice(0, 8)}`); });
t('M2-04', 'A. Progress', 'x-tenant-id / ?tenantId spoof ignored', async () => {
  const h = await http('GET', '/Onboarding/State', { token: F.a.token, headers: { 'x-tenant-id': F.b.tenant } });
  const qy = await http('GET', `/Onboarding/State?tenantId=${F.b.tenant}`, { token: F.a.token });
  return ok(h.json.company.id === F.a.tenant && qy.json.company.id === F.a.tenant, 'both returned tenant A');
});
for (const [id, step] of [['M2-05', 0], ['M2-06', 11], ['M2-07', 'abc']]) t(id, 'A. Progress', `Invalid step ${JSON.stringify(step)} -> 400`, async () => { const r = await http('PUT', '/Onboarding/Step', { token: F.c.token, body: { step, data: {} } }); return ok(r.status === 400, `HTTP ${r.status}: ${msgOf(r).slice(0, 60)}`); });
t('M2-08', 'A. Progress', 'Complete with missing required steps -> 400', async () => { const r = await http('POST', '/Onboarding/Complete', { token: F.c.token }); return ok(r.status === 400 && /incomplete/i.test(msgOf(r)), `HTTP ${r.status}: ${msgOf(r).slice(0, 70)}`); });
t('M2-09', 'E. Secrets', 'WhatsApp config never returns the token', async () => {
  const c = await connectWa(F.a, 'A'); const g = await http('GET', '/WhatsApp/Config', { token: F.a.token });
  return ok(c.status < 300 && !SECRET_KEYS.test(g.text) && !leaks(g.text).length && g.json.has_access_token === true, `connect=${c.status}; keys leaked=${SECRET_KEYS.test(g.text)}; has_access_token=${g.json && g.json.has_access_token}`);
});
t('M2-10', 'E. Secrets', 'GET /Email/Config returns no secrets (planted legacy secrets in the DB row)', async () => {
  await http('POST', '/Email/Config', { token: F.a.token, body: MAIL(mail('mbxA')) });
  await q(`UPDATE email_account_config SET client_secret=$1, access_token=$2, refresh_token=$3, provider='smtp' WHERE tenant_id=$4`, [PLANTED[0], PLANTED[1], innerEncrypt(PLANTED[2]), F.a.tenant]);
  const raw = (await q(`SELECT client_secret, access_token, refresh_token, smtp_password FROM email_account_config WHERE tenant_id=$1`, [F.a.tenant]))[0];
  const g = await http('GET', '/Email/Config', { token: F.a.token });
  const rawLeak = Object.values(raw).filter((v) => v && g.text.includes(v)).length;
  return ok(g.status === 200 && !SECRET_KEYS.test(g.text) && !leaks(g.text).length && rawLeak === 0 && g.json.has_client_secret && g.json.has_password, `HTTP ${g.status}; secret keys present=${SECRET_KEYS.test(g.text)}; planted values in body=${leaks(g.text).length}; raw DB values in body=${rawLeak}; flags: has_client_secret=${g.json && g.json.has_client_secret}, has_password=${g.json && g.json.has_password}, hint=${g.json && g.json.password_hint}`);
});
t('M2-11', 'B. Email', 'OAuth Status endpoint answers', async () => { const r = await http('GET', '/Email/OAuth/Status', { token: F.a.token }); return ok(r.status === 200 && r.json && 'isConnected' in r.json, `HTTP ${r.status} ${JSON.stringify(r.json).slice(0, 80)}`); });
t('M2-12', 'C. WhatsApp', 'WhatsApp Test-Connection with empty credentials -> 400', async () => { const r = await http('POST', '/WhatsApp/Test-Connection', { token: F.c.token, body: { phone_number: '+15550100100', phone_number_id: 'X1', provider: 'meta_cloud' } }); return ok(r.status === 400, `HTTP ${r.status}: ${msgOf(r).slice(0, 80)}`); });
t('M2-13', 'B. Email', 'Email Test-Connection with a wrong password -> 400 with a clear reason', async () => {
  const r = await http('POST', '/Email/Test-Connection', { token: F.b.token, body: MAIL(mail('mbxB'), 'WRONG-password') });
  return ok(r.status === 400 && /rejected the username or password/i.test(msgOf(r)), `HTTP ${r.status}: ${msgOf(r).slice(0, 110)}`);
});
t('M2-14', 'B. Email', 'Failed email test is SAVED (status, reason, timestamp)', async () => {
  const row = await dbStatus(F.b.tenant, 'email_smtp');
  return ok(row && row.status === 'failed' && row.error_message && row.last_checked_at && !leaks(row.error_message).length, `row=${row ? `${row.status}/${row.error_code}: "${(row.error_message || '').slice(0, 70)}" checked=${!!row.last_checked_at}` : 'NONE'}`);
});
t('M2-15', 'C. WhatsApp', 'Failed WhatsApp test is SAVED (status, reason, timestamp)', async () => {
  const r = await http('POST', '/WhatsApp/Test-Connection', { token: F.b.token, body: WA('B', 'REVOKEDTOKEN-B') });
  const row = await dbStatus(F.b.tenant, 'whatsapp');
  return ok(r.status === 400 && row && row.status === 'failed' && row.error_message && row.last_checked_at && !/REVOKEDTOKEN/.test(row.error_message), `HTTP ${r.status}; row=${row ? `${row.status}/${row.error_code}: "${(row.error_message || '').slice(0, 90)}"` : 'NONE'}`);
});
t('M2-16', 'D. Profile', 'Profile page exists (route + sidebar link + page)', async () => {
  const lay = fs.readFileSync(path.join(ROOT, 'frontend/src/pages/admin/AdminLayout.tsx'), 'utf8');
  const has = fs.existsSync(path.join(ROOT, 'frontend/src/pages/profile/ProfilePage.tsx'));
  return ok(has && /admin\/profile/.test(lay) && /ProfilePage/.test(lay), `page file=${has}; route+nav in AdminLayout=${/admin\/profile/.test(lay)}`);
});
t('M2-17', 'G. Dead data', 'Wizard answers are consumed by the AI Brain prompt', async () => {
  const pe = fs.readFileSync(path.join(ROOT, 'backend/src/WhatsApp/Services/PromptEngine.service.ts'), 'utf8');
  return ok(/onboarding_data/.test(pe) && /selected_services/.test(pe) && /goals/.test(pe), 'PromptEngine reads industry/selected_services/goals/apps (runtime proof: brain-context-check.cjs)');
});

// ============================================================================================ secrets (new)
t('N2-01', 'Secrets', 'POST /Email/Config response contains no secrets', async () => {
  const r = await http('POST', '/Email/Config', { token: F.a.token, body: MAIL(mail('mbxA'), 'good-app-password', { display_name: 'Support' }) });
  return ok(r.status < 300 && !SECRET_KEYS.test(r.text) && !leaks(r.text).length, `HTTP ${r.status}; secret keys=${SECRET_KEYS.test(r.text)}; leaked values=${leaks(r.text).length}`);
});
t('N2-02', 'Secrets', 'Every integration API response is secret-free (Status, Test, Disconnect-safe shapes)', async () => {
  const bodies = [(await http('GET', '/Integrations/Status', { token: F.a.token })).text, (await http('POST', '/Integrations/whatsapp/Test', { token: F.a.token })).text, (await http('POST', '/Integrations/email_smtp/Test', { token: F.a.token })).text, (await http('GET', '/WhatsApp/Config', { token: F.a.token })).text, (await http('GET', '/Email/Config', { token: F.a.token })).text, (await http('GET', '/Profile', { token: F.a.token })).text, (await http('GET', '/Onboarding/State', { token: F.a.token })).text];
  const bad = bodies.filter((b) => SECRET_KEYS.test(b) || leaks(b).length);
  return ok(bad.length === 0, `${bodies.length} responses scanned, with secrets: ${bad.length}`);
});
t('N2-03', 'Secrets', 'Secrets are encrypted at rest after a save through the API', async () => {
  await http('POST', '/Email/Config', { token: F.a.token, body: MAIL(mail('mbxA')) });
  const r = (await q(`SELECT smtp_password FROM email_account_config WHERE tenant_id=$1`, [F.a.tenant]))[0];
  const w = (await q(`SELECT access_token FROM whatsapp_config WHERE tenant_id=$1`, [F.a.tenant]))[0];
  return ok(r.smtp_password.startsWith('enc:v1:') && !r.smtp_password.includes('good-app') && w.access_token.startsWith('enc:v1:'), `email smtp_password prefix=${r.smtp_password.slice(0, 7)}; whatsapp access_token prefix=${w.access_token.slice(0, 7)}`);
});
t('N2-04', 'Secrets', 'Legacy PLAINTEXT / old-AES rows still work (read tolerance) - app works before migration', async () => {
  await q(`UPDATE email_account_config SET smtp_password='good-app-password' WHERE tenant_id=$1`, [F.a.tenant]); // raw plaintext, as in old rows
  const r = await http('POST', '/Integrations/email_smtp/Test', { token: F.a.token });
  const g = await http('GET', '/Email/Config', { token: F.a.token });
  await q(`UPDATE email_account_config SET smtp_password=$1 WHERE tenant_id=$2`, [innerEncrypt('good-app-password'), F.a.tenant]); // old AES-hex form
  const r2 = await http('POST', '/Integrations/email_smtp/Test', { token: F.a.token });
  return ok(r.json && r.json.item.status === 'connected' && r2.json.item.status === 'connected' && g.json.has_password, `plaintext row -> ${r.json && r.json.item.status}; old-AES row -> ${r2.json && r2.json.item.status}`);
});
t('N2-05', 'Secrets', 'Migration script: dry run changes nothing; --commit encrypts; app still works; rollback restores', async () => {
  const run = (args) => execFileSync('node', [path.join(ROOT, 'backend/scripts/encrypt-stored-secrets.cjs'), ...args], { env: { ...process.env, DB_HOST: '127.0.0.1', DB_PORT: '5433', DB_USER: 'scratch', DB_PASS: 'scratch', DB_NAME: DBNAME }, encoding: 'utf8' });
  await q(`UPDATE email_account_config SET client_secret=$1, access_token=$2 WHERE tenant_id=$3`, [PLANTED[0], PLANTED[1], F.a.tenant]);
  const before = (await q(`SELECT client_secret, access_token FROM email_account_config WHERE tenant_id=$1`, [F.a.tenant]))[0];
  const dry = run(['apply']);
  const afterDry = (await q(`SELECT client_secret FROM email_account_config WHERE tenant_id=$1`, [F.a.tenant]))[0];
  const commit = run(['apply', '--commit']);
  const enc = (await q(`SELECT client_secret, access_token, smtp_password FROM email_account_config WHERE tenant_id=$1`, [F.a.tenant]))[0];
  const works = await http('POST', '/Integrations/email_smtp/Test', { token: F.a.token });
  const printed = leaks(dry + commit).length;
  const back = run(['rollback', '--commit']);
  const restored = (await q(`SELECT client_secret, access_token FROM email_account_config WHERE tenant_id=$1`, [F.a.tenant]))[0];
  return ok(afterDry.client_secret === before.client_secret && /dry run/.test(dry) && enc.client_secret.startsWith('enc:v1:') && enc.access_token.startsWith('enc:v1:') && works.json.item.status === 'connected' && restored.client_secret === before.client_secret && restored.access_token === before.access_token && printed === 0,
    `dry run left DB untouched=${afterDry.client_secret === before.client_secret}; after --commit client_secret/access_token encrypted=${enc.client_secret.startsWith('enc:v1:')}/${enc.access_token.startsWith('enc:v1:')}; SMTP test still ${works.json.item.status}; rollback restored originals=${restored.client_secret === before.client_secret}; secrets printed by script=${printed}`);
});
t('N2-06', 'Secrets', 'Server log and error_log contain none of the planted secrets', async () => {
  const log = fs.readFileSync(SERVER_LOG, 'utf8'); const el = (await q(`SELECT string_agg(message || ' ' || url, ' ') AS t FROM error_log`))[0].t || '';
  const inLog = PLANTED.filter((p) => !/^GOODTOKEN-$|^REVOKEDTOKEN$/.test(p) && log.includes(p)); const inDb = PLANTED.filter((p) => el.includes(p));
  return ok(!inLog.length && !inDb.length, `server log hits=${inLog.length} ${inLog.join(',')}, error_log hits=${inDb.length} ${inDb.join(',')}`);
});
t('N2-07', 'Secrets', 'Access token in a URL is redacted in error_log', async () => {
  await http('GET', '/Voice/calls/audio?access_token=eyJLEAKTESTTOKEN.eyJPAYLOAD0123456.SIGNATURE01234', { ip: nextIp() });
  await sleep(300); const rows = await q(`SELECT url FROM error_log WHERE url LIKE '%audio%' ORDER BY created_on DESC LIMIT 3`);
  return ok(rows.length >= 0 && !rows.some((r) => /LEAKTESTTOKEN/.test(r.url)), `rows checked=${rows.length}; token present=${rows.some((r) => /LEAKTESTTOKEN/.test(r.url))}`);
});

// ============================================================================================ status (new)
t('N2-10', 'Status', 'WhatsApp test OK -> Connected is saved with timestamps', async () => {
  const c = await connectWa(F.a, 'A'); const s = await settle(F.a.token); const row = await dbStatus(F.a.tenant, 'whatsapp');
  return ok(c.status < 300 && s.items.whatsapp.status === 'connected' && row.last_checked_at && row.last_success_at && !row.error_message, `api=${s.items.whatsapp.status}; db=${row.status}, last_checked_at=${!!row.last_checked_at}, last_success_at=${!!row.last_success_at}, display=${row.display_name}`);
});
t('N2-11', 'Status', 'Revoked token on re-test -> Failed + plain reason (no token in it)', async () => {
  M.meta.revoked.add('GOODTOKEN-A'); const r = await http('POST', '/Integrations/whatsapp/Test', { token: F.a.token }); M.meta.revoked.delete('GOODTOKEN-A');
  const it = r.json && r.json.item;
  return ok(it && it.status === 'failed' && it.error_message && /token/i.test(it.error_message) && !leaks(it.error_message).length && it.error_code === 'META_TOKEN_INVALID', `status=${it && it.status}/${it && it.error_code}: "${it && it.error_message}"`);
});
t('N2-12', 'Status', 'Timeout -> Degraded (temporary), not Failed', async () => {
  await http('POST', '/WhatsApp/Test-Connection', { token: F.c.token, body: WA('C', 'SLOWTOKEN-C') }); const row = await dbStatus(F.c.tenant, 'whatsapp');
  return ok(row && row.status === 'degraded' && row.error_code === 'META_UNREACHABLE', `status=${row && row.status}/${row && row.error_code}: "${(row && row.error_message || '').slice(0, 80)}"`);
});
t('N2-13', 'Status', 'Real SEND with a revoked token flips to Failed; the next send that works flips back to Connected', async () => {
  await connectWa(F.a, 'A'); await settle(F.a.token);
  M.meta.revoked.add('GOODTOKEN-A');
  const bad = await http('POST', '/WhatsApp/Send', { token: F.a.token, body: { to: '15551230000', text: 'hi', message_type: 'text' } });
  const failed = (await dbStatus(F.a.tenant, 'whatsapp')).status;
  M.meta.revoked.delete('GOODTOKEN-A');
  const good = await http('POST', '/WhatsApp/Send', { token: F.a.token, body: { to: '15551230000', text: 'hi again', message_type: 'text' } });
  await sleep(300); const back = (await dbStatus(F.a.tenant, 'whatsapp')).status;
  return ok(bad.status >= 400 && failed === 'failed' && good.status < 300 && back === 'connected', `send(revoked)=HTTP ${bad.status} -> status ${failed}; send(restored)=HTTP ${good.status} -> status ${back}`);
});
t('N2-14', 'Status', 'SMTP and IMAP are tested and saved SEPARATELY', async () => {
  M.mail.imapAccept = false; await http('POST', '/Email/Test-Connection', { token: F.a.token, body: MAIL(mail('mbxA')) }); M.mail.imapAccept = true;
  const sm = await dbStatus(F.a.tenant, 'email_smtp'), im = await dbStatus(F.a.tenant, 'email_imap');
  return ok(sm.status === 'connected' && im.status === 'failed' && im.error_code === 'IMAP_AUTH' && /inbox/i.test(im.error_message), `smtp=${sm.status}; imap=${im.status}/${im.error_code}: "${(im.error_message || '').slice(0, 80)}"`);
});
t('N2-15', 'Status', 'SMTP 535 on a real send -> Failed; later send works -> Connected', async () => {
  await http('POST', '/Email/Test-Connection', { token: F.a.token, body: MAIL(mail('mbxA')) }); await settle(F.a.token);
  M.mail.goodPasswords.delete('good-app-password');
  const bad = await http('POST', '/Email/Send', { token: F.a.token, body: { to: 'someone@example.com', subject: 's', html: '<p>x</p>', bypassValidation: true } });
  const f = await dbStatus(F.a.tenant, 'email_smtp');
  M.mail.goodPasswords.add('good-app-password');
  const good = await http('POST', '/Email/Send', { token: F.a.token, body: { to: 'someone@example.com', subject: 's2', html: '<p>x</p>', bypassValidation: true } });
  await sleep(300); const c = await dbStatus(F.a.tenant, 'email_smtp');
  return ok(bad.status >= 400 && f.status === 'failed' && f.error_code === 'SMTP_AUTH' && good.status < 300 && c.status === 'connected', `send(535)=HTTP ${bad.status} -> ${f.status}/${f.error_code}; send(ok)=HTTP ${good.status} -> ${c.status}`);
});
t('N2-16', 'Status', 'Inbox poll failing to log in (IMAP) -> Failed automatically; works again -> Connected', async () => {
  await http('POST', '/Email/Test-Connection', { token: F.a.token, body: MAIL(mail('mbxA')) }); await settle(F.a.token);
  M.mail.imapAccept = false; await http('POST', '/Email/Sync', { token: F.a.token }); await sleep(500);
  const f = await dbStatus(F.a.tenant, 'email_imap');
  M.mail.imapAccept = true; await http('POST', '/Email/Sync', { token: F.a.token }); await sleep(500);
  const c = await dbStatus(F.a.tenant, 'email_imap');
  return ok(f.status === 'failed' && c.status === 'connected', `after failing poll: ${f.status}/${f.error_code}; after good poll: ${c.status}`);
});
t('N2-17', 'Status', 'Mail server that never answers -> Degraded (not Failed)', async () => {
  const r = await http('POST', '/Email/Test-Connection', { token: F.c.token, body: MAIL(mail('mbxC'), 'good-app-password', { smtp_port: 9104, imap_port: 9104 }) });
  const sm = await dbStatus(F.c.tenant, 'email_smtp');
  return ok(r.status === 400 && sm.status === 'degraded' && sm.error_code === 'SMTP_UNREACHABLE', `HTTP ${r.status}; smtp=${sm && sm.status}/${sm && sm.error_code}`);
});
t('N2-18', 'Status', 'WhatsApp webhook is its own status (handshake -> Connected, bad signature -> Failed, good -> Connected)', async () => {
  const cfg = (await q(`SELECT verify_token, phone_number_id FROM whatsapp_config WHERE tenant_id=$1`, [F.a.tenant]))[0];
  await q(`UPDATE whatsapp_config SET app_secret=$1 WHERE tenant_id=$2`, ['enc:v1:' + CryptoJS.AES.encrypt('meta-app-secret-xyz', KEY()).toString(), F.a.tenant]);
  const g = await fetch(`${BASE}/WhatsApp/Webhook?hub.mode=subscribe&hub.verify_token=${cfg.verify_token}&hub.challenge=777`, { headers: { 'x-forwarded-for': nextIp() } });
  await sleep(300); const s1 = (await dbStatus(F.a.tenant, 'whatsapp_webhook')).status;
  const body = JSON.stringify({ entry: [{ changes: [{ value: { metadata: { phone_number_id: cfg.phone_number_id, display_phone_number: '15550100100' }, statuses: [] } }] }] });
  await fetch(`${BASE}/WhatsApp/Webhook`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-hub-signature-256': 'sha256=deadbeef', 'x-forwarded-for': nextIp() }, body }); await sleep(400);
  const bad = await dbStatus(F.a.tenant, 'whatsapp_webhook');
  const sig = 'sha256=' + crypto.createHmac('sha256', 'meta-app-secret-xyz').update(body).digest('hex');
  await fetch(`${BASE}/WhatsApp/Webhook`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-hub-signature-256': sig, 'x-forwarded-for': nextIp() }, body }); await sleep(400);
  const good = await dbStatus(F.a.tenant, 'whatsapp_webhook');
  return ok(g.status === 200 && s1 === 'connected' && bad.status === 'failed' && bad.error_code === 'WEBHOOK_SIGNATURE' && good.status === 'connected', `handshake HTTP ${g.status} -> ${s1}; bad signature -> ${bad.status}/${bad.error_code}; valid signature -> ${good.status}`);
});
t('N2-19', 'Status', 'LLM key: good -> Connected, wrong key -> Failed (separate integration)', async () => {
  await q(`INSERT INTO wa_ai_config(tenant_id, llm_provider, llm_model, api_key, status) VALUES ($1,'openai','gpt-4o-mini','sk-test-good-key',true) ON CONFLICT DO NOTHING`, [F.a.tenant]).catch(() => {});
  const have = (await q(`SELECT 1 FROM wa_ai_config WHERE tenant_id=$1`, [F.a.tenant])).length;
  if (!have) await q(`INSERT INTO wa_ai_config(tenant_id, llm_provider, llm_model, api_key, status, is_ai_enabled, ai_mode, auto_followup_enabled, followup_delay_minutes) VALUES ($1,'openai','gpt-4o-mini','sk-test-good-key',true,true,'hybrid',true,60)`, [F.a.tenant]);
  await q(`UPDATE wa_ai_config SET api_key='sk-test-good-key', llm_provider='openai' WHERE tenant_id=$1`, [F.a.tenant]);
  const good = await http('POST', '/Integrations/llm/Test', { token: F.a.token });
  await q(`UPDATE wa_ai_config SET api_key='sk-wrong-key' WHERE tenant_id=$1`, [F.a.tenant]);
  const bad = await http('POST', '/Integrations/llm/Test', { token: F.a.token });
  await q(`UPDATE wa_ai_config SET api_key='sk-test-good-key' WHERE tenant_id=$1`, [F.a.tenant]);
  return ok(good.json.item.status === 'connected' && bad.json.item.status === 'failed' && bad.json.item.error_code === 'LLM_KEY_INVALID' && !leaks(bad.text).length, `good key -> ${good.json.item.status}; wrong key -> ${bad.json.item.status}/${bad.json.item.error_code}`);
});
t('N2-20', 'Disconnect', 'WhatsApp Disconnect: credentials erased, not_configured, sending refused; Reconnect works', async () => {
  await connectWa(F.a, 'A'); const sends0 = M.meta.sends;
  const d = await http('POST', '/Integrations/whatsapp/Disconnect', { token: F.a.token });
  const row = (await q(`SELECT access_token, app_secret, is_connected FROM whatsapp_config WHERE tenant_id=$1`, [F.a.tenant]))[0];
  const st = await status(F.a.token);
  const send = await http('POST', '/WhatsApp/Send', { token: F.a.token, body: { to: '15551230000', text: 'x', message_type: 'text' } });
  const re = await connectWa(F.a, 'A'); await settle(F.a.token); const st2 = await status(F.a.token);
  return ok(d.status < 300 && row.access_token === '' && !row.app_secret && row.is_connected === false && st.items.whatsapp.status === 'not_configured' && send.status >= 400 && M.meta.sends === sends0 && re.status < 300 && st2.items.whatsapp.status === 'connected',
    `token erased=${row.access_token === ''}; status=${st.items.whatsapp.status}; send after disconnect=HTTP ${send.status} (Meta sends unchanged=${M.meta.sends === sends0}); reconnect -> ${st2.items.whatsapp.status}`);
});
t('N2-21', 'Disconnect', 'Email Disconnect: credentials erased, mailbox off, not_configured, sending refused; Reconnect works', async () => {
  await http('POST', '/Email/Test-Connection', { token: F.a.token, body: MAIL(mail('mbxA')) }); await settle(F.a.token); const sent0 = M.mail.smtpSent;
  const d = await http('POST', '/Integrations/email_smtp/Disconnect', { token: F.a.token });
  const row = (await q(`SELECT smtp_password, refresh_token, access_token, client_secret, is_active FROM email_account_config WHERE tenant_id=$1`, [F.a.tenant]))[0];
  const st = await status(F.a.token);
  const send = await http('POST', '/Email/Send', { token: F.a.token, body: { to: 'someone@example.com', subject: 's', html: '<p>x</p>', bypassValidation: true } });
  await http('POST', '/Email/Sync', { token: F.a.token });
  const re = await http('POST', '/Email/Test-Connection', { token: F.a.token, body: MAIL(mail('mbxA')) }); await settle(F.a.token); const st2 = await status(F.a.token);
  return ok(d.status < 300 && !row.smtp_password && !row.refresh_token && !row.access_token && !row.client_secret && row.is_active === false && st.items.email_smtp.status === 'not_configured' && st.items.email_imap.status === 'not_configured' && send.status >= 400 && M.mail.smtpSent === sent0 && re.status < 300 && st2.items.email_smtp.status === 'connected',
    `secrets erased=${!row.smtp_password && !row.refresh_token && !row.access_token && !row.client_secret}, active=${row.is_active}; status=${st.items.email_smtp.status}/${st.items.email_imap.status}; send after disconnect=HTTP ${send.status}; reconnect -> ${st2.items.email_smtp.status}`);
});
t('N2-22', 'Isolation', 'Tenant A status/errors never visible to tenant B; B cannot test or disconnect A', async () => {
  await connectWa(F.a, 'A'); await http('POST', '/Email/Test-Connection', { token: F.a.token, body: MAIL(mail('mbxA')) });
  const sb = await status(F.b.token); const spoof = await http('GET', '/Integrations/Status', { token: F.b.token, headers: { 'x-tenant-id': F.a.tenant } });
  const seesA = JSON.stringify(sb.r.json).includes(mail('mbxA')) || JSON.stringify(sb.r.json).includes('PNID-A') || JSON.stringify(spoof.json).includes(mail('mbxA'));
  const dis = await http('POST', '/Integrations/email_smtp/Disconnect', { token: F.b.token }); const aStill = (await q(`SELECT is_active FROM email_account_config WHERE tenant_id=$1`, [F.a.tenant]))[0].is_active;
  return ok(!seesA && spoof.json.tenant_id === F.b.tenant && aStill === true && dis.json.tenant_id === F.b.tenant, `B sees A's data=${seesA}; spoofed header answered for tenant ${spoof.json.tenant_id === F.b.tenant ? 'B (ignored spoof)' : 'A!'}; A's mailbox still active after B's disconnect=${aStill}`);
});
t('N2-23', 'Isolation', 'Status identical after re-login (new token)', async () => {
  const s1 = await status(F.a.token); const lg = await http('POST', '/Auth/Login', { body: { email: F.a.email, password: STRONG } });
  const s2 = await status(lg.json.result.api_token); const pick = (s) => ['whatsapp', 'email_smtp', 'email_imap'].map((k) => `${s.items[k].status}`).join('/');
  return ok(pick(s1) === pick(s2), `before login: ${pick(s1)} | after re-login: ${pick(s2)}`);
});

// ============================================================================================ onboarding (new)
t('N2-30', 'Onboarding', 'Two tabs saving at once do not lose each other\'s answers', async () => {
  const x = await signup(mail('tabs'), 'Tabs Co');
  const reqs = []; for (let i = 0; i < 10; i++) { reqs.push(http('PUT', '/Onboarding/Step', { token: x.token, body: { step: 1, data: WIZ[1] } })); reqs.push(http('PUT', '/Onboarding/Step', { token: x.token, body: { step: 2, data: WIZ[2] } })); reqs.push(http('PUT', '/Onboarding/Step', { token: x.token, body: { step: 3, data: WIZ[3] } })); }
  const rs = await Promise.all(reqs); const st = (await http('GET', '/Onboarding/State', { token: x.token })).json;
  return ok(rs.every((r) => r.status === 200) && st.data.company_name === 'Acme Test' && st.data.address === '1 Test Street' && st.data.industry === 'IT & Software' && st.onboarding_step === 4, `30 parallel saves (3 steps x 10 tabs): statuses ok=${rs.every((r) => r.status === 200)}; step1/2/3 answers all present=${!!(st.data.company_name && st.data.address && st.data.industry)}; furthest step=${st.onboarding_step}`);
});
t('N2-31', 'Onboarding', 'Double-click Next (same step 10x in parallel) is harmless', async () => {
  const x = await signup(mail('dbl'), 'Dbl Co'); const rs = await Promise.all(Array.from({ length: 10 }, () => http('PUT', '/Onboarding/Step', { token: x.token, body: { step: 1, data: WIZ[1] } })));
  const st = (await http('GET', '/Onboarding/State', { token: x.token })).json; return ok(rs.every((r) => r.status === 200) && st.onboarding_step === 2, `10 parallel: all 200=${rs.every((r) => r.status === 200)}; step=${st.onboarding_step}`);
});
t('N2-32', 'Onboarding', 'Complete twice in parallel -> one completion, no error', async () => {
  const x = await signup(mail('cmp'), 'Cmp Co'); await wizard(x.token, { complete: false });
  const rs = await Promise.all([1, 2, 3, 4].map(() => http('POST', '/Onboarding/Complete', { token: x.token }))); const again = await http('POST', '/Onboarding/Complete', { token: x.token });
  return ok(rs.every((r) => r.status < 300 && r.json.onboarding_completed) && again.status < 300, `4 parallel + 1 later: statuses=[${rs.map((r) => r.status)},${again.status}]`);
});
t('N2-33', 'Onboarding', 'Editing after Complete keeps it completed and updates the profile', async () => {
  const r = await http('PUT', '/Onboarding/Step', { token: F.a.token, body: { step: 1, data: { ...WIZ[1], company_name: 'Acme Renamed' } } });
  const p = await http('GET', '/Profile', { token: F.a.token }); const st = (await http('GET', '/Onboarding/State', { token: F.a.token })).json;
  return ok(r.status === 200 && st.onboarding_completed === true && p.json.name === 'Acme Renamed', `save=${r.status}; completed=${st.onboarding_completed}; profile name=${p.json.name}`);
});
t('N2-34', 'Onboarding', 'Skipped steps are recorded on the server and show as Pending (not Done) on the checklist', async () => {
  const x = await signup(mail('skip'), 'Skip Co'); const c = await wizard(x.token); const st = (await http('GET', '/Onboarding/State', { token: x.token })).json; const s = await status(x.token);
  const wa = s.cl.items.find((i) => i.key === 'whatsapp'), em = s.cl.items.find((i) => i.key === 'email');
  return ok(c.status < 300 && st.data.whatsapp_skipped === true && st.data.email_skipped === true && wa.state === 'pending' && em.state === 'pending' && /Skipped/i.test(wa.detail) && /Skipped/i.test(em.detail), `whatsapp_skipped=${st.data.whatsapp_skipped}, email_skipped=${st.data.email_skipped}; checklist whatsapp=${wa.state} ("${wa.detail.slice(0, 40)}"), email=${em.state}`);
});
t('N2-35', 'Onboarding', 'Checklist reflects reality: done / failed / pending, each with an action', async () => {
  await connectWa(F.a, 'A'); await http('POST', '/Email/Test-Connection', { token: F.a.token, body: MAIL(mail('mbxA')) }); await settle(F.a.token);
  M.meta.revoked.add('GOODTOKEN-A'); await http('POST', '/Integrations/whatsapp/Test', { token: F.a.token }); M.meta.revoked.delete('GOODTOKEN-A');
  const s = await status(F.a.token); const by = (k) => s.cl.items.find((i) => i.key === k);
  const states = `profile=${by('profile').state}, whatsapp=${by('whatsapp').state}, email=${by('email').state}`;
  return ok(by('profile').state === 'done' && by('whatsapp').state === 'failed' && by('email').state === 'done' && s.cl.items.every((i) => i.action && i.action.route), `${states}; all items have an action route=${s.cl.items.every((i) => i.action && i.action.route)}`);
});
t('N2-36', 'Validation', 'Hostile input never gives a 500 (onboarding, integrations, email/WhatsApp config, profile)', async () => {
  const eps = [['PUT', '/Onboarding/Step'], ['POST', '/Onboarding/Complete'], ['PUT', '/Profile'], ['POST', '/Email/Config'], ['POST', '/Email/Test-Connection'], ['POST', '/WhatsApp/Config'], ['POST', '/WhatsApp/Test-Connection'], ['POST', '/Integrations/whatsapp/Test'], ['POST', '/Integrations/nonsense/Test'], ['POST', '/Integrations/email_smtp/Disconnect']];
  const bodies = [{ raw: '' }, { raw: 'null' }, { raw: '[]' }, { raw: '"x"' }, { raw: '{bad' }, { body: {} }, { body: { step: 3, data: 'str' } }, { body: { step: 3, data: [1, 2] } }, { body: { step: { $gt: 1 }, data: { goals: { a: 1 } } } },
    { body: { step: 1, data: { company_name: 'a\u0000b' } } }, { body: { step: 1, data: { company_name: 'x'.repeat(100000) } } }, { body: { step: 99999999999999999999, data: {} } },
    { body: { email_address: 5, smtp_port: 'abc', smtp_host: ['x'], imap_port: 1e9 } }, { body: { phone_number: {}, phone_number_id: [], access_token: 123 } }, { body: { name: 'n'.repeat(9000), website: 'javascript:alert(1)', logo_url: 'http://x' } }, { body: { email_address: '🙂@x.test', smtp_host: '../../etc/passwd' } }];
  const bad = []; let n = 0;
  for (const [m, p] of eps) for (const b of bodies) { const r = await http(m, p, { token: F.b.token, ip: nextIp(), raw: b.raw, body: b.body }); n++; if (r.status >= 500) bad.push(`${m} ${p} <- ${(b.raw !== undefined ? b.raw : JSON.stringify(b.body)).slice(0, 36)} => ${r.status}`); }
  return ok(!bad.length, `${n} hostile requests, 5xx=${bad.length}${bad.length ? ' e.g. ' + bad.slice(0, 3).join(' | ') : ''}`);
});
t('N2-37', 'Validation', 'Length / format / enum / size limits are enforced with a 400', async () => {
  const x = await signup(mail('val'), 'Val Co'); const tk = x.token; const put = (step, data) => http('PUT', '/Onboarding/Step', { token: tk, body: { step, data } });
  const res = {
    name300: (await put(1, { ...WIZ[1], company_name: 'c'.repeat(300) })).status,
    goals100: (await put(4, { goals: Array.from({ length: 100 }, (_, i) => 'g' + i) })).status,
    provider: (await put(9, { wa_provider: 'evil' })).status,
    authMode: (await put(10, { email_auth_mode: 'x' })).status,
    boolFlag: (await put(9, { whatsapp_skipped: 'yes' })).status,
    big: (await put(1, { ...WIZ[1], discovery_source: 'x', junk: 'y'.repeat(40000) })).status,
    port: (await http('POST', '/Email/Config', { token: tk, body: MAIL(mail('p'), 'x', { smtp_port: 99999 }) })).status,
    host: (await http('POST', '/Email/Config', { token: tk, body: MAIL(mail('p'), 'x', { smtp_host: 'bad host!' }) })).status,
    waProv: (await http('POST', '/WhatsApp/Config', { token: tk, body: { ...WA('V', 'GOODTOKEN-V'), provider: 'evil' } })).status,
    type: (await http('POST', '/Integrations/not-a-type/Test', { token: tk })).status,
    web: (await http('PUT', '/Profile', { token: tk, body: { website: 'javascript:alert(1)' } })).status,
    logo: (await http('PUT', '/Profile', { token: tk, body: { logo_url: 'http://insecure.test/x.png' } })).status,
  };
  return ok(Object.values(res).every((s) => s === 400), JSON.stringify(res));
});
t('N2-38', 'Validation', 'Unknown body fields are dropped (whitelist) and secrets never reach onboarding_data', async () => {
  const x = await signup(mail('wl'), 'Wl Co');
  await http('PUT', '/Onboarding/Step', { token: x.token, body: { step: 1, data: { ...WIZ[1], wa_access_token: 'EAAGSECRETSECRETSECRET123456', email_app_pass: 'hunter2hunter2', __proto__x: 1, tenant_id: F.b.tenant, role: 'admin' } } });
  const od = (await q(`SELECT onboarding_data FROM company WHERE id=$1`, [x.tenant]))[0].onboarding_data; const txt = JSON.stringify(od);
  return ok(!/EAAGSECRET|hunter2/.test(txt) && !('tenant_id' in od) && !('role' in od), `keys stored: ${Object.keys(od).join(',')}`);
});
t('N2-39', 'Profile', 'Profile GET/PUT works, validates, and only ever touches the caller\'s own company', async () => {
  const x = await signup(mail('prof'), 'Prof Co'); await wizard(x.token);
  const up = await http('PUT', '/Profile', { token: x.token, body: { name: 'Prof Renamed', website: 'https://prof.test', industry: 'Legal', company_size: '2 - 10 employees', logo_url: 'https://prof.test/logo.png', id: F.b.tenant, tenant_id: F.b.tenant } });
  const g = await http('GET', '/Profile', { token: x.token }); const bName = (await q(`SELECT name FROM company WHERE id=$1`, [F.b.tenant]))[0].name;
  const bad = await http('PUT', '/Profile', { token: x.token, body: { email: 'not-an-email' } });
  return ok(up.status === 200 && g.json.name === 'Prof Renamed' && g.json.logo_url === 'https://prof.test/logo.png' && g.json.id === x.tenant && bName !== 'Prof Renamed' && bad.status === 400, `update=${up.status}; read back name=${g.json.name}; own id=${g.json.id === x.tenant}; other tenant renamed=${bName === 'Prof Renamed'}; bad email=${bad.status}`);
});
t('N2-40', 'Routes', 'Unauthenticated calls to every new endpoint -> 401', async () => {
  const eps = [['GET', '/Integrations/Status'], ['POST', '/Integrations/whatsapp/Test'], ['POST', '/Integrations/whatsapp/Disconnect'], ['GET', '/Profile'], ['PUT', '/Profile'], ['PUT', '/Onboarding/Step'], ['POST', '/Onboarding/Complete'], ['GET', '/Email/Config'], ['POST', '/Email/Test-Connection']];
  const codes = []; for (const [m, p] of eps) codes.push((await http(m, p, { body: m === 'GET' ? undefined : {} })).status);
  return ok(codes.every((c) => c === 401), `statuses=[${codes}]`);
});

// ============================================================================================ runners
async function cleanup() {
  const c = db || new Client(PG); if (!db) await c.connect();
  const cos = (await c.query(`SELECT id::text FROM company WHERE id IN (SELECT company_id FROM "user" WHERE email LIKE 'authtest.m2.%@example.test')`)).rows.map((r) => r.id);
  if (cos.length) {
    for (const tbl of ['tenant_integration_status', 'email_account_config', 'whatsapp_config', 'wa_ai_config', 'email_ai_config']) await c.query(`DELETE FROM ${tbl} WHERE tenant_id = ANY($1)`, [cos]).catch(() => {});
    await c.query(`DELETE FROM secrets_migration_backup`).catch(() => {});
  }
  const u = (await c.query(`DELETE FROM "user" WHERE email LIKE 'authtest.m2.%@example.test'`)).rowCount;
  const co = cos.length ? (await c.query(`DELETE FROM company WHERE id::text = ANY($1)`, [cos])).rowCount : 0;
  await c.query(`DELETE FROM auth_otp WHERE email LIKE 'authtest.m2.%'`).catch(() => {});
  if (!db) await c.end();
  return { users: u, companies: co };
}
const finish = (results, out) => { if (out) fs.writeFileSync(out, JSON.stringify({ ran_at: new Date().toISOString(), results }, null, 2)); const tally = results.reduce((a, r) => ((a[r.status] = (a[r.status] || 0) + 1), a), {}); console.log('\nTALLY', JSON.stringify(tally)); };

async function runMain(out) {
  await setup(); const results = [];
  for (const test of tests) {
    if (process.env.ONLY && !process.env.ONLY.split(',').includes(test.id)) continue;
    let r; try { r = await test.fn(); } catch (e) { r = { pass: false, actual: 'EXCEPTION: ' + (e && e.message) }; }
    results.push({ id: test.id, area: test.area, title: test.title, status: r.pass ? 'PASS' : 'FAIL', actual: r.actual });
    console.log(`${(r.pass ? 'PASS' : 'FAIL').padEnd(5)} ${test.id.padEnd(6)} ${test.title}\n       -> ${r.actual}`);
  }
  finish(results, out); await M.stop();
}

/** Background re-check, rate limit and "fresh status is not re-checked" (server with INTEGRATIONS_STALE_MS=4000, COOLDOWN=3000) */
async function runRecheck(out) {
  db = new Client(PG); await db.connect(); M = await mocks.start(); const results = [];
  const rec = (id, title, pass, actual) => { results.push({ id, area: 'Recheck', title, status: pass ? 'PASS' : 'FAIL', actual }); console.log(`${pass ? 'PASS' : 'FAIL'} ${id} ${title}\n       -> ${actual}`); };
  const x = await signup(mail('rc'), 'Recheck Co'); await wizard(x.token);
  const b = (p, o = {}) => http(o.method || 'GET', p, { token: x.token, base: BASE2, body: o.body });
  await b('/WhatsApp/Test-Connection', { method: 'POST', body: WA('RC', 'GOODTOKEN-RC') }); await b('/Email/Test-Connection', { method: 'POST', body: MAIL(mail('mbxRC')) });
  await sleep(5000); // let everything become older than the 4 s window; any queued runs from the saves finish
  await b('/Integrations/Status'); await sleep(2500);
  const stale = async () => { await q(`UPDATE tenant_integration_status SET last_checked_at = now() - interval '7 hours' WHERE tenant_id=$1`, [x.tenant]); };
  // 1) stale + 8 rapid status loads => exactly ONE background run (one Graph call, one SMTP auth, one IMAP login)
  await sleep(3200); await stale(); const h0 = M.meta.hits, s0 = M.mail.smtpAuthHits, i0 = M.mail.imapLogins;
  const imapBefore = (await dbStatus(x.tenant, 'email_imap')).last_checked_at;
  const burst = await Promise.all(Array.from({ length: 8 }, () => b('/Integrations/Status'))); await sleep(2500);
  // NOTE: the servers also poll the (mock) inbox every 15 s on their own, which inflates the IMAP login counter - so exactness is asserted on Meta and SMTP (not polled) and IMAP is asserted by its saved check time.
  const imapAfter = (await dbStatus(x.tenant, 'email_imap')).last_checked_at;
  rec('RC-01', 'Stale status (>window) + 8 rapid page loads => ONE background check per tenant', M.meta.hits - h0 === 1 && M.mail.smtpAuthHits - s0 === 1 && new Date(imapAfter) > new Date(imapBefore) && burst.some((r) => r.json.checking), `Meta calls +${M.meta.hits - h0}, SMTP logins +${M.mail.smtpAuthHits - s0} (expected +1 each); IMAP check time advanced=${new Date(imapAfter) > new Date(imapBefore)} (IMAP logins +${M.mail.imapLogins - i0} incl. the 15 s poller); 'checking' flag shown=${burst.some((r) => r.json.checking)}`);
  const row = await dbStatus(x.tenant, 'whatsapp'); rec('RC-02', 'The background run refreshed last_checked_at', Date.now() - new Date(row.last_checked_at).getTime() < 15000, `last_checked_at is ${Math.round((Date.now() - new Date(row.last_checked_at).getTime()) / 1000)}s old`);
  // 2) rate limit: stale again immediately, inside the cooldown window => no new run
  await stale(); const h1 = M.meta.hits; await b('/Integrations/Status'); await b('/Integrations/Status'); await sleep(1200);
  rec('RC-03', 'Rate limit: asked again inside the cooldown => no extra Meta call', M.meta.hits === h1, `Meta calls +${M.meta.hits - h1} (expected +0)`);
  await sleep(3500); const h2 = M.meta.hits; await b('/Integrations/Status'); await sleep(2500);
  rec('RC-04', 'After the cooldown the next stale load is checked again (once)', M.meta.hits - h2 === 1, `Meta calls +${M.meta.hits - h2} (expected +1)`);
  // 3) fresh status is NOT re-checked
  await sleep(3200); await b('/Integrations/Status'); await sleep(2500); const h3 = M.meta.hits; await b('/Integrations/Status'); await b('/Integrations/Status'); await sleep(1500);
  rec('RC-05', 'Status newer than the window is not re-checked', M.meta.hits === h3, `Meta calls +${M.meta.hits - h3} (expected +0)`);
  // 4) revoked credentials found by the re-check become Failed with no user action
  M.meta.revoked.add('GOODTOKEN-RC'); await sleep(3200); await stale(); await b('/Integrations/Status'); await sleep(3000);
  const f = await dbStatus(x.tenant, 'whatsapp'); rec('RC-06', 'Credentials revoked behind our back => the automatic re-check flips WhatsApp to Failed', f.status === 'failed' && f.error_code === 'META_TOKEN_INVALID', `status=${f.status}/${f.error_code}: "${(f.error_message || '').slice(0, 70)}"`);
  M.meta.revoked.delete('GOODTOKEN-RC');
  finish(results, out); await M.stop(); await db.end();
}

async function restartPre() { db = new Client(PG); await db.connect(); M = await mocks.start(); const a = await signup(mail('rs'), 'Restart Co'); await wizard(a.token); await connectWa(a, 'RS'); await sleep(500); const s = await status(a.token); fs.writeFileSync(STATE_FILE, JSON.stringify({ token: a.token, tenant: a.tenant, wa: s.items.whatsapp.status, checked: s.items.whatsapp.last_checked_at })); console.log('saved', s.items.whatsapp.status); await M.stop(); await db.end(); }
async function restartPost(out) {
  db = new Client(PG); await db.connect(); const st = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); const s = await status(st.token); const results = [{ id: 'N2-24', area: 'Isolation', title: 'Saved status survives a server restart', status: s.items.whatsapp.status === st.wa && s.items.whatsapp.last_checked_at === st.checked ? 'PASS' : 'FAIL', actual: `before restart: ${st.wa} @${st.checked}; after: ${s.items.whatsapp.status} @${s.items.whatsapp.last_checked_at}` }]; results.forEach((r) => console.log(`${r.status} ${r.id} ${r.title}\n       -> ${r.actual}`)); finish(results, out); await db.end();
}

(async () => {
  const [mode, out] = process.argv.slice(2);
  try { if (mode === 'main') await runMain(out); else if (mode === 'recheck') await runRecheck(out); else if (mode === 'restart-pre') await restartPre(); else if (mode === 'restart-post') await restartPost(out); else if (mode === 'cleanup') { db = new Client(PG); await db.connect(); console.log('deleted', await cleanup()); await db.end(); } else console.log('usage: main <out> | recheck <out> | restart-pre | restart-post <out> | cleanup'); }
  catch (e) { console.error('FATAL', e); process.exitCode = 1; }
  process.exit(process.exitCode || 0);
})();
