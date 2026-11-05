/* eslint-disable */
/**
 * Proves the new auth code is safe to deploy BEFORE migrations/1731000000000-AuthHardening.sql is applied:
 * runs against a scratch DB that still has the OLD schema (no user.token_version / reset_otp_attempts / auth_otp).
 *
 *   BASE=http://127.0.0.1:8002/api/v1 node test/auth/compat-premigration.cjs
 */
const crypto = require('crypto');
const { Client } = require('pg');
const CryptoJS = require('crypto-js');
const fs = require('fs');
const path = require('path');
const BASE = process.env.BASE || 'http://127.0.0.1:8002/api/v1';
const PG = { host: '127.0.0.1', port: 5433, user: 'scratch', password: 'scratch', database: 'sharyx_unmigrated' };
const ROOT = path.resolve(__dirname, '..', '..', '..');
const KEY = (fs.readFileSync(path.join(ROOT, 'backend', '.env.local'), 'utf8').match(/^SECERT_KEY=(.*)$/m) || [])[1].trim();
const encId = (id) => CryptoJS.enc.Base64.parse(CryptoJS.AES.encrypt(id, KEY).toString()).toString();
const PW = 'Str0ng!Passw0rd';
let n = 0;
const http = async (method, p, { body, token } = {}) => {
  const res = await fetch(BASE + p, { method, headers: { 'content-type': 'application/json', 'x-forwarded-for': `10.9.${(n >> 8) & 255}.${(n++ % 250) + 1}`, ...(token ? { authorization: 'Bearer ' + token } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const t = await res.text(); let j = null; try { j = JSON.parse(t); } catch {}
  return { status: res.status, json: j, text: t };
};
const hash = (pw) => { const s = crypto.randomBytes(16); return `scrypt$${s.toString('hex')}$${crypto.scryptSync(pw, s, 64).toString('hex')}`; };
const results = [];
const check = (name, pass, actual) => { results.push({ name, pass }); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}\n      -> ${actual}`); };

(async () => {
  const db = new Client(PG); await db.connect();
  const cols = (await db.query(`select column_name from information_schema.columns where table_name='user' and column_name in ('token_version','reset_otp_attempts')`)).rowCount;
  const tbl = (await db.query(`select 1 from information_schema.tables where table_name='auth_otp'`)).rowCount;
  console.log(`schema under test: token_version/reset_otp_attempts columns present=${cols}, auth_otp table present=${tbl}  (expected 0 and 0)\n`);
  const [role] = (await db.query(`select id from user_role where code='ADMIN'`)).rows;
  const [co] = (await db.query(`select id from company limit 1`)).rows;
  const email = `authtest.compat.${Date.now().toString(36)}@example.test`;
  const ins = await db.query(`insert into "user"(email,first_name,last_name,password,user_role_id,company_id,status) values($1,'C','T',$2,$3,$4,true) returning id`, [email, hash(PW), role.id, co.id]);
  const uid = ins.rows[0].id;

  const lg = await http('POST', '/Auth/Login', { body: { email, password: PW } });
  const token = lg.json && lg.json.result && lg.json.result.api_token;
  check('Login works on the old schema', lg.status < 300 && !!token, `HTTP ${lg.status}`);
  const claim = token && JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
  check('JWT is issued with token_version 0', claim && claim.token_version === 0, `token_version=${claim && claim.token_version}`);
  const api = await http('GET', '/Company/Get', { token });
  check('Authenticated API call works (session check degrades gracefully)', api.status === 200, `HTTP ${api.status}`);
  const lo = await http('POST', '/Auth/Logout', { token });
  check('Logout does not crash before the migration', lo.status < 300, `HTTP ${lo.status} (revocation is inactive until migrated, a warning is logged)`);

  await http('POST', '/Auth/ForgotPassword', { body: { email } });
  await new Promise((r) => setTimeout(r, 300));
  const [{ reset_otp }] = (await db.query(`select reset_otp from "user" where id=$1`, [uid])).rows;
  const wrong = []; const g = Number(reset_otp) === 111111 ? 111112 : 111111;
  for (let i = 0; i < 6; i++) wrong.push((await http('POST', '/Auth/ResetPassword', { body: { user_id: encId(uid), reset_otp: g, password: PW + 'x', confirm_password: PW + 'x' } })).status);
  check('Reset-code brute force still limited (in-memory fallback counter)', wrong.includes(429), `statuses=[${wrong}]`);
  await http('POST', '/Auth/ForgotPassword', { body: { email } }); // cooldown may swallow this; re-seed the code directly if so
  await db.query(`update "user" set reset_otp=424242, reset_otp_expires_at=now()+interval '5 minutes' where id=$1`, [uid]);
  const rs = await http('POST', '/Auth/ResetPassword', { body: { user_id: encId(uid), reset_otp: 424242, password: 'N3w!Passw0rdX', confirm_password: 'N3w!Passw0rdX' } });
  const lg2 = await http('POST', '/Auth/Login', { body: { email, password: 'N3w!Passw0rdX' } });
  check('Password reset works on the old schema', rs.status < 300 && lg2.status < 300, `reset HTTP ${rs.status}, login with new password HTTP ${lg2.status}`);

  const su = await http('POST', '/Auth/SendSignupOtp', { body: { email: `authtest.compat2.${Date.now().toString(36)}@example.test` } });
  check('Signup answers a clean 503 (not 500) until migrated', su.status === 503 && !/auth_otp|relation|42P01/i.test(su.text), `HTTP ${su.status}: ${(su.json && su.json.Message) || su.text.slice(0, 80)}`);

  await db.query(`delete from "user" where email like 'authtest.%@example.test'`);
  await db.end();
  const failed = results.filter((r) => !r.pass).length;
  console.log(`\n${results.length - failed}/${results.length} passed`);
  process.exitCode = failed ? 1 : 0;
})().catch((e) => { console.error('FATAL', e); process.exitCode = 2; });
