const { Client } = require('pg');
const client = new Client({
  host: '158.220.99.156',
  port: 5432,
  user: 'myuser',
  password: 'Login@123!',
  database: 'assistant_sharyx'
});
async function run() {
  await client.connect();
  const tables = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
  const wa = tables.rows.filter(r => r.table_name.toLowerCase().includes('whatsapp') || r.table_name.toLowerCase().includes('message') || r.table_name.toLowerCase().includes('conversation'));
  console.log('Tables:', wa.map(w => w.table_name));

  for (const t of wa) {
    const c = await client.query(`SELECT count(*) FROM "${t.table_name}"`);
    console.log(`${t.table_name}: ${c.rows[0].count} rows`);
  }

  // Also sample whatsapp_conversation or messages
  const convs = await client.query('SELECT * FROM whatsapp_conversation LIMIT 5').catch(() => null);
  if (convs) console.log('CONVERSATIONS SAMPLE:', convs.rows);

  const msgs = await client.query('SELECT * FROM whatsapp_message LIMIT 5').catch(() => null);
  if (msgs) console.log('MESSAGES SAMPLE:', msgs.rows);

  const tpls = await client.query('SELECT * FROM whatsapp_template LIMIT 5').catch(() => null);
  if (tpls) console.log('TEMPLATES SAMPLE:', tpls.rows);

  await client.end();
}
run().catch(console.error);
