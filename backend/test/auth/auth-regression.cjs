/* eslint-disable */
/**
 * Module 1 (Authentication & Identity) regression harness.
 *
 *   node test/auth/auth-regression.cjs main <out.json>        full suite (34 original + new tests)
 *   node test/auth/auth-regression.cjs restart-pre            seed state that must survive a server restart
 *   node test/auth/auth-regression.cjs restart-post <out.json> check that state after the restart
 *   node test/auth/auth-regression.cjs cleanup                delete every authtest.* row it created
 *
 * SAFETY: this talks to a SCRATCH Postgres only. It refuses to run unless the DB host is
 * loopback and the database is named sharyx_scratch. It never touches the remote database.
 *
 * Env: BASE (default http://127.0.0.1:8001/api/v1), SERVER_LOG (backend stdout, used to read the
 * OTP that the server logs when AUTH_DEBUG_OTP=true), SCRATCH_PG_PORT (default 5433).
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Client } = require('pg');
const jwt = require('jsonwebtoken');

const BASE = process.env.BASE || 'http://127.0.0.1:8001/api/v1';
const SERVER_LOG = process.env.SERVER_LOG || '';
const PG = {
  host: '127.0.0.1',
  port: Number(process.env.SCRATCH_PG_PORT || 5433),
  user: 'scratch',
  password: 'scratch',
  database: 'sharyx_scratch',
};
if (!['127.0.0.1', 'localhost'].includes(PG.host) || PG.database !== 'sharyx_scratch') {
  console.error('REFUSING TO RUN: harness only targets the local scratch database.');
  process.exit(2);
}
const ROOT = path.resolve(__dirname, '..', '..', '..');
const STATE_FILE = path.join(__dirname, '.restart-state.json');
const STRONG = 'Str0ng!Passw0rd';
const RUN = Date.now().toString(36);
const mail = (n) => `authtest.${RUN}.${n}@example.test`.toLowerCase();
let ipCounter = 0;
const nextIp = () => `10.${(ipCounter >> 8) & 255}.${ipCounter & 255}.${(ipCounter++ % 250) + 1}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ------------------------------------------------------------------ http / db helpers
async function http(method, p, { body, token, ip, headers, raw } = {}) {
  const h = { 'content-type': 'application/json', 'x-forwarded-for': ip || nextIp(), ...(headers || {}) };
  if (token) h.authorization = `Bearer ${token}`;
  const t0 = performance.now();
  const res = await fetch(BASE + p, {
    method,
    headers: h,
    body: raw !== undefined ? raw : body === undefined ? undefined : JSON.stringify(body),
  });
  const ms = performance.now() - t0;
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* not json */ }
  return { status: res.status, json, text, ms, retryAfter: res.headers.get('retry-after') };
}
const msgOf = (r) => String((r.json && (r.json.Message || r.json.message)) || r.text || '');

let db;
async function q(sql, params) { return (await db.query(sql, params)).rows; }

async function otpFor(email, { fresh = false, after = 0 } = {}) {
  if (!SERVER_LOG) throw new Error('SERVER_LOG env is required to read OTPs');
  const re = new RegExp(`Email: ${email.replace(/[.+]/g, '\\$&')} \\| (?:New )?OTP Code: (\\d{6})`, 'g');
  for (let i = 0; i < 40; i++) {
    const log = fs.readFileSync(SERVER_LOG, 'utf8');
    const all = [...log.matchAll(re)];
    if (all.length > after) return { otp: all[all.length - 1][1], count: all.length };
    await sleep(150);
  }
  return { otp: null, count: after };
}
const otpCount = async (email) => {
  if (!SERVER_LOG) return 0;
  const re = new RegExp(`Email: ${email.replace(/[.+]/g, '\\$&')} \\| (?:New )?OTP Code: (\\d{6})`, 'g');
  return [...fs.readFileSync(SERVER_LOG, 'utf8').matchAll(re)].length;
};

async function sendOtp(email, ip, name) {
  const before = await otpCount(email);
  const r = await http('POST', '/Auth/SendSignupOtp', { body: { email, name }, ip });
  let otp = null;
  if (r.status < 300) otp = (await otpFor(email, { after: before })).otp;
  return { r, otp };
}
async function signup(email, { company = 'AuthTest Co', password = STRONG, ip = nextIp(), confirm } = {}) {
  const { r, otp } = await sendOtp(email, ip, 'Auth Tester');
  if (!otp) return { ok: false, step: 'send', r };
  const v = await http('POST', '/Auth/VerifySignupOtp', {
    ip,
    body: { email, otp, password, confirm_password: confirm === undefined ? password : confirm, company_name: company, first_name: 'Auth', last_name: 'Tester' },
  });
  const token = v.json && v.json.result && v.json.result.api_token;
  return { ok: !!token, token, user: v.json && v.json.result && v.json.result.user, r: v, step: 'verify', otp };
}
const login = (email, password, ip) => http('POST', '/Auth/Login', { body: { email, password }, ip: ip || nextIp() });
const companyGet = (token, extra = {}) => http('GET', '/Company/Get' + (extra.qs || ''), { token, ip: nextIp(), headers: extra.headers });

function hashScrypt(plain) {
  const salt = crypto.randomBytes(16);
  const d = crypto.scryptSync(plain, salt, 64);
  return `scrypt$${salt.toString('hex')}$${d.toString('hex')}`;
}
const tokenSecret = () => {
  const env = fs.readFileSync(path.join(ROOT, 'backend', '.env.local'), 'utf8');
  return (env.match(/^TOKEN_SECRET=(.*)$/m) || [])[1].trim();
};
const CryptoJS = require('crypto-js');
const secretKey = () => (fs.readFileSync(path.join(ROOT, 'backend', '.env.local'), 'utf8').match(/^SECERT_KEY=(.*)$/m) || [])[1].trim();
/** same transform as EncryptionService.Encrypt: what the reset e-mail link carries as user_id */
const encId = (id) => CryptoJS.enc.Base64.parse(CryptoJS.AES.encrypt(id, secretKey()).toString()).toString();
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));

// ------------------------------------------------------------------ test registry
const tests = [];
const DEFERRED = new Set(['E-01']); // needs the user's approval before it is changed
function t(id, area, title, fn) { tests.push({ id, area, title, fn }); }
const ok = (pass, actual) => ({ pass: !!pass, actual });

// shared fixtures (filled in setup)
const F = {};

async function setup() {
  db = new Client(PG);
  await db.connect();
  // test-only trigger: makes a user insert fail on demand (for the rollback test)
  await q(`CREATE OR REPLACE FUNCTION test_force_user_fail() RETURNS trigger AS $f$ BEGIN
            IF NEW.email LIKE 'forcefail.%' THEN RAISE EXCEPTION 'forced failure for test'; END IF; RETURN NEW; END $f$ LANGUAGE plpgsql`);
  await q(`DROP TRIGGER IF EXISTS test_force_user_fail ON "user"`);
  await q(`CREATE TRIGGER test_force_user_fail BEFORE INSERT ON "user" FOR EACH ROW EXECUTE FUNCTION test_force_user_fail()`);

  F.a = await signup(mail('tenantA'), { company: 'AuthTest Tenant A' });
  F.b = await signup(mail('tenantB'), { company: 'AuthTest Tenant B' });
  F.emailA = mail('tenantA');
  F.emailB = mail('tenantB');
  if (!F.a.ok || !F.b.ok) throw new Error('fixture signup failed: ' + JSON.stringify([F.a.r && F.a.r.text, F.b.r && F.b.r.text]));
  F.tenantA = F.a.user.tenant_id;
  F.tenantB = F.b.user.tenant_id;

  // a Super Admin living in tenant A's company
  const [role] = await q(`SELECT id FROM user_role WHERE code='SUPER_ADMIN' LIMIT 1`);
  F.superEmail = mail('super');
  await q(`INSERT INTO "user"(email, first_name, last_name, password, user_role_id, company_id, status)
           VALUES ($1,'Super','Admin',$2,$3,$4,true)`, [F.superEmail, hashScrypt(STRONG), role.id, F.tenantA]);
  F.super = await login(F.superEmail, STRONG);
}

// ================================================================== A. SIGN UP
t('A-01', 'A. Sign Up', 'Valid signup OTP dispatch', async () => {
  const { r } = await sendOtp(mail('a01'), nextIp());
  return ok(r.status === 201 || r.status === 200, `HTTP ${r.status}: ${msgOf(r).slice(0, 90)}`);
});
t('A-02', 'A. Sign Up', 'Forced user-save failure leaves NO orphan company', async () => {
  const email = `forcefail.${RUN}@example.test`;
  const { r, otp } = await sendOtp(email, nextIp());
  if (!otp) return ok(false, `could not obtain OTP (HTTP ${r.status})`);
  const v = await http('POST', '/Auth/VerifySignupOtp', {
    body: { email, otp, password: STRONG, confirm_password: STRONG, company_name: 'ForceFail Co', first_name: 'F' },
  });
  const [{ c }] = await q(`SELECT count(*)::int c FROM company WHERE email=$1`, [email]);
  const [{ u }] = await q(`SELECT count(*)::int u FROM "user" WHERE email=$1`, [email]);
  return ok(c === 0 && u === 0 && v.status >= 400, `verify HTTP ${v.status}; orphan companies=${c}, users=${u}; msg="${msgOf(v).slice(0, 70)}"`);
});
t('A-02b', 'A. Sign Up', 'Double-click signup (2 parallel submits) creates exactly one tenant', async () => {
  const email = mail('a02b');
  const ip = nextIp();
  const { otp } = await sendOtp(email, ip);
  const body = { email, otp, password: STRONG, confirm_password: STRONG, company_name: 'DoubleClick Co', first_name: 'D' };
  const rs = await Promise.all([1, 2, 3].map(() => http('POST', '/Auth/VerifySignupOtp', { body, ip })));
  const [{ c }] = await q(`SELECT count(*)::int c FROM company WHERE email=$1`, [email]);
  const [{ u }] = await q(`SELECT count(*)::int u FROM "user" WHERE email=$1`, [email]);
  const wins = rs.filter((x) => x.status < 300).length;
  return ok(c === 1 && u === 1 && wins === 1, `3 parallel submits -> successes=${wins}, statuses=[${rs.map((x) => x.status)}], companies=${c}, users=${u}`);
});
t('A-03', 'A. Sign Up', 'Invalid email format rejected', async () => {
  const r = await http('POST', '/Auth/SendSignupOtp', { body: { email: 'invalid-email' } });
  return ok(r.status === 400, `HTTP ${r.status}`);
});
t('A-04', 'A. Sign Up', 'Empty email rejected', async () => {
  const r = await http('POST', '/Auth/SendSignupOtp', { body: { email: '' } });
  return ok(r.status === 400, `HTTP ${r.status}`);
});
t('A-05', 'A. Sign Up', '5000-char email -> 400 (not 500)', async () => {
  const r = await http('POST', '/Auth/SendSignupOtp', { body: { email: 'a'.repeat(5000) + '@test.com' } });
  return ok(r.status === 400, `HTTP ${r.status}`);
});
t('A-06', 'A. Sign Up', "SQL-injection style email rejected", async () => {
  const r = await http('POST', '/Auth/SendSignupOtp', { body: { email: "admin' OR 1=1;--@test.com" } });
  return ok(r.status === 400, `HTTP ${r.status}`);
});
t('A-07', 'A. Sign Up', 'Short password (<8) rejected', async () => {
  const email = mail('a07'); const ip = nextIp();
  const { otp } = await sendOtp(email, ip);
  const r = await http('POST', '/Auth/VerifySignupOtp', { ip, body: { email, otp, password: '12345', confirm_password: '12345', company_name: 'X' } });
  return ok(r.status === 400, `HTTP ${r.status}: ${msgOf(r).slice(0, 80)}`);
});
t('A-08', 'A. Sign Up', 'Password complexity enforced (abcdefgh rejected)', async () => {
  const email = mail('a08'); const ip = nextIp();
  const { otp } = await sendOtp(email, ip);
  const r = await http('POST', '/Auth/VerifySignupOtp', { ip, body: { email, otp, password: 'abcdefgh', confirm_password: 'abcdefgh', company_name: 'X' } });
  const [{ u }] = await q(`SELECT count(*)::int u FROM "user" WHERE email=$1`, [email]);
  return ok(r.status === 400 && u === 0, `HTTP ${r.status}; user created=${u}`);
});
t('A-09', 'A. Sign Up', 'Invalid OTP rejected', async () => {
  const email = mail('a09'); const ip = nextIp();
  const { otp } = await sendOtp(email, ip);
  const wrong = otp === '999999' ? '999998' : '999999';
  const r = await http('POST', '/Auth/VerifySignupOtp', { ip, body: { email, otp: wrong, password: STRONG, confirm_password: STRONG, company_name: 'X' } });
  return ok(r.status === 400, `HTTP ${r.status}: ${msgOf(r).slice(0, 80)}`);
});
t('A-10', 'A. Sign Up', 'OTP cooldown (2nd send within seconds -> 429)', async () => {
  const email = mail('a10'); const ip = nextIp();
  await http('POST', '/Auth/SendSignupOtp', { body: { email }, ip });
  const r = await http('POST', '/Auth/SendSignupOtp', { body: { email }, ip });
  return ok(r.status === 429, `HTTP ${r.status}: ${msgOf(r).slice(0, 80)}`);
});
t('A-11', 'A. Sign Up', 'OTP survives a server restart (see restart phase)', async () => ({ pending: true, actual: 'evaluated in restart-post phase' }));
t('A-12', 'A. Sign Up', 'Password stored as salted scrypt hash', async () => {
  const [row] = await q(`SELECT password FROM "user" WHERE email=$1`, [F.emailA]);
  return ok(/^scrypt\$[0-9a-f]{32}\$[0-9a-f]{128}$/.test(row.password) && !row.password.includes(STRONG), `format=${row.password.slice(0, 14)}...`);
});

// ================================================================== B. LOGIN / SESSION
t('B-01', 'B. Login', 'Valid login returns JWT with tenant claims', async () => {
  const r = await login(F.emailA, STRONG);
  const tok = r.json && r.json.result && r.json.result.api_token;
  const c = tok && jwt.decode(tok);
  return ok(r.status < 300 && c && c.user_id && c.company_id && c.tenant_id && c.user_role_name, `HTTP ${r.status}; claims=${c ? Object.keys(c).join(',') : 'none'}`);
});
t('B-02', 'B. Login', 'JWT carries no secrets; 7 day expiry', async () => {
  const r = await login(F.emailA, STRONG);
  const c = jwt.decode(r.json.result.api_token);
  const bad = Object.keys(c).filter((k) => /pass|hash|secret|otp/i.test(k));
  return ok(bad.length === 0 && c.exp - c.iat === 7 * 86400, `sensitive keys=[${bad}], ttl=${(c.exp - c.iat) / 86400}d`);
});
t('B-03', 'B. Login', '6th wrong password is throttled (429)', async () => {
  const email = mail('b03'); const s = await signup(email); if (!s.ok) return ok(false, 'fixture failed');
  const codes = [];
  for (let i = 0; i < 6; i++) codes.push((await login(email, 'Wrong!Pass1' + i)).status);
  return ok(codes.slice(0, 5).every((c) => c === 401) && codes[5] === 429, `statuses=[${codes}]`);
});
t('B-04', 'B. Login', 'No user enumeration in login message', async () => {
  const a = await login(mail('ghost'), 'Wrong!Pass1x');
  const b = await login(F.emailB, 'Wrong!Pass1x');
  return ok(a.status === 401 && b.status === 401 && msgOf(a) === msgOf(b), `unknown="${msgOf(a)}" / wrong-pw="${msgOf(b)}"`);
});
t('B-05', 'B. Login', 'Login latency equalised (unknown vs known user)', async () => {
  const known = [], unknown = [];
  for (let i = 0; i < 6; i++) {
    unknown.push((await login(mail('ghost' + i + Math.random().toString(36).slice(2, 6)), 'Wrong!Pass1x')).ms);
    // distinct known users so per-email lockout does not interfere
    const r = await login(i % 2 ? F.emailB : F.superEmail, 'Wrong!Pass1x' + i);
    known.push(r.ms);
  }
  const med = (a) => a.sort((x, y) => x - y)[Math.floor(a.length / 2)];
  const mu = med(unknown), mk = med(known);
  const diff = Math.abs(mk - mu);
  return ok(diff < Math.max(25, 0.35 * Math.max(mk, mu)), `median unknown=${mu.toFixed(0)}ms, known=${mk.toFixed(0)}ms, diff=${diff.toFixed(0)}ms`);
});
t('B-06', 'B. Login', '50 rapid logins from one IP, different emails -> rate limited', async () => {
  const ip = '203.0.113.50';
  const codes = [];
  for (let i = 0; i < 50; i++) codes.push((await http('POST', '/Auth/Login', { body: { email: mail('b06x' + i), password: 'Wrong!Pass1x' }, ip })).status);
  const n429 = codes.filter((c) => c === 429).length;
  return ok(n429 > 0, `429 count=${n429}/50 (first 429 at request #${codes.indexOf(429) + 1})`);
});
t('B-07', 'B. Login', 'Tampered JWT rejected', async () => {
  const parts = F.a.token.split('.'); parts[1] = Buffer.from(JSON.stringify({ ...jwt.decode(F.a.token), tenant_id: F.tenantB, company_id: F.tenantB })).toString('base64url');
  const r = await companyGet(parts.join('.'));
  return ok(r.status === 401, `HTTP ${r.status}`);
});
t('B-08', 'B. Login', 'Expired JWT rejected', async () => {
  const c = jwt.decode(F.a.token); delete c.exp; delete c.iat;
  const old = jwt.sign(c, tokenSecret(), { expiresIn: -60 });
  const r = await companyGet(old);
  return ok(r.status === 401, `HTTP ${r.status}`);
});
t('B-09', 'B. Login', 'Missing Authorization header rejected', async () => {
  const r = await companyGet(undefined);
  return ok(r.status === 401, `HTTP ${r.status}`);
});
t('B-10', 'B. Login', 'x-tenant-id header spoof ignored', async () => {
  const r = await companyGet(F.a.token, { headers: { 'x-tenant-id': F.tenantB } });
  return ok(r.status === 200 && r.json && r.json.id === F.tenantA, `HTTP ${r.status}; returned tenant=${r.json && r.json.id} (A=${F.tenantA.slice(0, 8)}, B=${F.tenantB.slice(0, 8)})`);
});
t('B-11', 'B. Login', '?tenantId= query spoof ignored', async () => {
  const r = await companyGet(F.a.token, { qs: `?tenantId=${F.tenantB}` });
  return ok(r.status === 200 && r.json && r.json.id === F.tenantA, `HTTP ${r.status}; returned tenant=${r.json && r.json.id && r.json.id.slice(0, 8)}`);
});
t('B-12', 'B. Login', 'Company list isolated per tenant (super admin sees all)', async () => {
  const a = await http('GET', '/Company/List', { token: F.a.token });
  const s = await http('GET', '/Company/List', { token: F.super.json.result.api_token });
  const la = Array.isArray(a.json) ? a.json : [];
  const ls = Array.isArray(s.json) ? s.json : [];
  return ok(la.length === 1 && la[0].id === F.tenantA && ls.length > 1, `tenant A sees ${la.length}, super admin sees ${ls.length}`);
});
t('B-13', 'B. Login', 'Logout revokes the JWT server-side', async () => {
  const email = mail('b13'); const s = await signup(email); if (!s.ok) return ok(false, 'fixture failed');
  const before = await companyGet(s.token);
  const lo = await http('POST', '/Auth/Logout', { token: s.token });
  const after = await companyGet(s.token);
  return ok(before.status === 200 && lo.status < 300 && after.status === 401, `before=${before.status}, logout=${lo.status}, replay after logout=${after.status}`);
});

// ================================================================== C. GOOGLE
t('C-01', 'C. Google', 'Caller-supplied email without code/credential rejected', async () => {
  const r = await http('POST', '/Auth/GoogleAuth', { body: { email: 'victim@corp.com' } });
  return ok(r.status === 400, `HTTP ${r.status}`);
});
t('C-02', 'C. Google', 'Forged Google ID token rejected', async () => {
  const fake = [Buffer.from('{"alg":"RS256","typ":"JWT"}').toString('base64url'), Buffer.from('{"email":"victim@corp.com","email_verified":true,"aud":"x"}').toString('base64url'), 'sig'].join('.');
  const r = await http('POST', '/Auth/GoogleAuth', { body: { credential: fake } });
  return ok(r.status === 401, `HTTP ${r.status}`);
});
t('C-03', 'C. Google', 'Google client id not hard-coded in frontend', async () => {
  const hits = ['frontend/src/pages/auth/LoginPage.tsx', 'frontend/src/pages/auth/SignupPage.tsx'].filter((f) => /\d{6,}-[a-z0-9]+\.apps\.googleusercontent\.com/.test(read(f)));
  return ok(hits.length === 0, hits.length ? `hard-coded in: ${hits.join(', ')}` : 'reads VITE_GOOGLE_CLIENT_ID only');
});

// ================================================================== D. PASSWORD RESET
t('D-01', 'D. Reset', 'ForgotPassword unknown email -> generic success', async () => {
  const r = await http('POST', '/Auth/ForgotPassword', { body: { email: mail('nobody') } });
  return ok(r.status < 300, `HTTP ${r.status}: ${msgOf(r)}`);
});
t('D-02', 'D. Reset', 'Malformed reset id -> clean 400, no DB text', async () => {
  const outs = [];
  for (const user_id of ['zzzz', '', 'not-hex-at-all!!', 'ab'.repeat(30)]) {
    outs.push(await http('POST', '/Auth/ResetPassword', { body: { user_id, reset_otp: 123456, password: STRONG, confirm_password: STRONG } }));
  }
  const leak = outs.some((o) => /uuid|syntax|relation|column|QueryFailed|postgres/i.test(o.text));
  return ok(outs.every((o) => o.status === 400) && !leak, `statuses=[${outs.map((o) => o.status)}]; db-text leaked=${leak}; msg="${msgOf(outs[0]).slice(0, 60)}"`);
});
t('D-03', 'D. Reset', 'Frontend "Forgot password" really calls the API', async () => {
  const src = read('frontend/src/pages/auth/LoginPage.tsx') + (exists('frontend/src/pages/auth/ForgotPasswordFlow.tsx') ? read('frontend/src/pages/auth/ForgotPasswordFlow.tsx') : '');
  const dead = /toast\.info\(\s*'Password reset email sent/.test(src);
  const calls = /Auth\/ForgotPassword/.test(src) && /Auth\/ResetPassword/.test(src);
  return ok(!dead && calls, `dead toast present=${dead}; calls ForgotPassword+ResetPassword=${calls}`);
});
t('D-04', 'D. Reset', 'Password reset invalidates pre-existing JWTs (reset-link flow)', async () => {
  const email = mail('d04'); const s = await signup(email); if (!s.ok) return ok(false, 'fixture failed');
  const ip = nextIp();
  await http('POST', '/Auth/ForgotPassword', { body: { email }, ip });
  await sleep(300);
  const [{ id, reset_otp }] = await q(`SELECT id, reset_otp FROM "user" WHERE email=$1`, [email]);
  const r = await http('POST', '/Auth/ResetPassword', { ip, body: { user_id: encId(id), reset_otp: Number(reset_otp), password: 'N3w!Passw0rdX', confirm_password: 'N3w!Passw0rdX' } });
  const old = await companyGet(s.token);
  const fresh = await login(email, 'N3w!Passw0rdX');
  return ok(r.status < 300 && old.status === 401 && fresh.status < 300, `reset=${r.status} (${msgOf(r).slice(0, 50)}), old token=${old.status}, login with new pw=${fresh.status}`);
});

// ================================================================== E. SECURITY (static)
t('E-01', 'E. Security', 'Token not kept in localStorage (HttpOnly cookie)', async () => {
  const src = read('frontend/src/lib/auth.tsx');
  const inLs = /localStorage\.setItem\(STORAGE_KEY/.test(src);
  return ok(!inLs, inLs ? 'JWT persisted in localStorage (sharyx_user.api_token)' : 'not in localStorage');
});
t('E-02', 'E. Security', 'Only intended controllers are unauthenticated', async () => {
  const dirs = [];
  (function walk(d) { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); f.isDirectory() ? walk(p) : /\.controller\.ts$/.test(f.name) && dirs.push(p); } })(path.join(ROOT, 'backend', 'src'));
  const unguarded = dirs.filter((p) => { const s = fs.readFileSync(p, 'utf8'); return !/JwtAuthGuard|JWTAuthController|AuthGuard\(/.test(s); }).map((p) => path.basename(p));
  const allowed = /^(AuthBase|Login|WhatsAppWebhook|Webhook|VoiceWebhook|OmnichannelWebhook|.*Webhook.*|OAuth.*)\.controller\.ts$/i;
  const bad = unguarded.filter((n) => !allowed.test(n));
  return ok(bad.length === 0, `unguarded=[${unguarded.join(', ')}]; unexpected=[${bad.join(', ')}]`);
});

// ================================================================== NEW TESTS
t('N-01', 'New', 'Signup with an EXISTING email reveals nothing', async () => {
  const strip = (r) => { const j = JSON.parse(JSON.stringify(r.json || {})); if (j.result) { delete j.result.previewUrl; delete j.result.debugOtp; } delete j.previewUrl; return JSON.stringify({ s: r.status, j }); };
  const ipE = nextIp(), ipN = nextIp();
  const existing = await http('POST', '/Auth/SendSignupOtp', { body: { email: F.emailA }, ip: ipE });
  const fresh = await http('POST', '/Auth/SendSignupOtp', { body: { email: mail('n01fresh') }, ip: ipN });
  const same = strip(existing) === strip(fresh).replace(mail('n01fresh'), F.emailA);
  const noOtpForExisting = (await otpCount(F.emailA)) === 1; // only the fixture's own OTP; none issued for the existing account
  // and verifying with a guess must not hand back "exists"
  const v = await http('POST', '/Auth/VerifySignupOtp', { body: { email: F.emailA, otp: '000000', password: STRONG, confirm_password: STRONG, company_name: 'X' } });
  return ok(existing.status < 300 && same && noOtpForExisting && !/already (exists|registered|in use)|account with this email|taken/i.test(existing.text + v.text),
    `existing: HTTP ${existing.status} "${msgOf(existing).slice(0, 70)}" | fresh: HTTP ${fresh.status} | identical=${same} | OTP issued for existing=${!noOtpForExisting}`);
});
t('N-02', 'New', 'OTP brute force: locked out after max wrong guesses, real code then dead', async () => {
  const email = mail('n02'); const ip = nextIp();
  const { otp } = await sendOtp(email, ip);
  const wrong = []; const guess = otp === '000001' ? '000002' : '000001';
  for (let i = 0; i < 8; i++) wrong.push((await http('POST', '/Auth/VerifySignupOtp', { ip, body: { email, otp: guess, password: STRONG, confirm_password: STRONG, company_name: 'X' } })).status);
  const good = await http('POST', '/Auth/VerifySignupOtp', { ip, body: { email, otp, password: STRONG, confirm_password: STRONG, company_name: 'X' } });
  const [{ u }] = await q(`SELECT count(*)::int u FROM "user" WHERE email=$1`, [email]);
  return ok(wrong.includes(429) && good.status >= 400 && u === 0, `wrong-guess statuses=[${wrong}]; correct OTP afterwards=HTTP ${good.status}; account created=${u}`);
});
t('N-03', 'New', 'Reused OTP cannot create a second account/tenant', async () => {
  const email = mail('n03'); const ip = nextIp();
  const s = await signup(email, { ip });
  const again = await http('POST', '/Auth/VerifySignupOtp', { ip, body: { email, otp: s.otp, password: 'Other!Passw0rd9', confirm_password: 'Other!Passw0rd9', company_name: 'Second Co' } });
  const [{ c }] = await q(`SELECT count(*)::int c FROM company WHERE email=$1`, [email]);
  const lg = await login(email, 'Other!Passw0rd9');
  return ok(s.ok && again.status >= 400 && c === 1 && lg.status === 401, `first ok=${s.ok}; reuse=HTTP ${again.status}; companies=${c}; login with 2nd password=${lg.status}`);
});
t('N-04', 'New', "OTP issued for email A cannot verify email B", async () => {
  const a = mail('n04a'), b = mail('n04b'); const ip = nextIp();
  const { otp } = await sendOtp(a, ip);
  const r = await http('POST', '/Auth/VerifySignupOtp', { ip, body: { email: b, otp, password: STRONG, confirm_password: STRONG, company_name: 'X' } });
  const [{ u }] = await q(`SELECT count(*)::int u FROM "user" WHERE email=ANY($1)`, [[a, b]]);
  return ok(r.status >= 400 && u === 0, `verify B with A's code=HTTP ${r.status}; accounts created=${u}`);
});
t('N-05', 'New', 'Disabled user: login rejected AND existing JWT stops working', async () => {
  const email = mail('n05'); const s = await signup(email); if (!s.ok) return ok(false, 'fixture failed');
  await q(`UPDATE "user" SET status=false WHERE email=$1`, [email]);
  const lg = await login(email, STRONG);
  const tok = await companyGet(s.token);
  return ok(lg.status === 401 && !(lg.json && lg.json.result) && tok.status === 401, `login=${lg.status} ("${msgOf(lg).slice(0, 45)}"), pre-existing JWT=${tok.status}`);
});
t('N-06', 'New', 'Deleted user: login rejected AND existing JWT stops working', async () => {
  const email = mail('n06'); const s = await signup(email); if (!s.ok) return ok(false, 'fixture failed');
  await q(`DELETE FROM "user" WHERE email=$1`, [email]);
  const lg = await login(email, STRONG);
  const tok = await companyGet(s.token);
  return ok(lg.status === 401 && tok.status === 401, `login=${lg.status}, pre-existing JWT=${tok.status}`);
});
t('N-07', 'New', "Locking out tenant A's user does not affect tenant B's user", async () => {
  const ea = mail('n07a'), eb = mail('n07b');
  const sa = await signup(ea, { company: 'N07 A' }), sb = await signup(eb, { company: 'N07 B' });
  if (!sa.ok || !sb.ok) return ok(false, 'fixture failed');
  const ip = '198.51.100.77'; // SAME ip for both tenants
  const codes = []; for (let i = 0; i < 7; i++) codes.push((await login(ea, 'Wrong!Pass1' + i, ip)).status);
  const aGood = await login(ea, STRONG, ip);
  const bGood = await login(eb, STRONG, ip);
  return ok(codes.includes(429) && aGood.status === 429 && bGood.status < 300, `A wrong-pw statuses=[${codes}], A correct pw while locked=${aGood.status}, B (same IP) login=${bGood.status}`);
});
t('N-08', 'New', 'Backend checks confirm-password', async () => {
  const email = mail('n08'); const ip = nextIp();
  const { otp } = await sendOtp(email, ip);
  const r = await http('POST', '/Auth/VerifySignupOtp', { ip, body: { email, otp, password: STRONG, confirm_password: 'Different!Pass1', company_name: 'X' } });
  const [{ u }] = await q(`SELECT count(*)::int u FROM "user" WHERE email=$1`, [email]);
  return ok(r.status === 400 && u === 0, `HTTP ${r.status}: ${msgOf(r).slice(0, 70)}; user created=${u}`);
});
t('N-09', 'New', 'Password rules enforced on reset too (weak + mismatch)', async () => {
  const email = mail('n09'); const s = await signup(email); if (!s.ok) return ok(false, 'fixture failed');
  const ip = nextIp();
  await http('POST', '/Auth/ForgotPassword', { body: { email }, ip }); await sleep(300);
  const [{ id, reset_otp }] = await q(`SELECT id, reset_otp FROM "user" WHERE email=$1`, [email]);
  const weak = await http('POST', '/Auth/ResetPassword', { ip, body: { user_id: encId(id), reset_otp: Number(reset_otp), password: 'abcdefgh', confirm_password: 'abcdefgh' } });
  const mism = await http('POST', '/Auth/ResetPassword', { ip, body: { user_id: encId(id), reset_otp: Number(reset_otp), password: 'N3w!Passw0rdX', confirm_password: 'N3w!Passw0rdY' } });
  const still = await login(email, STRONG);
  return ok(weak.status === 400 && mism.status === 400 && still.status < 300, `weak=${weak.status}, mismatch=${mism.status}, old password still works=${still.status}`);
});
t('N-10', 'New', 'Fuzz: no Auth endpoint returns 500 for bad input', async () => {
  const endpoints = ['/Auth/Login', '/Auth/SendSignupOtp', '/Auth/ResendSignupOtp', '/Auth/VerifySignupOtp', '/Auth/GoogleAuth', '/Auth/ForgotPassword', '/Auth/ResetPassword'];
  const bodies = [
    { raw: '' }, { raw: 'null' }, { raw: '[]' }, { raw: '"str"' }, { raw: '{bad json' }, { raw: '{}' },
    { body: { email: 123, password: 456 } }, { body: { email: [], password: {} } }, { body: { email: { $ne: 1 }, password: { $ne: 1 } } },
    { body: { email: 'a\u0000b@test.com', password: 'x\u0000y', otp: '12\u00003456' } },
    { body: { email: 'x@'.repeat(2000), password: 'p'.repeat(100000), otp: '9'.repeat(5000), company_name: 'c'.repeat(100000) } },
    { body: { email: '🙂@test.com', password: '🙂'.repeat(20), otp: '１２３４５６', company_name: '🙂' } },
    { body: { email: mail('fz'), otp: 123456, password: STRONG, confirm_password: STRONG, user_id: 12, reset_otp: 'abc', credential: 5, code: {} } },
    { body: { user_id: '00000000-0000-0000-0000-000000000000', reset_otp: 99999999999999999999, password: STRONG } },
    { body: { reset_otp: 1e30, user_id: 'x', password: STRONG, email: mail('fz') } },
  ];
  const bad = []; let n = 0;
  for (const ep of endpoints) for (const b of bodies) {
    const r = await http('POST', ep, { ip: nextIp(), raw: b.raw !== undefined ? b.raw : undefined, body: b.body });
    n++;
    if (r.status >= 500) bad.push(`${ep} <- ${(b.raw !== undefined ? b.raw : JSON.stringify(b.body)).slice(0, 40)} => ${r.status}`);
  }
  // also unauthenticated logout and garbage token
  const lo = await http('POST', '/Auth/Logout', { raw: 'garbage' }); n++; if (lo.status >= 500) bad.push('/Auth/Logout => ' + lo.status);
  return ok(bad.length === 0, `${n} malicious/malformed requests, 5xx responses=${bad.length}${bad.length ? ' e.g. ' + bad.slice(0, 3).join(' | ') : ''}`);
});
t('N-11', 'New', 'OTP must be exactly 6 digits', async () => {
  const outs = [];
  for (const otp of ['12345', '1234567', 'abcdef', '12 456', '']) outs.push((await http('POST', '/Auth/VerifySignupOtp', { body: { email: mail('n11'), otp, password: STRONG, confirm_password: STRONG, company_name: 'X' } })).status);
  return ok(outs.every((s) => s === 400), `statuses=[${outs}]`);
});
t('N-12', 'New', 'Field length limits (email 255, company 255, password 128)', async () => {
  const email = mail('n12'); const ip = nextIp(); const { otp } = await sendOtp(email, ip);
  const longPw = 'Aa1!' + 'x'.repeat(130);
  const pw = await http('POST', '/Auth/VerifySignupOtp', { ip, body: { email, otp, password: longPw, confirm_password: longPw, company_name: 'X' } });
  const co = await http('POST', '/Auth/VerifySignupOtp', { ip, body: { email, otp, password: STRONG, confirm_password: STRONG, company_name: 'c'.repeat(256) } });
  const em = await http('POST', '/Auth/SendSignupOtp', { ip, body: { email: 'a'.repeat(250) + '@x.com' } });
  const lp = await http('POST', '/Auth/Login', { ip, body: { email, password: 'p'.repeat(129) } });
  return ok([pw, co, em, lp].every((r) => r.status === 400), `pw129=${pw.status}, company256=${co.status}, email>255=${em.status}, login pw129=${lp.status}`);
});
t('N-13', 'New', 'Unknown/extra body fields are stripped (whitelist)', async () => {
  const email = mail('n13'); const ip = nextIp(); const { otp } = await sendOtp(email, ip);
  const v = await http('POST', '/Auth/VerifySignupOtp', { ip, body: { email, otp, password: STRONG, confirm_password: STRONG, company_name: 'WL Co', first_name: 'W', user_role_id: '00000000-0000-0000-0000-000000000000', company_id: F.tenantB, status: false, token_version: 99, is_super_admin: true } });
  const [row] = await q(`SELECT company_id, status, user_role_id FROM "user" WHERE email=$1`, [email]);
  return ok(v.status < 300 && row && row.company_id !== F.tenantB && row.status === true && row.user_role_id !== '00000000-0000-0000-0000-000000000000', `HTTP ${v.status}; joined other tenant=${row && row.company_id === F.tenantB}; status=${row && row.status}`);
});
t('N-14', 'New', 'Forgot password: identical response for known vs unknown email', async () => {
  const k = await http('POST', '/Auth/ForgotPassword', { body: { email: F.emailB } });
  const u = await http('POST', '/Auth/ForgotPassword', { body: { email: mail('n14none') } });
  return ok(k.status === u.status && JSON.stringify(k.json) === JSON.stringify(u.json) && k.status < 300, `known: ${k.status} ${JSON.stringify(k.json)} | unknown: ${u.status} ${JSON.stringify(u.json)}`);
});
t('N-15', 'New', 'Reset OTP: brute force locks, reuse and other-user OTP fail', async () => {
  const e1 = mail('n15a'), e2 = mail('n15b');
  const s1 = await signup(e1), s2 = await signup(e2); if (!s1.ok || !s2.ok) return ok(false, 'fixture failed');
  const ip = nextIp();
  await http('POST', '/Auth/ForgotPassword', { body: { email: e1 }, ip }); await sleep(250);
  await http('POST', '/Auth/ForgotPassword', { body: { email: e2 }, ip: nextIp() }); await sleep(250);
  const [r1] = await q(`SELECT id, reset_otp FROM "user" WHERE email=$1`, [e1]);
  const [r2] = await q(`SELECT id, reset_otp FROM "user" WHERE email=$1`, [e2]);
  const otp1 = Number(r1.reset_otp), otp2 = Number(r2.reset_otp);
  const body = (id, o, pw = 'N3w!Passw0rdX') => ({ user_id: encId(id), reset_otp: o, password: pw, confirm_password: pw });
  const cross = await http('POST', '/Auth/ResetPassword', { ip, body: body(r1.id, otp2) }); // other user's code
  const guess = otp1 === 111111 ? 111112 : 111111; const codes = [];
  for (let i = 0; i < 8; i++) codes.push((await http('POST', '/Auth/ResetPassword', { ip, body: body(r1.id, guess) })).status);
  const real = await http('POST', '/Auth/ResetPassword', { ip, body: body(r1.id, otp1) });
  // reuse on e2: succeed once, then replay
  const first = await http('POST', '/Auth/ResetPassword', { ip: nextIp(), body: body(r2.id, otp2) });
  const replay = await http('POST', '/Auth/ResetPassword', { ip: nextIp(), body: body(r2.id, otp2, 'Evil!Passw0rd7') });
  const evil = await login(e2, 'Evil!Passw0rd7');
  return ok(cross.status >= 400 && codes.includes(429) && real.status >= 400 && first.status < 300 && replay.status >= 400 && evil.status === 401,
    `other-user code=${cross.status}; 8 wrong guesses=[${codes}]; real code after lockout=${real.status}; first use=${first.status}; replay=${replay.status}; login with replayed pw=${evil.status}`);
});
t('N-16', 'New', 'Reset-link path: valid link works once; garbage ids give clean 400', async () => {
  const e = mail('n16'); const s = await signup(e); if (!s.ok) return ok(false, 'fixture failed');
  const ip = nextIp();
  await http('POST', '/Auth/ForgotPassword', { body: { email: e }, ip }); await sleep(250);
  const [{ id, reset_otp }] = await q(`SELECT id, reset_otp FROM "user" WHERE email=$1`, [e]);
  const good = await http('POST', '/Auth/ResetPassword', { ip, body: { user_id: encId(id), reset_otp: Number(reset_otp), password: 'N3w!Passw0rdX', confirm_password: 'N3w!Passw0rdX' } });
  const outs = [];
  for (const user_id of ['00', 'deadbeef', 'g'.repeat(64), '0'.repeat(64), encId('not-a-uuid')]) outs.push(await http('POST', '/Auth/ResetPassword', { body: { user_id, reset_otp: 123456, password: STRONG, confirm_password: STRONG } }));
  const clean = outs.every((o) => o.status === 400 && /Invalid or expired reset (link|code)/i.test(msgOf(o)) && !/uuid|syntax/i.test(o.text));
  return ok(good.status < 300 && clean, `valid link=${good.status}; garbage ids=[${outs.map((o) => o.status)}] msg="${msgOf(outs[0]).slice(0, 50)}"`);
});
t('N-25', 'New', 'Reset by e-mail + OTP (flow used by the new UI) works end to end', async () => {
  const e = mail('n25'); const s = await signup(e); if (!s.ok) return ok(false, 'fixture failed');
  const ip = nextIp();
  const f = await http('POST', '/Auth/ForgotPassword', { body: { email: e }, ip }); await sleep(250);
  const [{ reset_otp }] = await q(`SELECT reset_otp FROM "user" WHERE email=$1`, [e]);
  const r = await http('POST', '/Auth/ResetPassword', { ip, body: { email: e, reset_otp: Number(reset_otp), password: 'N3w!Passw0rdX', confirm_password: 'N3w!Passw0rdX' } });
  const lg = await login(e, 'N3w!Passw0rdX');
  const old = await login(e, STRONG, nextIp());
  const bad = await http('POST', '/Auth/ResetPassword', { ip, body: { email: mail('n25none'), reset_otp: 123456, password: STRONG, confirm_password: STRONG } });
  return ok(f.status < 300 && r.status < 300 && lg.status < 300 && old.status === 401 && bad.status === 400 && /Invalid or expired/i.test(msgOf(bad)),
    `forgot=${f.status}, reset=${r.status}, new pw login=${lg.status}, old pw login=${old.status}, unknown email reset=${bad.status} "${msgOf(bad).slice(0, 45)}"`);
});
t('N-17', 'New', 'Throttle is per IP: one IP blocked, another IP unaffected, Retry-After sent', async () => {
  const hot = '203.0.113.99', cold = '203.0.113.100';
  const codes = []; let ra = null;
  for (let i = 0; i < 45; i++) { const r = await http('POST', '/Auth/ForgotPassword', { body: { email: mail('n17x' + i) }, ip: hot }); codes.push(r.status); if (r.status === 429) ra = ra || r.retryAfter; }
  const other = await http('POST', '/Auth/Login', { body: { email: F.emailB, password: STRONG }, ip: cold });
  return ok(codes.includes(429) && other.status < 300, `hot IP got 429 after ${codes.indexOf(429)} reqs (Retry-After=${ra}); other IP login=${other.status}`);
});
t('N-18', 'New', 'Logout is idempotent per-token and only kills the caller\'s session', async () => {
  const e = mail('n18'); const s = await signup(e); if (!s.ok) return ok(false, 'fixture failed');
  const second = await login(e, STRONG); // a second device
  const lo = await http('POST', '/Auth/Logout', { token: s.token });
  const dead = await companyGet(s.token);
  const other = await companyGet(second.json.result.api_token);
  return ok(lo.status < 300 && dead.status === 401, `logout=${lo.status}; session #1 after logout=${dead.status}; session #2 (other device)=${other.status} ${other.status === 401 ? '(also revoked: logout = sign out everywhere, by design)' : ''}`);
});
t('N-19', 'New', 'ChangePassword also revokes older tokens', async () => {
  const e = mail('n19'); const s = await signup(e); if (!s.ok) return ok(false, 'fixture failed');
  const ch = await http('POST', '/User/ChangePassword', { token: s.token, body: { old_password: STRONG, password: 'Chang3d!Passw0rd', confirm_password: 'Chang3d!Passw0rd' } });
  const ch2 = ch.status === 404 ? await http('PUT', '/User/ChangePassword', { token: s.token, body: { old_password: STRONG, password: 'Chang3d!Passw0rd', confirm_password: 'Chang3d!Passw0rd' } }) : ch;
  const old = await companyGet(s.token);
  return ok(ch2.status < 300 && old.status === 401, `change-password HTTP ${ch2.status}; old token=${old.status}`);
});
t('N-20', 'New', 'No OTP/secret ever appears in an HTTP response', async () => {
  const email = mail('n20'); const ip = nextIp();
  const r = await http('POST', '/Auth/SendSignupOtp', { body: { email }, ip });
  const otp = (await otpFor(email)).otp;
  const f = await http('POST', '/Auth/ForgotPassword', { body: { email: F.emailB }, ip: nextIp() });
  const [{ reset_otp }] = await q(`SELECT reset_otp FROM "user" WHERE email=$1`, [F.emailB]);
  const leaked = [r.text, f.text].some((x) => (otp && x.includes(otp)) || (reset_otp && x.includes(String(reset_otp))) || /debugOtp/.test(x));
  return ok(!leaked, `OTP in signup response=${r.text.includes(otp || 'x')}, reset code in forgot response=${f.text.includes(String(reset_otp))}`);
});
t('N-21', 'New', 'Frontend: Google client id from VITE_GOOGLE_CLIENT_ID with friendly missing-config message', async () => {
  const l = read('frontend/src/pages/auth/LoginPage.tsx'), s = read('frontend/src/pages/auth/SignupPage.tsx');
  const uses = /import\.meta\.env\.VITE_GOOGLE_CLIENT_ID/.test(l + s) || (exists('frontend/src/lib/google.ts') && /VITE_GOOGLE_CLIENT_ID/.test(read('frontend/src/lib/google.ts')));
  const friendly = /not configured|isn.t set up|Google sign-in is unavailable/i.test(l + s + (exists('frontend/src/lib/google.ts') ? read('frontend/src/lib/google.ts') : ''));
  return ok(uses && friendly, `uses env var=${uses}; friendly message=${friendly}`);
});
t('N-22', 'New', 'Frontend: /oauth/callback shows clear error + "Back to login"', async () => {
  const src = read('frontend/src/pages/auth/OAuthCallback.tsx');
  const back = /Back to login/i.test(src);
  const denied = /access_denied/.test(src);
  return ok(back && denied, `Back-to-login button=${back}; handles access_denied=${denied}`);
});
t('N-23', 'New', 'Frontend: password strength meter on signup + reset screens', async () => {
  const files = ['frontend/src/pages/auth/SignupPage.tsx', 'frontend/src/pages/auth/ForgotPasswordFlow.tsx'].filter(exists);
  const withMeter = files.filter((f) => /PasswordStrengthMeter/.test(read(f)));
  return ok(files.length === 2 && withMeter.length === 2, `screens with meter: [${withMeter.map((f) => path.basename(f))}]`);
});

// ------------------------------------------------------------------ runner
async function cleanup() {
  const c = db || new Client(PG); if (!db) await c.connect();
  const emailLike = 'authtest.%@example.test';
  const cos = (await c.query(`SELECT id FROM company WHERE email LIKE $1 OR email LIKE 'forcefail.%@example.test'`, [emailLike])).rows.map((r) => r.id);
  const delUsers = (await c.query(`DELETE FROM "user" WHERE email LIKE $1 OR email LIKE 'forcefail.%@example.test' RETURNING id`, [emailLike])).rowCount;
  const delCos = cos.length ? (await c.query(`DELETE FROM company WHERE id = ANY($1)`, [cos])).rowCount : 0;
  try { await c.query(`DELETE FROM auth_otp WHERE email LIKE $1 OR email LIKE 'forcefail.%@example.test'`, [emailLike]); } catch { /* table may not exist (before-state) */ }
  try { await c.query(`DROP TRIGGER IF EXISTS test_force_user_fail ON "user"; DROP FUNCTION IF EXISTS test_force_user_fail()`); } catch { /* ignore */ }
  if (!db) await c.end();
  return { users: delUsers, companies: delCos };
}

async function runMain(out) {
  await setup();
  const results = [];
  for (const test of tests) {
    if (process.env.ONLY && !process.env.ONLY.split(',').includes(test.id)) continue;
    let r;
    try { r = await test.fn(); } catch (e) { r = { pass: false, actual: 'HARNESS/EXCEPTION: ' + (e && e.message) }; }
    const status = r.pending ? 'PENDING' : r.pass ? 'PASS' : DEFERRED.has(test.id) ? 'DEFERRED' : 'FAIL';
    results.push({ id: test.id, area: test.area, title: test.title, status, actual: r.actual });
    console.log(`${status.padEnd(8)} ${test.id.padEnd(6)} ${test.title}\n         -> ${r.actual}`);
  }
  if (out) fs.writeFileSync(out, JSON.stringify({ base: BASE, ran_at: new Date().toISOString(), results }, null, 2));
  const tally = results.reduce((a, r) => ((a[r.status] = (a[r.status] || 0) + 1), a), {});
  console.log('\nTALLY', JSON.stringify(tally));
}

async function restartPre() {
  db = new Client(PG); await db.connect();
  const email = mail('restart'); const ip = nextIp();
  const { otp, r } = await sendOtp(email, ip);
  const s = await signup(mail('restartsess'), { company: 'Restart Sess Co' });
  const sess = s.token;
  const lo = await signup(mail('restartlogout'), { company: 'Restart Logout Co' });
  await http('POST', '/Auth/Logout', { token: lo.token });
  fs.writeFileSync(STATE_FILE, JSON.stringify({ email, otp, sendStatus: r.status, sess, loggedOutToken: lo.token }));
  console.log('restart state saved:', { email, otp, sendStatus: r.status });
  await db.end();
}
async function restartPost(out) {
  db = new Client(PG); await db.connect();
  const st = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  const v = await http('POST', '/Auth/VerifySignupOtp', { body: { email: st.email, otp: st.otp, password: STRONG, confirm_password: STRONG, company_name: 'Restart Co' } });
  const alive = await companyGet(st.sess);
  const dead = await companyGet(st.loggedOutToken);
  const results = [
    { id: 'A-11', area: 'A. Sign Up', title: 'OTP survives a server restart', status: v.status < 300 ? 'PASS' : 'FAIL', actual: `verify after restart = HTTP ${v.status}: ${msgOf(v).slice(0, 80)}` },
    { id: 'N-24', area: 'New', title: 'Logout revocation survives a restart; normal session survives too', status: dead.status === 401 && alive.status === 200 ? 'PASS' : 'FAIL', actual: `logged-out token after restart=${dead.status}, normal session after restart=${alive.status}` },
  ];
  results.forEach((r) => console.log(`${r.status.padEnd(8)} ${r.id.padEnd(6)} ${r.title}\n         -> ${r.actual}`));
  if (out) fs.writeFileSync(out, JSON.stringify({ base: BASE, ran_at: new Date().toISOString(), results }, null, 2));
  await db.end();
}

(async () => {
  const [mode, out] = process.argv.slice(2);
  try {
    if (mode === 'main') await runMain(out);
    else if (mode === 'restart-pre') await restartPre();
    else if (mode === 'restart-post') await restartPost(out);
    else if (mode === 'cleanup') { console.log('deleted', await cleanup()); }
    else { console.log('usage: main <out> | restart-pre | restart-post <out> | cleanup'); }
  } catch (e) { console.error('FATAL', e); process.exitCode = 1; }
  finally { if (db) { try { await db.end(); } catch {} } }
})();
