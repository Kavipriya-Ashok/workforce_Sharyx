#!/usr/bin/env node
/* eslint-disable */
/**
 * Module 2 / item 2 - encrypt secrets that are still stored as plain text, with a safe rollback.
 *
 *   node scripts/encrypt-stored-secrets.cjs status                 what is plain / encrypted (counts only)
 *   node scripts/encrypt-stored-secrets.cjs apply                  DRY RUN: shows what would change
 *   node scripts/encrypt-stored-secrets.cjs apply --commit         backs up, encrypts, VERIFIES, then commits
 *   node scripts/encrypt-stored-secrets.cjs rollback --commit      restores the original values from the backup table
 *   node scripts/encrypt-stored-secrets.cjs drop-shared-google-secret [--commit]
 *                                                                  NULLs email_account_config.client_secret where it equals
 *                                                                  GOOGLE_CLIENT_SECRET (the app falls back to the env value)
 *
 * Format written: "enc:v1:" + CryptoJS.AES(passphrase = SECERT_KEY)  - identical to Helper/SecretTransformer.ts, which the
 * app already uses to read (and transparently decrypt) these columns. Plain legacy values stay readable, so the app works
 * BEFORE, DURING and AFTER this script - there is no required ordering.
 *
 * Safety: one transaction; originals are copied to secrets_migration_backup first; every encrypted value is decrypted
 * again and compared to its original before COMMIT (any mismatch aborts everything); secrets are never printed.
 * Connection comes from DB_HOST/DB_PORT/DB_USER/DB_PASS/DB_NAME (process env, else backend/.env.local). Pointing it at a
 * non-local host requires --i-know-this-is-remote.
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const CryptoJS = require('crypto-js');

const args = process.argv.slice(2);
const mode = args[0] || 'status';
const commit = args.includes('--commit');

function loadEnv() {
  const f = path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(f)) return;
  for (const line of fs.readFileSync(f, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].trim();
  }
}
loadEnv();

const PREFIX = 'enc:v1:';
const KEY = process.env.SECERT_KEY;
if (!KEY) { console.error('SECERT_KEY is not set; refusing to continue.'); process.exit(2); }
const enc = (v) => PREFIX + CryptoJS.AES.encrypt(String(v), KEY).toString();
const dec = (v) => CryptoJS.AES.decrypt(v.slice(PREFIX.length), KEY).toString(CryptoJS.enc.Utf8);
const isPlain = (v) => typeof v === 'string' && v !== '' && !v.startsWith(PREFIX);

const TARGETS = [
  ['email_account_config', ['client_secret', 'refresh_token', 'access_token', 'smtp_password']],
  ['whatsapp_config', ['access_token', 'app_secret', 'api_key']],
  ['wa_ai_config', ['api_key']],
  ['email_ai_config', ['api_key']],
  ['voice_provider_config', ['api_key']],
];

(async () => {
  const host = process.env.DB_HOST || 'localhost';
  const local = ['localhost', '127.0.0.1', '::1'].includes(host);
  if (!local && !args.includes('--i-know-this-is-remote')) {
    console.error(`DB_HOST=${host} is not local. Re-run with --i-know-this-is-remote if you really mean it.`);
    process.exit(2);
  }
  const db = new Client({ host, port: Number(process.env.DB_PORT || 5432), user: process.env.DB_USER, password: process.env.DB_PASS, database: process.env.DB_NAME });
  await db.connect();
  console.log(`database: ${process.env.DB_NAME} @ ${host}:${process.env.DB_PORT || 5432}   mode: ${mode}${commit ? ' --commit' : ' (dry run)'}`);
  const exists = async (t) => (await db.query(`select to_regclass($1) as r`, [t])).rows[0].r !== null;

  try {
    if (mode === 'status') {
      for (const [t, cols] of TARGETS) {
        if (!(await exists(t))) { console.log(`${t}: (table missing)`); continue; }
        for (const c of cols) {
          const r = (await db.query(`select count(*) filter (where "${c}" is null or "${c}"='') as empty, count(*) filter (where "${c}" like $1) as encrypted, count(*) filter (where "${c}" is not null and "${c}"<>'' and "${c}" not like $1) as plain from "${t}"`, [PREFIX + '%'])).rows[0];
          console.log(`${t}.${c}: plain=${r.plain} encrypted=${r.encrypted} empty=${r.empty}`);
        }
      }
    } else if (mode === 'apply') {
      await db.query('BEGIN');
      await db.query(`create table if not exists secrets_migration_backup (
        id bigserial primary key, table_name text not null, row_id text not null, column_name text not null,
        original_value text, written_value text, backed_up_at timestamptz not null default now())`);
      let changed = 0;
      for (const [t, cols] of TARGETS) {
        if (!(await exists(t))) continue;
        for (const c of cols) {
          const rows = (await db.query(`select id::text as id, "${c}" as v from "${t}" where "${c}" is not null and "${c}" <> '' and "${c}" not like $1`, [PREFIX + '%'])).rows;
          for (const row of rows) {
            const written = enc(row.v);
            if (dec(written) !== row.v) throw new Error(`round-trip failed for ${t}.${c} id=${row.id}`); // verify BEFORE writing
            await db.query(`insert into secrets_migration_backup(table_name,row_id,column_name,original_value,written_value) values($1,$2,$3,$4,$5)`, [t, row.id, c, row.v, written]);
            await db.query(`update "${t}" set "${c}" = $1 where id = $2::uuid`, [written, row.id]);
            changed++;
          }
          if (rows.length) console.log(`${t}.${c}: ${rows.length} value(s) ${commit ? 'encrypted' : 'would be encrypted'}`);
        }
      }
      // final verification pass: every row we touched must decrypt back to its backed-up original
      const bad = (await db.query(`select b.table_name, b.column_name, b.row_id, b.original_value, b.written_value from secrets_migration_backup b where b.written_value is not null and b.backed_up_at > now() - interval '1 hour'`)).rows
        .filter((b) => { try { return dec(b.written_value) !== b.original_value; } catch { return true; } });
      if (bad.length) throw new Error(`${bad.length} verification failure(s); nothing committed`);
      console.log(`verified: ${changed} value(s) decrypt back to the original`);
      if (commit) { await db.query('COMMIT'); console.log('COMMITTED. Originals are in table secrets_migration_backup (delete it after you are sure; it holds plain text).'); }
      else { await db.query('ROLLBACK'); console.log('dry run: nothing was changed. Re-run with --commit to apply.'); }
    } else if (mode === 'rollback') {
      if (!(await exists('secrets_migration_backup'))) { console.log('no backup table: nothing to roll back'); return; }
      await db.query('BEGIN');
      const rows = (await db.query(`select table_name, row_id, column_name, original_value, written_value from secrets_migration_backup order by id desc`)).rows;
      let n = 0;
      for (const b of rows) {
        const allowed = TARGETS.find(([t, cols]) => t === b.table_name && cols.includes(b.column_name));
        if (!allowed) continue;
        const r = await db.query(`update "${b.table_name}" set "${b.column_name}" = $1 where id = $2::uuid and "${b.column_name}" = $3`, [b.original_value, b.row_id, b.written_value]);
        n += r.rowCount;
      }
      console.log(`${n} value(s) ${commit ? 'restored to their original form' : 'would be restored'} (rows edited since the migration are left alone)`);
      if (commit) { await db.query('COMMIT'); console.log('COMMITTED.'); } else { await db.query('ROLLBACK'); console.log('dry run: nothing was changed.'); }
    } else if (mode === 'drop-shared-google-secret') {
      const shared = process.env.GOOGLE_CLIENT_SECRET;
      if (!shared) { console.error('GOOGLE_CLIENT_SECRET is not set'); process.exit(2); }
      await db.query('BEGIN');
      await db.query(`create table if not exists secrets_migration_backup (id bigserial primary key, table_name text not null, row_id text not null, column_name text not null, original_value text, written_value text, backed_up_at timestamptz not null default now())`);
      const rows = (await db.query(`select id::text as id, client_secret as v from email_account_config where client_secret is not null and client_secret <> ''`)).rows;
      let n = 0;
      for (const row of rows) {
        const plain = row.v.startsWith(PREFIX) ? dec(row.v) : row.v;
        if (plain !== shared) continue; // a tenant's OWN client secret is never touched
        await db.query(`insert into secrets_migration_backup(table_name,row_id,column_name,original_value,written_value) values('email_account_config',$1,'client_secret',$2,NULL)`, [row.id, row.v]);
        await db.query(`update email_account_config set client_secret = NULL where id = $1::uuid`, [row.id]);
        n++;
      }
      console.log(`${n} row(s) hold the platform's shared Google secret ${commit ? '- cleared (the app uses GOOGLE_CLIENT_SECRET from the environment)' : '- would be cleared'}`);
      if (commit) { await db.query('COMMIT'); console.log('COMMITTED.'); } else { await db.query('ROLLBACK'); console.log('dry run: nothing was changed.'); }
    } else {
      console.log('usage: status | apply [--commit] | rollback [--commit] | drop-shared-google-secret [--commit]');
    }
  } catch (e) {
    try { await db.query('ROLLBACK'); } catch {}
    console.error('ABORTED, nothing was changed:', e.message);
    process.exitCode = 1;
  } finally {
    await db.end();
  }
})();
