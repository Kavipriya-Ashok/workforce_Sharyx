const { Client } = require('c:/Users/hp/workforce_Sharyx/backend/node_modules/pg');

async function inspectVoiceAndEmail() {
  const c = new Client({ connectionString: 'postgresql://myuser:Login%40123%21@158.220.99.156:5432/assistant_sharyx' });
  await c.connect();

  console.log('=== VOICE PROVIDER CONFIG ===');
  const vCfg = await c.query("SELECT * FROM voice_provider_config");
  console.log(JSON.stringify(vCfg.rows, null, 2));

  console.log('=== VOICE AGENTS ===');
  const vAgents = await c.query("SELECT * FROM voice_agent");
  console.log(JSON.stringify(vAgents.rows, null, 2));

  console.log('=== RECENT VOICE CALL LOGS ===');
  const vLogs = await c.query("SELECT * FROM voice_call_log ORDER BY created_on DESC LIMIT 5");
  console.log(JSON.stringify(vLogs.rows, null, 2));

  console.log('=== EMAIL CONFIG ===');
  const eCfg = await c.query("SELECT * FROM email_config");
  console.log(JSON.stringify(eCfg.rows, null, 2));

  console.log('=== EMAIL ACCOUNT CONFIG ===');
  const eAcc = await c.query("SELECT * FROM email_account_config");
  console.log(JSON.stringify(eAcc.rows, null, 2));

  console.log('=== RECENT EMAIL LOGS ===');
  const eLogs = await c.query("SELECT * FROM email_log ORDER BY created_on DESC LIMIT 5");
  console.log(JSON.stringify(eLogs.rows, null, 2));

  await c.end();
}

inspectVoiceAndEmail().catch(console.error);

