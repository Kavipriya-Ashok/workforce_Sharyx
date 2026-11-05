/* eslint-disable */
/**
 * The new Module 2 code must work BEFORE migrations/1731100000000-IntegrationStatus.sql (and before the secret
 * encryption script) is applied - exactly the situation of `nest start --watch` against a database nobody migrated yet.
 * Runs against a scratch DB restored from a backup with NO migration applied (default sharyx_m2_unmigrated, server :8002).
 *   node test/module2/compat-premigration.cjs
 */
const crypto = require('crypto');
const path = require('path');
const { Client } = require('pg');
const mocks = require('./mocks.cjs');

const BASE = process.env.BASE || 'http://127.0.0.1:8002/api/v1';
const PG = { host: '127.0.0.1', port: 5433, user: 'scratch', password: 'scratch', database: process.env.DB_NAME || 'sharyx_m2_unmigrated' };
if (!/^sharyx_m2/.test(PG.database)) { console.error('scratch DB only'); process.exit(2); }
let n = 0;
const http = async (method, p, { body, token } = {}) => {
  const res = await fetch(BASE + p, { method, headers: { 'content-type': 'application/json', 'x-forwarded-for': `10.7.${(n >> 8) & 255}.${(n++ % 250) + 1}`, ...(token ? { authorization: 'Bearer ' + token } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const t = await res.text(); let j = null; try { j = JSON.parse(t); } catch {}
  return { status: res.status, json: j, text: t };
};
const hash = (pw) => { const s = crypto.randomBytes(16); return `scrypt$${s.toString('hex')}$${crypto.scryptSync(pw, s, 64).toString('hex')}`; };
const results = [];
const check = (name, pass, actual) => { results.push({ name, pass }); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}\n      -> ${actual}`); };

(async () => {
  const db = new Client(PG); await db.connect(); const M = await mocks.start();
  const tbl = (await db.query(`select to_regclass('tenant_integration_status') r`)).rows[0].r;
  const cols = (await db.query(`select count(*)::int c from information_schema.columns where table_name='user' and column_name='token_version'`)).rows[0].c;
  console.log(`schema under test: tenant_integration_status=${tbl}, user.token_version columns=${cols} (expected null and 0)\n`);
  const role = (await db.query(`select id from user_role where code='ADMIN'`)).rows[0];
  const co = (await db.query(`insert into company(name,email,address,postal_code,country_id,currency_id,onboarding_completed,onboarding_step,status) select 'Compat Co','owner@compat.test','1 St','600001',(select id from country limit 1),(select id from currency limit 1),false,1,true returning id`)).rows[0];
  const email = `authtest.m2compat.${Date.now().toString(36)}@example.test`;
  await db.query(`insert into "user"(email,first_name,last_name,password,user_role_id,company_id,status) values($1,'C','T',$2,$3,$4,true)`, [email, hash('Str0ng!Passw0rd'), role.id, co.id]);
  const lg = await http('POST', '/Auth/Login', { body: { email, password: 'Str0ng!Passw0rd' } }); const token = lg.json && lg.json.result && lg.json.result.api_token;
  check('Login works', lg.status < 300 && !!token, `HTTP ${lg.status}`);

  const st = await http('GET', '/Integrations/Status', { token });
  check('Status loads without the table (in-memory fallback), reports durable=false', st.status === 200 && st.json.durable === false && st.json.items.length === 6, `HTTP ${st.status}; durable=${st.json && st.json.durable}`);
  const wa = await http('POST', '/WhatsApp/Test-Connection', { token, body: { phone_number: '+15550100100', phone_number_id: 'PNID-CMP-1', access_token: 'GOODTOKEN-CMP', provider: 'meta_cloud' } });
  const st2 = await http('GET', '/Integrations/Status', { token });
  check('WhatsApp test saves Connected (memory) and Status shows it', wa.status < 300 && st2.json.items.find((i) => i.type === 'whatsapp').status === 'connected', `test HTTP ${wa.status}; status=${st2.json.items.find((i) => i.type === 'whatsapp').status}`);
  const bad = await http('POST', '/WhatsApp/Test-Connection', { token, body: { phone_number: '+15550100100', phone_number_id: 'PNID-CMP-1', access_token: 'REVOKED-CMP', provider: 'meta_cloud' } });
  const st3 = await http('GET', '/Integrations/Status', { token });
  check('Failed test saves Failed + reason (memory)', bad.status === 400 && st3.json.items.find((i) => i.type === 'whatsapp').status === 'failed' && !!st3.json.items.find((i) => i.type === 'whatsapp').error_message, `status=${st3.json.items.find((i) => i.type === 'whatsapp').status}`);
  const em = await http('POST', '/Email/Test-Connection', { token, body: { email_address: 'box@compat.test', smtp_host: '127.0.0.1', smtp_port: 9102, smtp_user: 'box@compat.test', smtp_password: 'good-app-password', imap_host: '127.0.0.1', imap_port: 9103, use_ssl: false } });
  check('Email test works (SMTP + IMAP)', em.status < 300, `HTTP ${em.status}: ${(em.json && (em.json.Message || em.json.message) || '').slice(0, 70)}`);
  const cfg = await http('GET', '/Email/Config', { token });
  check('GET /Email/Config is secret-free on the old schema', cfg.status === 200 && !/"(client_secret|smtp_password|access_token|refresh_token)"/.test(cfg.text) && !cfg.text.includes('good-app-password'), `has_password=${cfg.json && cfg.json.has_password}`);
  const d = await http('POST', '/Integrations/whatsapp/Disconnect', { token });
  const waRow = (await db.query(`select access_token from whatsapp_config where tenant_id=$1`, [co.id])).rows[0];
  check('Disconnect erases the token (old schema)', d.status < 300 && waRow.access_token === '', `token erased=${waRow.access_token === ''}`);
  const steps = [[1, { company_name: 'Compat Co', business_email: 'owner@compat.test' }], [2, { address: '1 St', city: 'Chennai', state: 'TN', pincode: '600001' }], [3, { industry: 'IT', selected_services: ['a'] }], [4, { goals: ['g'] }], [6, { apps: ['x'] }]];
  let ok = true; for (const [step, data] of steps) ok = ok && (await http('PUT', '/Onboarding/Step', { token, body: { step, data } })).status === 200;
  const c1 = await http('POST', '/Onboarding/Complete', { token }); const c2 = await http('POST', '/Onboarding/Complete', { token });
  check('Onboarding steps + Complete (twice) work on the old schema', ok && c1.status < 300 && c2.status < 300, `steps ok=${ok}; complete=${c1.status}/${c2.status}`);
  const pr = await http('PUT', '/Profile', { token, body: { name: 'Compat Renamed' } });
  check('Profile update works', pr.status === 200 && pr.json.name === 'Compat Renamed', `HTTP ${pr.status}`);

  await db.query(`delete from whatsapp_config where tenant_id=$1`, [co.id]); await db.query(`delete from email_account_config where tenant_id=$1`, [co.id]);
  await db.query(`delete from "user" where email like 'authtest.m2compat.%'`); await db.query(`delete from company where id=$1`, [co.id]);
  await M.stop(); await db.end();
  const failed = results.filter((r) => !r.pass).length; console.log(`\n${results.length - failed}/${results.length} passed`); process.exit(failed ? 1 : 0);
})().catch((e) => { console.error('FATAL', e); process.exit(2); });
