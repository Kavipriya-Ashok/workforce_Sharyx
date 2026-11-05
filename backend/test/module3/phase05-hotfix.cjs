/* eslint-disable */
/**
 * Module 3 / Phase 0.5 - PATH 5 HOTFIX proof (OutcomeTrigger + WhatsApp.service).
 * No database and no network: the database entities, axios (Meta Graph) and the LLM are replaced by in-memory fakes, so the
 * test shows EXACTLY what the customer would receive. Same file runs on the old code (before) and the fixed code (after).
 *
 *   cd backend && node -r ts-node/register/transpile-only -r tsconfig-paths/register test/module3/phase05-hotfix.cjs <out.json>
 */
require('reflect-metadata');
const fs = require('fs');
const path = require('path');
process.env.NODE_ENV = 'development';
delete process.env.WHATSAPP_GRAPH_URL;
const SRC = path.resolve(__dirname, '..', '..', 'src');
const req = (p) => require(path.join(SRC, p));

const axios = require('axios');
const { OutcomeTriggerService } = req('Service/OutcomeTrigger.service.ts');
const { WhatsAppService } = req('WhatsApp/Services/WhatsApp.service.ts');
const { WhatsAppCampaign } = req('Database/Table/WhatsApp/WhatsAppCampaign.entity.ts');
const { WhatsAppTemplate } = req('Database/Table/WhatsApp/WhatsAppTemplate.entity.ts');
const { WhatsAppConfig } = req('Database/Table/WhatsApp/WhatsAppConfig.entity.ts');
const { WhatsAppConversation } = req('Database/Table/WhatsApp/WhatsAppConversation.entity.ts');
const { WhatsAppMessage } = req('Database/Table/WhatsApp/WhatsAppMessage.entity.ts');
const { lead } = req('Database/Table/Lead/lead.ts');
const { lead_activity } = req('Database/Table/Lead/lead_activity.ts');
const { EmailCampaign } = req('Database/Table/Email/EmailCampaign.entity.ts');
const { EmailTemplate } = req('Database/Table/Email/EmailTemplate.entity.ts');
const { EmailLog } = req('Database/Table/Email/EmailLog.entity.ts');
const { AgentLlmService } = req('AgentOrchestrator/Services/AgentLlm.service.ts');

const A = 'tenant-A', B = 'tenant-B', PHONE = '919876543210';
let S; // current scenario state
const reset = () => { S = { sends: [], campaigns: [], templates: [], leads: [], convs: [], msgs: [], tasks: [], emails: [], llmSystems: [], llmOn: false, meta: 'ok', emailNotSent: [] }; };

// ---- fake Meta Graph (axios) --------------------------------------------------------------------------------------------
const fakePost = async (url, body, opts) => {
  const token = ((opts && opts.headers && opts.headers.Authorization) || '').replace('Bearer ', '');
  const isHello = body && body.template && body.template.name === 'hello_world';
  const rec = { url: String(url).replace(/^https?:\/\/[^/]+/, ''), token, to: body && body.to, type: body && body.type, text: body && body.text && body.text.body, template: body && body.template && body.template.name };
  const reject = (code, message) => { const e = new Error(message); e.response = { data: { error: { code, message } } }; return e; };
  if (S.meta === 'window') {
    // text is outside the 24h window, the tenant's template is not accepted, only Meta's sample template goes through
    if (body.type === 'text') { S.sends.push({ ...rec, result: 'rejected 131047' }); throw reject(131047, 'Re-engagement message'); }
    if (!isHello) { S.sends.push({ ...rec, result: 'rejected 132001' }); throw reject(132001, 'Template does not exist'); }
  }
  S.sends.push({ ...rec, result: 'accepted' });
  if (S.meta === 'noid') return { data: {} };
  return { data: { messaging_product: 'whatsapp', messages: [{ id: 'wamid.' + S.sends.length }] } };
};
axios.post = fakePost; if (axios.default) axios.default.post = fakePost;

// ---- fake database -------------------------------------------------------------------------------------------------------
const matchWhere = (row, where) => Object.entries(where || {}).every(([k, v]) => {
  if (v && typeof v === 'object' && '_value' in v) { const needle = String(v._value).replace(/%/g, ''); return String(row[k] || '').includes(needle); }
  return row[k] === v;
});
const pick = (rows, opts) => rows.filter((r) => matchWhere(r, opts && opts.where));
WhatsAppConfig.findOne = async (o) => (o.where.tenant_id ? { tenant_id: o.where.tenant_id, access_token: 'TOKEN-' + o.where.tenant_id, phone_number_id: 'PNID-' + o.where.tenant_id, phone_number: '+1555' + o.where.tenant_id.slice(-1) } : null);
WhatsAppCampaign.find = async (o) => pick(S.campaigns, o);
WhatsAppCampaign.prototype.save = async function () { return this; };
WhatsAppTemplate.find = async (o) => pick(S.templates, o);
WhatsAppTemplate.findOne = async (o) => pick(S.templates, o)[0] || null;
lead.findOne = async (o) => pick(S.leads, o)[0] || null;
lead_activity.prototype.save = async function () { S.tasks.push({ tenant_id: this.tenant_id, lead_id: this.lead_id, type: this.activity_type, title: this.title, description: this.description }); return this; };
WhatsAppConversation.findOne = async (o) => pick(S.convs, o)[0] || null;
WhatsAppConversation.prototype.save = async function () { if (!S.convs.includes(this)) S.convs.push(this); this.id = this.id || 'conv-' + S.convs.length; return this; };
WhatsAppMessage.prototype.save = async function () { S.msgs.push({ tenant_id: this.tenant_id, to: this.recipient_phone, type: this.message_type, text: this.message_text, template: this.template_name, meta_id: this.meta_message_id, status: this.delivery_status }); return this; };
EmailCampaign.find = async () => [];
EmailTemplate.find = async () => []; EmailTemplate.findOne = async () => null;
EmailLog.prototype.save = async function () { return this; };
AgentLlmService.prototype.isAvailable = function () { return S.llmOn; };
AgentLlmService.prototype.completeJson = async function (system) { S.llmSystems.push(system); return { whatsapp: 'LLM-WRITTEN-WA-MESSAGE', email: 'LLM written email paragraph.' }; };

const emailStub = {
  sendEmailReliable: async (m) => { S.emails.push({ to: m.to, subject: m.subject, body: String(m.html || m.body || m.text || '') }); return { ok: true, success: true }; },
  sendEmail: async (m) => { S.emails.push({ to: m.to, subject: m.subject, body: String(m.html || m.body || m.text || '') }); return { ok: true, success: true }; },
  recordEmailNotSent: async (...a) => { S.emailNotSent.push(a[2]); },
};
const pdfStub = { generate: async () => null };
const svc = () => new OutcomeTriggerService(emailStub, pdfStub);

const results = []; const dump = {};
const check = (id, title, pass, actual) => { results.push({ id, title, status: pass ? 'PASS' : 'FAIL', actual }); console.log(`${pass ? 'PASS' : 'FAIL'}  ${id}  ${title}\n      -> ${actual}`); };
const TPL = (tenant, extra) => ({ tenant_id: tenant, name: 'demo_confirmation', language: 'ta', body_text: 'Vanakkam {{name}}, unga demo book aayiduchu.', is_active: true, status: true, approval_status: 'APPROVED', outcome_filter: 'Demo Booked', ...extra });
const CAMP = (tenant) => ({ tenant_id: tenant, id: 'camp-' + tenant, name: 'Demo confirmation', is_active: true, status: true, trigger_event: 'demo_booked', outcome_filter: 'ALL', template_name: 'demo_confirmation', sent_count: 0, save: async function () {} });
const shown = (s) => s.sends.map((x) => `${x.type}${x.template ? '(' + x.template + ')' : ''} -> ${x.result}${x.text ? ' | ' + JSON.stringify(x.text.slice(0, 160)) : ''}`);
const FAKE_PRICE = /15,000|18,000|Starter AI Plan|Growth Omnichannel/;

(async () => {
  // ---------------------------------------------------------------- T1 pricing request, tenant has NO content
  reset();
  await svc().executeTrigger('whatsapp', 'whatsapp_details_requested', { tenantId: A, phone: PHONE, leadName: 'Priya', outcome: 'Pricing requested', callSummary: 'Customer wants price details' });
  dump.T1 = { customerReceived: shown(S), tasks: S.tasks };
  const t1text = S.sends.map((x) => x.text || '').join('\n');
  check('H-01', 'Pricing request with NO tenant content: no invented "Sharyx AI" text or price reaches the customer', !/Sharyx AI/.test(t1text) && !FAKE_PRICE.test(t1text), S.sends.length ? `customer got: ${JSON.stringify(t1text.slice(0, 200))}` : 'nothing was sent');
  S.leads = []; // (no lead in this scenario: a task still has to exist, on the conversation or the lead)

  // ---------------------------------------------------------------- T2 no content -> human task (needs a lead to hang the task on)
  reset(); S.leads = [{ id: 'lead-A1', tenant_id: A, phone: PHONE, name: 'Priya' }];
  await svc().executeTrigger('whatsapp', 'whatsapp_details_requested', { tenantId: A, phone: PHONE, leadName: 'Priya', outcome: 'Pricing requested' });
  check('H-02', 'No mapped template / approved content -> nothing sent AND a human task is created for the tenant', S.sends.length === 0 && S.tasks.length === 1 && S.tasks[0].tenant_id === A, `sends=${S.sends.length}, tasks=${JSON.stringify(S.tasks.map((t) => t.title))}`);
  dump.T2 = { customerReceived: shown(S), tasks: S.tasks };

  // ---------------------------------------------------------------- T3 meeting booked, tenant template, NO real link
  reset(); S.campaigns = [CAMP(A)]; S.templates = [TPL(A)]; S.leads = [{ id: 'lead-A1', tenant_id: A, phone: PHONE, name: 'Priya' }];
  await svc().executeTrigger('whatsapp', 'demo_booked', { tenantId: A, phone: PHONE, leadName: 'Priya', outcome: 'Demo Booked' });
  const t3 = S.sends.map((x) => x.text || '').join('\n');
  dump.T3 = { customerReceived: shown(S), tasks: S.tasks };
  check('H-03', 'Meeting booked but no real link: the customer is NOT given a made-up Google Meet link', !/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}/i.test(t3) && !/shx-demo-room/.test(t3), `customer got: ${JSON.stringify(t3.slice(0, 260))}`);
  check('H-04', 'Meeting booked but no real link: the message says the link will be shared shortly', /shortly/i.test(t3), `customer got: ${JSON.stringify(t3.slice(0, 260))}`);
  check('H-05', 'Meeting booked but no real link: the tenant is told (a task exists)', S.tasks.length >= 1 && S.tasks.every((t) => t.tenant_id === A), `tasks=${JSON.stringify(S.tasks.map((t) => t.title))}`);
  check('H-06', 'The confirmation does not mention "Sharyx AI"', !/Sharyx/i.test(t3), `customer got: ${JSON.stringify(t3.slice(0, 120))}`);

  // ---------------------------------------------------------------- T3b a REAL link is kept as-is
  reset(); S.campaigns = [CAMP(A)]; S.templates = [TPL(A)];
  await svc().executeTrigger('whatsapp', 'demo_booked', { tenantId: A, phone: PHONE, leadName: 'Priya', outcome: 'Demo Booked', meetUrl: 'https://meet.google.com/abc-defg-hij' });
  const t3b = S.sends.map((x) => x.text || '').join('\n');
  check('H-07', 'A real meeting link is sent unchanged', t3b.includes('https://meet.google.com/abc-defg-hij'), `customer got: ${JSON.stringify(t3b.slice(0, 200))}`);

  // ---------------------------------------------------------------- T4 hello_world fallback
  reset(); S.meta = 'window'; S.campaigns = [CAMP(A)]; S.templates = [TPL(A)]; S.leads = [{ id: 'lead-A1', tenant_id: A, phone: PHONE, name: 'Priya' }];
  const r4 = await svc().executeTrigger('whatsapp', 'demo_booked', { tenantId: A, phone: PHONE, leadName: 'Priya', outcome: 'Demo Booked', meetUrl: 'https://meet.google.com/abc-defg-hij' });
  dump.T4 = { customerReceived: shown(S), result: r4, saved: S.msgs, tasks: S.tasks };
  check('H-08', 'Free text and the tenant template both rejected: Meta\'s "hello_world" is NEVER sent to the customer', !S.sends.some((x) => x.template === 'hello_world'), `attempts: ${JSON.stringify(shown(S))}`);
  check('H-09', 'The failure is reported as failed (not sent) and no "sent" message row is saved', r4.failed >= 1 && r4.sent === 0 && !S.msgs.some((m) => m.status === 'sent'), `result=${JSON.stringify({ sent: r4.sent, failed: r4.failed })}, saved=${JSON.stringify(S.msgs.map((m) => m.status))}`);
  check('H-10', 'The failure creates a human task with the reason', S.tasks.length >= 1 && /131047|132001|window|template|reject/i.test(S.tasks.map((t) => t.description).join(' ')), `tasks=${JSON.stringify(S.tasks.map((t) => t.description))}`);

  // ---------------------------------------------------------------- T5 LLM prompt
  reset(); S.llmOn = true; S.campaigns = [CAMP(A)]; S.templates = [TPL(A)];
  await svc().executeTrigger('whatsapp', 'demo_booked', { tenantId: A, phone: PHONE, leadName: 'Priya', outcome: 'Demo Booked', company: 'Alpha Hospital' });
  const sys = S.llmSystems.join('\n');
  dump.T5 = { systemPrompt: sys };
  check('H-11', 'The LLM instructions contain no "Sharyx AI" brand and no fixed price', S.llmSystems.length > 0 && !/Sharyx/i.test(sys) && !FAKE_PRICE.test(sys), `prompt mentions Sharyx=${/Sharyx/i.test(sys)}, fixed price=${FAKE_PRICE.test(sys)} (prompt calls=${S.llmSystems.length})`);

  // ---------------------------------------------------------------- T6 another tenant's template must never be used
  reset(); S.templates = [TPL(B, { body_text: 'TENANT-B-SECRET-OFFER {{name}}' })]; S.leads = [{ id: 'lead-A1', tenant_id: A, phone: PHONE, name: 'Priya' }];
  await svc().executeTrigger('whatsapp', 'demo_booked', { tenantId: A, phone: PHONE, leadName: 'Priya', outcome: 'Demo Booked' });
  const t6 = S.sends.map((x) => x.text || '').join('\n');
  dump.T6 = { customerReceived: shown(S) };
  check('H-12', 'Tenant B\'s template is never sent to Tenant A\'s customer (template lookup is per tenant)', !/TENANT-B-SECRET/.test(t6), S.sends.length ? `A's customer got: ${JSON.stringify(t6.slice(0, 160))}` : 'nothing was sent');

  // ---------------------------------------------------------------- T7 e-mail: fake link / fixed price
  reset(); S.leads = [{ id: 'lead-A1', tenant_id: A, phone: PHONE, name: 'Priya', email: 'p@example.test' }];
  try { await svc().executeTrigger('email', 'appointment_booked', { tenantId: A, email: 'p@example.test', phone: PHONE, leadName: 'Priya', outcome: 'Demo Booked' }); } catch (e) { console.log('   (email scenario error:', e.message, ')'); }
  const mail = S.emails.map((m) => m.subject + ' ' + m.body).join('\n');
  dump.T7 = { emails: S.emails.map((m) => ({ to: m.to, subject: m.subject })) };
  check('H-13', 'Meeting e-mail without a real link does not contain the fake "shx-demo-room" link', !/shx-demo-room|meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}/i.test(mail), S.emails.length ? `e-mail "${S.emails[0].subject}" contains fake link: ${/shx-demo-room/.test(mail)}` : 'no e-mail sent');
  reset(); S.leads = [{ id: 'lead-A1', tenant_id: A, phone: PHONE, name: 'Priya', email: 'p@example.test' }];
  try { await svc().executeTrigger('email', 'quotation_requested', { tenantId: A, email: 'p@example.test', leadName: 'Priya', outcome: 'Quotation requested' }); } catch (e) { console.log('   (email scenario error:', e.message, ')'); }
  const mail2 = S.emails.map((m) => m.subject + ' ' + m.body).join('\n');
  check('H-14', 'Quotation e-mail never invents an amount (no default "15,000")', !/15,000/.test(mail2), S.emails.length ? `e-mail "${S.emails[0].subject}" shows a default price: ${/15,000/.test(mail2)}` : 'no e-mail sent');

  // ---------------------------------------------------------------- T8 WhatsApp.service: Meta answers 200 without a message id
  const wa = new WhatsAppService();
  reset(); S.meta = 'noid';
  let threw = null; let r8 = null;
  try { r8 = await wa.sendMessage({ to: PHONE, text: 'hello' }, 'u1', false, A); } catch (e) { threw = e.message; }
  dump.T8 = { threw, saved: S.msgs };
  check('H-15', 'Meta reply WITHOUT a message id is a failure (not saved as "sent" with a mock_ id)', !!threw && !S.msgs.some((m) => /^mock_/.test(m.meta_id) && m.status === 'sent'), threw ? `error: ${threw}` : `saved row: ${JSON.stringify(S.msgs[0])}`);
  reset(); S.meta = 'noid'; process.env.NODE_ENV = 'test';
  let threw2 = null; try { await wa.sendMessage({ to: PHONE, text: 'hello' }, 'u1', false, A); } catch (e) { threw2 = e.message; }
  check('H-16', 'Mock ids are still allowed when NODE_ENV=test', !threw2 && S.msgs.length === 1 && /^mock_/.test(S.msgs[0].meta_id), threw2 ? `error: ${threw2}` : `saved id: ${S.msgs[0] && S.msgs[0].meta_id}`);
  process.env.NODE_ENV = 'development';
  reset(); S.meta = 'ok';
  await wa.sendMessage({ to: PHONE, text: 'hello' }, 'u1', false, A);
  check('H-17', 'Normal send still works and stores the real Meta id', S.msgs.length === 1 && /^wamid\./.test(S.msgs[0].meta_id) && S.msgs[0].status === 'sent', JSON.stringify(S.msgs[0]));

  const out = process.argv[2] || path.join(__dirname, 'phase05-results.json');
  fs.writeFileSync(out, JSON.stringify({ results, dump }, null, 2));
  const fails = results.filter((r) => r.status === 'FAIL').length;
  console.log(`\n${results.length - fails}/${results.length} passed -> ${out}`);
  process.exit(0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
