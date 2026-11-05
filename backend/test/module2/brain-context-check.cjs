/* eslint-disable */
/**
 * Runtime proof for item 13: the wizard answers (industry, selected workflows, goals, software) reach the AI "Brain"
 * prompt through the REAL PromptEngineService.buildAutoContext + buildSystemPrompt, reading a real tenant row.
 * Scratch DB only.   node -r ts-node/register/transpile-only -r tsconfig-paths/register test/module2/brain-context-check.cjs
 */
process.env.SECERT_KEY = process.env.SECERT_KEY || 'scratch-only-key';
require('reflect-metadata');
const { DataSource } = require('typeorm');
const path = require('path');
const { PromptEngineService } = require('../../src/WhatsApp/Services/PromptEngine.service');

(async () => {
  const dbName = process.env.DB_NAME || 'sharyx_m2';
  if (!/^sharyx_m2/.test(dbName)) { console.error('scratch DB only'); process.exit(2); }
  const ds = new DataSource({ type: 'postgres', host: '127.0.0.1', port: 5433, username: 'scratch', password: 'scratch', database: dbName, entities: [path.join(__dirname, '../../src/Database/**/*.{ts,js}')], synchronize: false });
  await ds.initialize();
  const { company } = require('../../src/Database/Table/Admin/company');
  const row = (await ds.query(`select id from company limit 1`))[0];
  const original = await ds.query(`select onboarding_data, industry from company where id=$1`, [row.id]);
  await ds.query(`update company set industry='Healthcare & Clinics', onboarding_data=$2 where id=$1`, [row.id, JSON.stringify({ selected_services: ['Patient Appointment Booking', 'No-Show Prevention Calls'], goals: ['Answer patients 24/7', 'Reduce no-shows'], apps: ['Practo', 'Gmail'] })]);
  try {
    const pe = new PromptEngineService({ emit() {} }, { formatOpenRolesForPrompt: async () => ({ promptBlock: '' }) });
    const ctx = await pe.buildAutoContext(row.id, '15551230000', 'Test', 'hello');
    const prompt = pe.buildSystemPrompt(ctx, '');
    const checks = { 'industry in prompt': /Healthcare & Clinics/.test(prompt), 'selected services in prompt': /Patient Appointment Booking, No-Show Prevention Calls/.test(prompt), 'goals in prompt': /Answer patients 24\/7; Reduce no-shows/.test(prompt), 'apps in prompt': /Practo, Gmail/.test(prompt), 'old hard-coded Sharyx services gone': !/AI Autonomous Workforce, WhatsApp Cloud Automation/.test(prompt) };
    for (const [k, v] of Object.entries(checks)) console.log(`${v ? 'PASS' : 'FAIL'}  ${k}`);
    console.log('\n--- tenant block of the generated prompt ---\n' + prompt.slice(prompt.indexOf('[APPLICATION OWNER'), prompt.indexOf('[CRM CONTACT')).trim());
    process.exitCode = Object.values(checks).every(Boolean) ? 0 : 1;
  } finally {
    await ds.query(`update company set industry=$2, onboarding_data=$3 where id=$1`, [row.id, original[0].industry, original[0].onboarding_data ? JSON.stringify(original[0].onboarding_data) : null]);
    await ds.destroy();
  }
})().catch((e) => { console.error('FATAL', e); process.exit(2); });
