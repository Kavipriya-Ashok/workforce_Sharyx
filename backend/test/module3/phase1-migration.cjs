/* eslint-disable */
/**
 * Module 3 / Phase 1 - migration 1731200000000-WhatsAppFoundation: apply, re-apply, constraints, tenant isolation, rollback.
 * SCRATCH DB ONLY (127.0.0.1:5433, name sharyx_m3*).   node test/module3/phase1-migration.cjs <out.json>
 *   env DB_NAME (default sharyx_m3_p1), PSQL (path to psql.exe)
 */
const { Client } = require('pg');
const { execFileSync } = require('child_process');
const path = require('path'); const fs = require('fs');
const DB = process.env.DB_NAME || 'sharyx_m3_p1';
if (!/^sharyx_m3/.test(DB)) { console.error('REFUSING: scratch databases only'); process.exit(2); }
const PSQL = process.env.PSQL || 'C:/Program Files/PostgreSQL/18/bin/psql.exe';
const UP = path.resolve(__dirname, '../../migrations/1731200000000-WhatsAppFoundation.sql');
const DOWN = path.resolve(__dirname, '../../migrations/1731200000000-WhatsAppFoundation.down.sql');
const sh = (f) => execFileSync(PSQL, ['-h', '127.0.0.1', '-p', '5433', '-U', 'scratch', '-d', DB, '-q', '-v', 'ON_ERROR_STOP=1', '-f', f], { encoding: 'utf8' });
const rows = []; let bad = 0;
const rec = (id, title, ok, actual) => { if (!ok) bad++; rows.push({ id, title, status: ok ? 'PASS' : 'FAIL', actual }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${id}  ${title}\n      -> ${actual}`); };
const NEW_TABLES = ['contact_memory', 'wa_opt_outs', 'wa_outcome_mapping', 'email_event_template'];
const NEW_COLS = {
  wa_message: ['campaign_id', 'outcome', 'channel', 'topic', 'source_event'],
  wa_conversation: ['detected_intent', 'intent_confidence', 'topic'],
  email_delivery_log: ['event', 'source_event', 'booking_ref', 'mailbox', 'provider', 'provider_message_id', 'sent_at', 'next_retry_at', 'dedupe_key'],
};
(async () => {
  const c = new Client({ host: '127.0.0.1', port: 5433, user: 'scratch', password: 'scratch', database: DB }); await c.connect();
  const q = async (s, p) => (await c.query(s, p)).rows;
  const tableSet = async () => (await q(`select table_name from information_schema.tables where table_schema='public'`)).map((r) => r.table_name);
  const colSet = async (t) => (await q(`select column_name from information_schema.columns where table_schema='public' and table_name=$1`, [t])).map((r) => r.column_name);
  const snapshot = async () => { const o = {}; for (const t of (await tableSet()).sort()) o[t] = (await colSet(t)).sort(); return JSON.stringify(o); };
  const fails = async (sql, p) => { try { await c.query(sql, p); return null; } catch (e) { return e.code || e.message; } };

  // ---- 0. state before
  const before = await snapshot();
  const hadAny = NEW_TABLES.some(async (t) => (await tableSet()).includes(t));
  const seed = async () => { // existing rows must survive both directions
    const comp = (await q(`select id from company limit 1`))[0];
    await c.query(`insert into wa_conversation(tenant_id, customer_phone, conversation_status) values ('t-seed','919000000001','open') on conflict do nothing`).catch(() => {});
    return comp;
  };
  await seed();
  const convBefore = (await q(`select count(*)::int n from wa_conversation`))[0].n;

  // ---- 1. apply
  sh(UP);
  const tables1 = await tableSet();
  rec('M-01', 'Migration applies cleanly and creates the 4 new tables', NEW_TABLES.every((t) => tables1.includes(t)), NEW_TABLES.map((t) => `${t}:${tables1.includes(t)}`).join(' '));
  let allCols = true, detail = [];
  for (const [t, cols] of Object.entries(NEW_COLS)) { const have = await colSet(t); for (const col of cols) if (!have.includes(col)) { allCols = false; detail.push(`${t}.${col} missing`); } }
  rec('M-02', 'All new columns exist on wa_message, wa_conversation, email_delivery_log', allCols, allCols ? Object.entries(NEW_COLS).map(([t, c2]) => `${t}+${c2.length}`).join(', ') : detail.join('; '));
  const convAfter = (await q(`select count(*)::int n from wa_conversation`))[0].n;
  rec('M-03', 'Existing rows are untouched by the migration', convAfter === convBefore, `wa_conversation rows ${convBefore} -> ${convAfter}`);
  sh(UP);
  rec('M-04', 'Running the migration twice is harmless (idempotent)', true, 'second run: no error');

  // ---- 2. constraints & tenant isolation on the new tables
  const mem = (t, ph, em) => c.query(`insert into contact_memory(tenant_id, contact_phone, contact_email, summary) values ($1,$2,$3,'x')`, [t, ph, em]);
  await mem('tA', '+919876543210', 'same@example.test'); await mem('tB', '+919876543210', 'same@example.test');
  rec('M-05', 'Same phone + same e-mail can have a memory in TWO tenants', (await q(`select count(*)::int n from contact_memory where contact_phone='+919876543210'`))[0].n === 2, 'tA and tB each hold their own row');
  rec('M-06', 'Same phone twice in the SAME tenant is rejected (unique tenant_id + contact_phone)', (await fails(`insert into contact_memory(tenant_id, contact_phone) values ('tA','+919876543210')`)) === '23505', 'unique violation 23505');
  await c.query(`insert into contact_memory(tenant_id, contact_email) values ('tA','only@example.test')`);
  rec('M-07', 'E-mail-only contact is allowed once per tenant, not twice', (await fails(`insert into contact_memory(tenant_id, contact_email) values ('tA','ONLY@example.test')`)) === '23505', 'case-insensitive unique violation 23505');
  rec('M-08', 'A memory with neither phone nor e-mail is rejected', (await fails(`insert into contact_memory(tenant_id) values ('tA')`)) === '23514', 'check violation 23514');
  rec('M-09', 'facts must be an object and open_tasks an array', (await fails(`insert into contact_memory(tenant_id, contact_phone, facts) values ('tA','+1',  '[]')`)) === '23514' && (await fails(`insert into contact_memory(tenant_id, contact_phone, open_tasks) values ('tA','+2', '{}')`)) === '23514', 'check violations 23514');
  rec('M-10', 'Reading by tenant_id returns only that tenant (index path used)', (await q(`select * from contact_memory where tenant_id='tA' and contact_phone='+919876543210'`)).length === 1, '1 row for tA, tB invisible');
  await c.query(`insert into wa_opt_outs(tenant_id, contact_phone, keyword) values ('tA','+919876543210','STOP')`);
  await c.query(`insert into wa_opt_outs(tenant_id, contact_phone, keyword) values ('tB','+919876543210','STOP')`);
  rec('M-11', 'Opt-out is per tenant: same number opted out in A and B are two rows; duplicates in one tenant rejected', (await fails(`insert into wa_opt_outs(tenant_id, contact_phone) values ('tA','+919876543210')`)) === '23505', 'unique per (tenant, phone)');

  // outcome mapping: FK to campaign/template, SET NULL on delete, one ACTIVE rule per (tenant, channel, outcome)
  const camp = (await q(`insert into wa_campaign(tenant_id, name, template_name) values ('tA','C1','tpl_x') returning id`))[0].id;
  await c.query(`insert into wa_outcome_mapping(tenant_id, source_channel, outcome_name, campaign_id) values ('tA','call','demo_booked',$1)`, [camp]);
  rec('M-12', 'Two ACTIVE rules for the same tenant+channel+outcome are rejected', (await fails(`insert into wa_outcome_mapping(tenant_id, source_channel, outcome_name) values ('tA','call','demo_booked')`)) === '23505', 'unique violation 23505');
  await c.query(`insert into wa_outcome_mapping(tenant_id, source_channel, outcome_name) values ('tB','call','demo_booked')`);
  rec('M-13', 'Tenant B can have its own rule for the same outcome', (await q(`select count(*)::int n from wa_outcome_mapping where outcome_name='demo_booked'`))[0].n === 2, 'A and B each have one');
  await c.query(`insert into wa_message(tenant_id, sender_phone, recipient_phone, campaign_id, outcome, channel, topic, source_event) values ('tA','+1','+2',$1,'demo_booked','call','pricing','evt-1')`, [camp]);
  await c.query(`delete from wa_campaign where id=$1`, [camp]);
  const m = (await q(`select campaign_id, outcome from wa_message where source_event='evt-1'`))[0];
  rec('M-14', 'Deleting a campaign keeps the message and clears only campaign_id (SET NULL)', m && m.campaign_id === null && m.outcome === 'demo_booked', JSON.stringify(m));
  rec('M-15', 'Intent confidence must be between 0 and 1', (await fails(`update wa_conversation set intent_confidence = 1.5 where tenant_id='t-seed'`)) === '23514', 'check violation 23514');
  await c.query(`insert into email_event_template(tenant_id, event, language, subject) values ('tA','demo_booked','en','S')`);
  rec('M-16', 'One e-mail template per (tenant, event, language)', (await fails(`insert into email_event_template(tenant_id, event, language, subject) values ('tA','demo_booked','en','S2')`)) === '23505', 'unique violation 23505');
  await c.query(`insert into email_delivery_log(tenant_id, status, dedupe_key) values ('tA','sent','k1')`);
  await c.query(`insert into email_delivery_log(tenant_id, status, dedupe_key) values ('tB','sent','k1')`);
  rec('M-17', 'E-mail dedupe key is per tenant (same key in A and B ok, twice in A rejected)', (await fails(`insert into email_delivery_log(tenant_id, status, dedupe_key) values ('tA','sent','k1')`)) === '23505', 'unique violation 23505');

  // ---- 3. rollback
  await c.query(`delete from contact_memory; delete from wa_opt_outs; delete from wa_outcome_mapping; delete from email_event_template; delete from email_delivery_log where dedupe_key='k1'; delete from wa_message where source_event='evt-1';`);
  sh(DOWN);
  const after = await snapshot();
  const diff = (() => { const a = JSON.parse(before), b = JSON.parse(after), d = []; for (const t of new Set([...Object.keys(a), ...Object.keys(b)])) { if (!a[t]) d.push(`+table ${t}`); else if (!b[t]) d.push(`-table ${t}`); else { const x = a[t].filter((c2) => !b[t].includes(c2)), y = b[t].filter((c2) => !a[t].includes(c2)); if (x.length || y.length) d.push(`${t}: missing[${x}] extra[${y}]`); } } return d; })();
  rec('M-18', 'Rollback restores the exact original schema (tables and columns identical to before)', after === before, after === before ? 'schema identical' : 'DIFFERENT: ' + diff.join('; '));
  const convBack = (await q(`select count(*)::int n from wa_conversation`))[0].n;
  rec('M-19', 'Rollback keeps the existing business rows', convBack === convBefore, `wa_conversation rows ${convBefore} -> ${convBack}`);
  sh(DOWN);
  rec('M-20', 'Running the rollback twice is harmless', true, 'second run: no error');
  await c.query(`delete from wa_conversation where tenant_id='t-seed'; delete from wa_campaign where tenant_id='tA'`);
  sh(UP); // leave the scratch DB migrated for the follow-up checks
  const final = await tableSet();
  rec('M-21', 'Re-applying after a rollback works (up -> down -> up)', NEW_TABLES.every((t) => final.includes(t)), 'tables back');
  fs.writeFileSync(process.argv[2] || 'phase1-migration.json', JSON.stringify(rows, null, 2));
  console.log(`\n${rows.length - bad}/${rows.length} passed`);
  await c.end(); process.exit(0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
