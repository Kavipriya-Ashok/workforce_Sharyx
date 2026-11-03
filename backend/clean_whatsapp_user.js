const { Client } = require('pg');

async function cleanWhatsApp() {
  const phone = '8015779116';
  const client = new Client({
    host: '158.220.99.156',
    port: 5432,
    user: 'myuser',
    password: 'Login@123!',
    database: 'assistant_sharyx',
  });
  await client.connect();

  console.log(`🧹 Clearing all WhatsApp data for ${phone}...`);

  const tables = [
    'wa_conversation',
    'wa_message',
    'conversation_agent_state',
    'processed_messages',
    'customer_interaction',
    'customer'
  ];

  for (const table of tables) {
    try {
      const colsRes = await client.query(
        "SELECT column_name FROM information_schema.columns WHERE table_name = $1 AND data_type IN ('text', 'character varying')",
        [table]
      );
      const cols = colsRes.rows.map((r) => r.column_name);
      if (cols.length === 0) continue;

      const whereClauses = cols.map((c) => `"${c}" ILIKE '%${phone}%'`).join(' OR ');
      const del = await client.query(`DELETE FROM "${table}" WHERE ${whereClauses}`);
      console.log(`✅ [${table}] deleted: ${del.rowCount} record(s)`);
    } catch (err) {
      console.warn(`[${table}]: ${err.message}`);
    }
  }

  console.log('\n🔎 Final Verification:');
  for (const table of tables) {
    try {
      const colsRes = await client.query(
        "SELECT column_name FROM information_schema.columns WHERE table_name = $1 AND data_type IN ('text', 'character varying')",
        [table]
      );
      const cols = colsRes.rows.map((r) => r.column_name);
      if (cols.length === 0) continue;
      const whereClauses = cols.map((c) => `"${c}" ILIKE '%${phone}%'`).join(' OR ');
      const chk = await client.query(`SELECT COUNT(*) FROM "${table}" WHERE ${whereClauses}`);
      console.log(`   ${table} remaining: ${chk.rows[0].count}`);
    } catch (e) {
      // ignore
    }
  }

  await client.end();
}

cleanWhatsApp().catch(console.error);
