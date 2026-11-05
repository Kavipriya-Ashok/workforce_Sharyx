/* eslint-disable */
/**
 * Module 3 / Phase 0 - two-tenant isolation baseline. SCRATCH DB ONLY (loopback + sharyx_m3*).
 *
 * The SAME customer phone (+91 98765 43210) and the SAME e-mail talk to Tenant A (job candidate) and Tenant B
 * (product demo + booking). Then it proves nothing of A is visible in B:  leads, conversations, meeting_info, prompt,
 * company name, stored agent memory, the LLM context, the e-mails and the WhatsApp credentials used.
 *
 *   cd backend && node -r ts-node/register/transpile-only -r tsconfig-paths/register test/module3/phase0-two-tenant.cjs <out.json>
 *   env: BASE (default http://127.0.0.1:8001/api/v1), SERVER_LOG, SMTP_SERVER_PATH, DB_NAME (default sharyx_m3)
 * The server must run with WHATSAPP_GRAPH_URL / LLM_OPENAI_BASE_URL pointing at the fakes in mocks.cjs.
 */
require('reflect-metadata');
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const { DataSource } = require('typeorm');
const mocks = require('./mocks.cjs');

const BASE = process.env.BASE || 'http://127.0.0.1:8001/api/v1';
const SERVER_LOG = process.env.SERVER_LOG || '';
const DBNAME = process.env.DB_NAME || 'sharyx_m3';
const OUT = process.argv[2] || path.join(__dirname, 'phase0-results.json');
if (!/^sharyx_m3/.test(DBNAME)) { console.error('REFUSING: scratch databases only'); process.exit(2); }
const PG = { host: '127.0.0.1', port: 5433, user: 'scratch', password: 'scratch', database: DBNAME };
const SRC = path.resolve(__dirname, '..', '..', 'src');
const STRONG = 'Str0ng!Passw0rd';
const RUN = Date.now().toString(36);
const PHONE = '919876543210';                       // the SAME customer in both tenants
const SHARED_EMAIL = 'customer@example.test';      // the SAME e-mail in both tenants
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ipc = 0; const ip = () => `10.3.${(ipc >> 8) & 255}.${(ipc++ % 250) + 1}`;
const results = []; let db, M, ds;
const rec = (id, area, title, pass, actual) => { results.push({ id, area, title, status: pass ? 'PASS' : 'FAIL', actual }); console.log(`${pass ? 'PASS' : 'FAIL'}  ${id}  ${title}\n      -> ${actual}`); };
const q = async (sql, p) => (await db.query(sql, p)).rows;

async function http(method, p, { body, token } = {}) {
  const r = await fetch(BASE + p, { method, headers: { 'content-type': 'application/json', 'x-forwarded-for': ip(), ...(token ? { authorization: 'Bearer ' + token } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const text = await r.text(); let json = null; try { json = JSON.parse(text); } catch {}
  return { status: r.status, json, text };
}
async function signup(email, company) {
  await http('POST', '/Auth/SendSignupOtp', { body: { email } });
  let otp = null; const re = new RegExp(`Email: ${email.replace(/[.+]/g, '\\$&')} \\| (?:New )?OTP Code: (\\d{6})`, 'g');
  for (let i = 0; i < 40 && !otp; i++) { const all = [...fs.readFileSync(SERVER_LOG, 'utf8').matchAll(re)]; if (all.length) otp = all[all.length - 1][1]; else await sleep(150); }
  const v = await http('POST', '/Auth/VerifySignupOtp', { body: { email, otp, password: STRONG, confirm_password: STRONG, company_name: company, first_name: 'T' } });
  if (!v.json || !v.json.result) throw new Error(`signup failed for ${email}: HTTP ${v.status} ${v.text.slice(0, 200)} (otp found: ${!!otp})`);
  return { token: v.json.result.api_token, tenant: v.json.result.user.tenant_id, company };
}
const webhook = (phoneId, text, name) => fetch(BASE + '/WhatsApp/Webhook', { method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': ip() }, body: JSON.stringify({ entry: [{ id: 'WABA', changes: [{ field: 'messages', value: { messaging_product: 'whatsapp', metadata: { display_phone_number: '15550100100', phone_number_id: phoneId }, contacts: [{ profile: { name }, wa_id: PHONE }], messages: [{ from: PHONE, id: `wamid.${RUN}.${Math.random().toString(36).slice(2, 8)}`, timestamp: String(Math.floor(Date.now() / 1000)), type: 'text', text: { body: text } }] } }] }] }) });
/** wait until no new LLM request / Meta send / e-mail has arrived for `quietMs` (so a late background call of tenant A cannot be mistaken for tenant B's) */
async function quiesce(quietMs = 3500, max = 25000) { const t0 = Date.now(); let last = -1, since = Date.now(); while (Date.now() - t0 < max) { const n = M.llm.requests.length + M.meta.sends.length + M.mail.inbox.length; if (n !== last) { last = n; since = Date.now(); } else if (Date.now() - since >= quietMs) return; await sleep(300); } }
async function waitFor(fn, ms = 25000) { const t0 = Date.now(); while (Date.now() - t0 < ms) { const v = await fn(); if (v) return v; await sleep(400); } return null; }

(async () => {
  db = new Client(PG); await db.connect(); M = await mocks.start();
  ds = new DataSource({ type: 'postgres', host: PG.host, port: PG.port, username: PG.user, password: PG.password, database: PG.database, entities: [path.join(SRC, 'Database/**/*.{ts,js}')], synchronize: false });
  await ds.initialize();
  try {
    // ------------------------------------------------------------------ setup
    const A = await signup(`authtest.m3.${RUN}.a@example.test`, 'Alpha Recruiters');
    const B = await signup(`authtest.m3.${RUN}.b@example.test`, 'Beta Software');
    for (const [t, tag] of [[A, 'A'], [B, 'B']]) {
      await http('POST', '/WhatsApp/Test-Connection', { token: t.token, body: { phone_number: '+15550100100', phone_number_id: `PNID-${tag}-${RUN}`, access_token: `GOODTOKEN-${tag}`, provider: 'meta_cloud' } });
      await http('POST', '/Email/Test-Connection', { token: t.token, body: { email_address: `${tag.toLowerCase()}-box.${RUN}@mock.test`, smtp_host: '127.0.0.1', smtp_port: 9102, smtp_user: `${tag.toLowerCase()}-box.${RUN}@mock.test`, smtp_password: 'good-app-password', use_ssl: false } });
    }
    // prompt save in A only
    const saveA = await http('POST', '/WhatsApp/AI/Config', { token: A.token, body: { is_ai_enabled: true, ai_mode: 'hybrid', llm_provider: 'openai', llm_model: 'gpt-4o-mini', system_prompt: 'ALPHA-SECRET-PROMPT: only discuss Java developer jobs at Alpha Recruiters.', fallback_message: 'ALPHA fallback' } });
    console.log(`setup: tenants A=${A.tenant.slice(0, 8)} B=${B.tenant.slice(0, 8)}; prompt saved in A -> HTTP ${saveA.status}`);

    // the SAME customer (same phone, same e-mail) already exists as a lead in BOTH tenants
    for (const [t, nm] of process.env.NO_PRELEAD ? [] : [[A, 'Ravi (Alpha lead)'], [B, 'Ravi (Beta lead)']]) {
      await ds.query(`insert into lead(name, email, phone, tenant_id, status) values($1,$2,$3,$4,true)`, [nm, SHARED_EMAIL, PHONE, t.tenant]);
    }
    // ------------------------------------------------------------------ the same customer talks to both tenants
    M.phase = 'A';
    await webhook(`PNID-A-${RUN}`, 'CANDIDATE hello, I am a Java developer with 5 years experience and I want a job. My email is customer@example.test', 'Ravi Kumar');
    const aDone = await waitFor(async () => (await q(`select 1 from wa_message where tenant_id=$1 and direction='outbound'`, [A.tenant])).length > 0);
    await quiesce();
    M.phase = 'B';
    await webhook(`PNID-B-${RUN}`, 'BOOKME I want a product demo. My email is customer@example.test', 'Ravi Kumar');
    const bDone = await waitFor(async () => (await q(`select 1 from wa_conversation where tenant_id=$1 and meeting_info is not null`, [B.tenant])).length > 0, 30000);
    await waitFor(async () => M.llm.requests.some((r) => r.phase === 'B' && /Scheduled Type:/.test(r.lastText)), 20000); // the voice-call script request (the path that carried the leak)
    await quiesce(); // let confirmation e-mails / background calls finish BEFORE the phase label changes
    M.phase = 'done';
    console.log(`webhooks processed: A replied=${!!aDone}, B booked=${!!bDone}; LLM requests recorded=${M.llm.requests.length}, WhatsApp sends=${M.meta.sends.length}, e-mails=${M.mail.inbox.length}\n`);

    // ------------------------------------------------------------------ T-01 leads
    const leads = await q(`select tenant_id, name, email, phone, lead_status, preferred_interview_slot, interview_link from lead where phone like '%9876543210' order by created_on`);
    const la = leads.find((l) => l.tenant_id === A.tenant), lb = leads.find((l) => l.tenant_id === B.tenant);
    rec('P0-01', 'Lead', 'Same phone => one lead PER tenant; A is untouched by B\'s booking', leads.length === 2 && !!la && !!lb && !la.preferred_interview_slot && !la.interview_link && !!(lb.preferred_interview_slot || lb.interview_link),
      `leads for the number=${leads.length}; A: slot=${la ? la.preferred_interview_slot : 'no lead'}, link=${la ? !!la.interview_link : '-'}; B: slot=${lb ? lb.preferred_interview_slot : 'no lead'}, link=${lb ? !!lb.interview_link : '-'}`);

    // ------------------------------------------------------------------ T-02 conversations + meeting_info
    const convs = await q(`select tenant_id, meeting_info, last_message_text from wa_conversation where customer_phone like '%9876543210'`);
    const ca = convs.find((c) => c.tenant_id === A.tenant), cb = convs.find((c) => c.tenant_id === B.tenant);
    rec('P0-02', 'Conversation', 'One conversation per tenant; meeting_info only in B', convs.length === 2 && !!ca && !!cb && !ca.meeting_info && !!cb.meeting_info,
      `conversations=${convs.length}; A.meeting_info=${ca ? JSON.stringify(ca.meeting_info) : 'none'}; B.meeting_info set=${!!(cb && cb.meeting_info)}`);

    // ------------------------------------------------------------------ T-03 messages
    const msgs = await q(`select m.tenant_id, m.direction, m.message_text, c.tenant_id as conv_tenant from wa_message m left join wa_conversation c on c.id=m.conversation_id`);
    const mism = msgs.filter((m) => m.conv_tenant && m.tenant_id !== m.conv_tenant).length;
    const aTxt = msgs.filter((m) => m.tenant_id === A.tenant).map((m) => m.message_text).join(' | '), bTxt = msgs.filter((m) => m.tenant_id === B.tenant).map((m) => m.message_text).join(' | ');
    rec('P0-03', 'Messages', 'Messages stay with their own tenant (no mismatched conversation, no crossed text)', mism === 0 && !/BOOKME|demo is booked/i.test(aTxt) && !/CANDIDATE|share your email/i.test(bTxt) && msgs.length > 0,
      `messages=${msgs.length} (A out/in=${msgs.filter((m) => m.tenant_id === A.tenant && m.direction === 'outbound').length}/${msgs.filter((m) => m.tenant_id === A.tenant && m.direction === 'inbound').length}, B out/in=${msgs.filter((m) => m.tenant_id === B.tenant && m.direction === 'outbound').length}/${msgs.filter((m) => m.tenant_id === B.tenant && m.direction === 'inbound').length}); tenant != conversation tenant: ${mism}; B text inside A=${/BOOKME|booked/i.test(aTxt)}; A text inside B=${/CANDIDATE|share your email/i.test(bTxt)}`);

    // ------------------------------------------------------------------ T-04 credentials used for sending
    const sa = M.meta.sends.filter((s) => s.phase === 'A'), sb = M.meta.sends.filter((s) => s.phase === 'B');
    rec('P0-04', 'Meta', 'Each tenant\'s replies are sent with its OWN phone_number_id and token', sa.length > 0 && sb.length > 0 && sa.every((s) => s.phoneId === `PNID-A-${RUN}` && s.token === 'GOODTOKEN-A') && sb.every((s) => s.phoneId === `PNID-B-${RUN}` && s.token === 'GOODTOKEN-B'),
      `A sends=${sa.length} (all A credentials=${sa.every((s) => s.token === 'GOODTOKEN-A')}); B sends=${sb.length} (all B credentials=${sb.every((s) => s.token === 'GOODTOKEN-B')})`);

    // ------------------------------------------------------------------ T-05 / T-06 LLM context
    const ra = M.llm.requests.filter((r) => r.phase === 'A'), rb = M.llm.requests.filter((r) => r.phase === 'B');
    const blob = (rs) => rs.map((r) => r.system + '\n' + JSON.stringify(r.messages)).join('\n');
    const bBlob = blob(rb), aBlob = blob(ra);
    const voiceScriptSeen = rb.some((r) => /Scheduled Type:/.test(r.lastText));
    const leakIntoB = ['ALPHA-SECRET-PROMPT', 'Alpha Recruiters', 'Java developer', '5 years', `a-box.${RUN}`].filter((s) => bBlob.includes(s));
    const leakIntoA = ['Beta Software', 'BOOKME', 'Monday 11:00', `b-box.${RUN}`, 'meet.google.com'].filter((s) => aBlob.includes(s));
    const where = (rs, needle) => { for (const r of rs) { const i = r.system.indexOf(needle); if (i >= 0) return `system prompt, around: "...${r.system.slice(Math.max(0, i - 70), i + needle.length + 30).replace(/\s+/g, ' ')}..."`; const m = r.messages.find((x) => String(x.content).includes(needle)); if (m) return `${m.role} message: "${String(m.content).slice(0, 100).replace(/\s+/g, ' ')}"`; } return 'n/a'; };
    const leakWhere = leakIntoB.map((n) => `${n} -> ${where(rb, n)}`).join(' || ');
    rec('P0-05', 'LLM context', 'What the LLM saw for B contains nothing of A (prompt, company, facts, mailbox)', rb.length > 0 && leakIntoB.length === 0, `B requests=${rb.length} (voice-call script request seen: ${voiceScriptSeen}); A's strings found in B's LLM input: [${leakIntoB.join(', ')}]${leakWhere ? ' :: ' + leakWhere : ''}`);
    rec('P0-06', 'LLM context', 'What the LLM saw for A contains nothing of B (company, booking, link, mailbox)', ra.length > 0 && leakIntoA.length === 0, `A requests=${ra.length}; B's strings found in A's LLM input: [${leakIntoA.join(', ')}]`);
    rec('P0-07', 'LLM context', 'Each tenant\'s LLM input uses its OWN prompt and company name', ra.some((r) => r.system.includes('ALPHA-SECRET-PROMPT')) && ra.some((r) => r.system.includes('Alpha Recruiters')) && rb.some((r) => r.system.includes('Beta Software')) && !rb.some((r) => r.system.includes('ALPHA-SECRET-PROMPT')),
      `A saw its prompt=${ra.some((r) => r.system.includes('ALPHA-SECRET-PROMPT'))}, own company=${ra.some((r) => r.system.includes('Alpha Recruiters'))}; B saw own company=${rb.some((r) => r.system.includes('Beta Software'))}, A's prompt=${rb.some((r) => r.system.includes('ALPHA-SECRET-PROMPT'))}`);

    // ------------------------------------------------------------------ T-08 prompt isolation through the API
    const gA = await http('GET', '/WhatsApp/AI/Config', { token: A.token }), gB = await http('GET', '/WhatsApp/AI/Config', { token: B.token });
    rec('P0-08', 'Prompt', 'Prompt saved in A is not returned to B (API) and sits in A\'s row only (DB)', /ALPHA-SECRET/.test(gA.text) && !/ALPHA-SECRET/.test(gB.text) && (await q(`select tenant_id from wa_ai_config where system_prompt like '%ALPHA-SECRET%'`)).every((r) => r.tenant_id === A.tenant),
      `A reads its prompt=${/ALPHA-SECRET/.test(gA.text)}; B's response contains A's prompt=${/ALPHA-SECRET/.test(gB.text)}`);

    // ------------------------------------------------------------------ T-09 e-mails
    const mails = M.mail.inbox; const fromA = mails.filter((m) => m.sentBy && m.sentBy.startsWith('a-box')), fromB = mails.filter((m) => m.sentBy && m.sentBy.startsWith('b-box'));
    const crossed = mails.filter((m) => (m.sentBy || '').startsWith('a-box') && /Beta Software|demo|BOOKME/i.test(m.text)).length + mails.filter((m) => (m.sentBy || '').startsWith('b-box') && /Alpha Recruiters|Java developer/i.test(m.text)).length;
    rec('P0-09', 'E-mail', 'No e-mail carries the other tenant\'s content and each is sent from its own mailbox', crossed === 0 && mails.every((m) => m.sentBy), `e-mails=${mails.length} (from A's mailbox ${fromA.length}, from B's mailbox ${fromB.length}); crossed content=${crossed}`);

    // ------------------------------------------------------------------ T-10 stored agent memory (conversation_agent_state)
    const st = await q(`select tenant_id, collected_slots from conversation_agent_state where customer_phone like '%9876543210'`);
    const sA = st.filter((s) => s.tenant_id === A.tenant), sB = st.filter((s) => s.tenant_id === B.tenant);
    const aMem = JSON.stringify(sA.map((s) => s.collected_slots)), bMem = JSON.stringify(sB.map((s) => s.collected_slots));
    rec('P0-10', 'Memory', 'Stored agent memory is per tenant: A has no booking, B has no A facts', !/appointment|Monday/i.test(aMem) && !/Java developer|5 years/i.test(bMem) && st.every((s) => [A.tenant, B.tenant].includes(s.tenant_id)),
      `state rows: A=${sA.length}, B=${sB.length}; booking inside A's memory=${/appointment|Monday/i.test(aMem)}; A's facts inside B's memory=${/Java developer|5 years/i.test(bMem)}`);

    // ------------------------------------------------------------------ T-11 / T-12: code paths a webhook cannot reach (direct calls, real DB)
    const { EmailImapService } = require(path.join(SRC, 'Email/Services/EmailImap.service'));
    const { AgentToolsService } = require(path.join(SRC, 'AgentOrchestrator/Services/AgentTools.service'));
    const ONLY_A = `only-in-a.${RUN}@example.test`;
    await db.query(`insert into lead(name, email, phone, tenant_id, source, lead_status, status) values('A only lead',$1,'+919000000001',$2,'email','NEW',true)`, [ONLY_A, A.tenant]).catch(async () => { await ds.query(`insert into lead(name, email, phone, tenant_id, status) values('A only lead',$1,'+919000000001',$2,true)`, [ONLY_A, A.tenant]); });
    const imap = new EmailImapService({}, {}, {}, {}, { emit() {} }, {});
    const got = await imap.findOrCreateLeadFromEmail(ONLY_A, 'Someone', 'hello', 'subject', B.tenant);
    rec('P0-11', 'Inbound e-mail', 'An e-mail to B from an address that is only a lead in A does NOT attach to A\'s lead', got.leadRecord.tenant_id === B.tenant,
      `lead returned belongs to ${got.leadRecord.tenant_id === B.tenant ? 'tenant B (correct)' : got.leadRecord.tenant_id === A.tenant ? 'TENANT A (LEAK: B\'s e-mail was attached to A\'s lead)' : got.leadRecord.tenant_id}`);
    const tools = new AgentToolsService({ emit() {} }, {});
    const found = await tools.getLead({ tenant_id: B.tenant, customer_email: `only-in-a2.${RUN}@example.test`, customer_phone: null, lead_id: null });
    await db.query(`insert into lead(name, email, phone, tenant_id, status) values('A only lead 2',$1,'+919000000002',$2,true)`, [`only-in-a2.${RUN}@example.test`, A.tenant]);
    const found2 = await tools.getLead({ tenant_id: B.tenant, customer_email: `only-in-a2.${RUN}@example.test`, customer_phone: null, lead_id: null });
    rec('P0-12', 'Agent tools', 'The agent\'s "find lead by e-mail" in B never returns A\'s lead', !found && !found2, `before A has the lead: ${found ? 'found' : 'none'}; after A has it: ${found2 ? 'RETURNED ' + (found2.tenant_id === A.tenant ? "TENANT A'S LEAD (LEAK)" : 'a lead') : 'none (correct)'}`);

    // ------------------------------------------------------------------ T-13 static guard over the whole source
    const offenders = []; const keyIssues = [];
    (function walk(d) { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); if (f.isDirectory()) { if (!/node_modules|dist/.test(f.name)) walk(p); } else if (/\.ts$/.test(f.name)) {
      const src = fs.readFileSync(p, 'utf8').split('\n');
      src.forEach((line, i) => {
        if (/(lead|WhatsAppConversation|WhatsAppMessage|ConversationAgentState|VoiceCallLog|EmailLog)\.(findOne|find)\(/.test(line) || /^\s*where: *(\[)?\{/.test(line) || /(emailWhere|where)\.push\(\{ *(from_email|to_email)/.test(line)) {
          const win = src.slice(Math.max(0, i - 1), i + 4).join(' ');
          if (/(phone|customer_phone|sender_phone|recipient_phone|email)\s*:/.test(win) && /\b(lead|WhatsAppConversation|WhatsAppMessage|ConversationAgentState)\b/.test(src.slice(Math.max(0, i - 2), i + 1).join(' ')) && !/tenant/i.test(win) && !/Demo|seed/i.test(win.slice(0, 0))) offenders.push(`${path.relative(SRC, p)}:${i + 1}`);
        }
        if (/recentCallDispatches\.(get|set)\((cleanPhone)/.test(line)) keyIssues.push(`${path.relative(SRC, p)}:${i + 1} (call-dispatch dedupe key has no tenant)`);
        if (/phoneQueues\.(get|set)\(cleanPhoneKey/.test(line) && !/tenant/i.test(src.join('\n').slice(src.join('\n').indexOf('const cleanPhoneKey'), src.join('\n').indexOf('const cleanPhoneKey') + 160))) keyIssues.push(`${path.relative(SRC, p)}:${i + 1} (webhook queue key has no tenant)`);
      });
    } } })(SRC);
    const uniq = [...new Set(offenders)];
    rec('P0-13', 'Static guard', 'No lead / conversation / message / agent-state lookup by phone or e-mail without tenant_id; no phone-only dedupe or queue key', uniq.length === 0 && keyIssues.length === 0,
      `unscoped lookups: ${uniq.length}${uniq.length ? ' [' + uniq.slice(0, 8).join(', ') + (uniq.length > 8 ? ', …' : '') + ']' : ''}; phone-only keys: ${keyIssues.length}${keyIssues.length ? ' [' + keyIssues.join('; ') + ']' : ''}`);

    rec('P0-14', 'Memory (contact_memory)', 'Per-contact memory table', true, 'Not applicable yet: contact_memory is created in Phase 1/3. The only stored memory today is conversation_agent_state (P0-10).');
  } catch (e) {
    rec('P0-ERR', 'harness', 'test script error', false, String((e && e.stack) || e).slice(0, 400));
  } finally {
    fs.writeFileSync(OUT, JSON.stringify({ ran_at: new Date().toISOString(), results, llm_requests: (M ? M.llm.requests : []).map((r) => ({ phase: r.phase, system: r.system, messages: r.messages })), meta_sends: M ? M.meta.sends : [], emails: M ? M.mail.inbox.map((m) => ({ phase: m.phase, sentBy: m.sentBy, to: m.to, subject: m.subject })) : [] }, null, 2));
    // clean up everything this run created
    try {
      const ids = (await db.query(`select company_id::text id from "user" where email like 'authtest.m3.%'`)).rows.map((r) => r.id);
      for (const t of ['tenant_integration_status', 'email_account_config', 'whatsapp_config', 'wa_ai_config', 'wa_message', 'wa_conversation', 'conversation_agent_state', 'lead', 'lead_activity', 'email_log', 'email_delivery_log', 'voice_call_log', 'voice_agent', 'ai_agent', 'agent_handoff_log', 'communications']) await db.query(`delete from ${t} where tenant_id = any($1)`, [ids]).catch(() => {});
      await db.query(`delete from "user" where email like 'authtest.m3.%'`); if (ids.length) await db.query(`delete from company where id::text = any($1)`, [ids]);
      await db.query(`delete from auth_otp where email like 'authtest.m3.%'`).catch(() => {});
    } catch (e) { console.error('cleanup problem:', e.message); }
    await ds.destroy(); await M.stop(); await db.end();
  }
  const f = results.filter((r) => r.status === 'FAIL').length; console.log(`\n${results.length - f}/${results.length} passed`); process.exit(f ? 1 : 0);
})();
