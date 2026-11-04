const { Client } = require('pg');

async function getStats() {
  const c = new Client({
    host: '158.220.99.156',
    port: 5432,
    user: 'myuser',
    password: 'Login@123!',
    database: 'assistant_sharyx'
  });
  await c.connect();

  const tables = [
    'lead', 'customer', 'customer_identity_mapping', 'communications', 'omnichannel_event',
    'wa_conversation', 'wa_message', 'email_log', 'voice_call_log',
    'customer_interaction', 'lead_activity', 'omnichannel_conversation', 'omnichannel_conversations',
    'omnichannel_message', 'omnichannel_messages', 'omnichannel_call', 'omnichannel_calls',
    'job_openings', 'email_campaign', 'wa_campaign'
  ];

  console.log('--- ROW COUNTS ---');
  for (const t of tables) {
    try {
      const res = await c.query(`SELECT COUNT(*) as cnt FROM "${t}"`);
      console.log(`${t}: ${res.rows[0].cnt}`);
    } catch (e) {
      console.log(`${t}: ERROR ${e.message}`);
    }
  }

  // Sample lead
  const leadSample = await c.query(`SELECT id, name, phone, email, company_name, lead_status, created_on FROM lead LIMIT 3`);
  console.log('\n--- SAMPLE LEADS ---', leadSample.rows);

  // Sample customer
  const custSample = await c.query(`SELECT id, name, phone, email, company_name, customer_status, created_on FROM customer LIMIT 3`);
  console.log('\n--- SAMPLE CUSTOMERS ---', custSample.rows);

  // Check columns of lead, customer, wa_message, email_log, voice_call_log, communications, omnichannel_event
  const detailedTables = ['lead', 'customer', 'customer_identity_mapping', 'wa_conversation', 'wa_message', 'email_log', 'voice_call_log', 'communications', 'omnichannel_event', 'job_openings'];
  for (const dt of detailedTables) {
    const cols = await c.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema='public' AND table_name=$1
      ORDER BY ordinal_position
    `, [dt]);
    console.log(`\n--- COLUMNS FOR ${dt} ---`);
    cols.rows.forEach(col => console.log(`  ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`));
  }

  await c.end();
}

getStats().catch(console.error);

