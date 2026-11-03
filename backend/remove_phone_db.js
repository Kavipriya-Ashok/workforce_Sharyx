const { Client } = require('pg');

async function scanAndRemove() {
  const phone = '8015779116';
  const client = new Client({
    host: '158.220.99.156',
    port: 5432,
    user: 'myuser',
    password: 'Login@123!',
    database: 'assistant_sharyx',
  });
  await client.connect();

  console.log('=== ALL TABLES IN DB ===');
  const tablesRes = await client.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
  );
  const tableNames = tablesRes.rows.map((r) => r.table_name);
  console.log('Found tables:', tableNames.join(', '));

  console.log(`\n=== SEARCHING FOR ${phone} ACROSS ALL RELEVANT TABLES ===`);
  for (const table of tableNames) {
    try {
      // Find text or varchar columns
      const colsRes = await client.query(
        "SELECT column_name FROM information_schema.columns WHERE table_name = $1 AND data_type IN ('text', 'character varying')",
        [table]
      );
      const cols = colsRes.rows.map((c) => c.column_name);
      if (cols.length === 0) continue;

      const whereClauses = cols.map((c) => `"${c}" ILIKE '%${phone}%'`).join(' OR ');
      const checkRes = await client.query(`SELECT COUNT(*) FROM "${table}" WHERE ${whereClauses}`);
      const count = parseInt(checkRes.rows[0].count, 10);
      if (count > 0) {
        console.log(`📍 Found in [${table}]: ${count} row(s)`);
        // If it's a whatsapp or conversation table, delete it
        if (
          table.includes('whatsapp') ||
          table.includes('conversation') ||
          table.includes('chat') ||
          table.includes('agent_state')
        ) {
          const delRes = await client.query(`DELETE FROM "${table}" WHERE ${whereClauses}`);
          console.log(`   🗑️ Deleted ${delRes.rowCount} row(s) from [${table}]!`);
        } else if (table === 'lead') {
          // Check if user wants phone cleared from lead or whatsapp lead
          console.log(`   ℹ️ [lead] has ${count} row(s) with this phone.`);
        }
      }
    } catch (e) {
      // ignore
    }
  }

  await client.end();
}

scanAndRemove().catch(console.error);
