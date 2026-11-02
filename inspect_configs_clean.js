const { Client } = require('c:/Users/hp/workforce_Sharyx/backend/node_modules/pg');

async function checkConfigs() {
  const c = new Client({ connectionString: 'postgresql://myuser:Login%40123%21@158.220.99.156:5432/assistant_sharyx' });
  await c.connect();

  console.log('--- EMAIL CONFIG ---');
  const eCfg = await c.query("SELECT * FROM email_config");
  console.log(eCfg.rows);

  console.log('\n--- EMAIL ACCOUNT CONFIG ---');
  const eAcc = await c.query("SELECT * FROM email_account_config");
  console.log(eAcc.rows);

  console.log('\n--- VOICE PROVIDER CONFIG ---');
  const vCfg = await c.query("SELECT provider, api_key, phone_number_id, caller_id, is_active, updated_on FROM voice_provider_config");
  console.log(vCfg.rows);

  console.log('\n--- LAST 5 VOICE CALL LOGS ---');
  const vLogs = await c.query("SELECT id, customer_phone, status, provider, created_on, summary FROM voice_call_log ORDER BY created_on DESC LIMIT 5");
  console.log(vLogs.rows);

  await c.end();
}

checkConfigs().catch(console.error);
