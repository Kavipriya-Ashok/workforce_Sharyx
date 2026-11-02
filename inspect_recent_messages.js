const { Client } = require('./backend/node_modules/pg');

async function main() {
  const client = new Client({
    connectionString: 'postgresql://myuser:Login%40123%21@158.220.99.156:5432/assistant_sharyx'
  });
  await client.connect();
  const msgs = await client.query("SELECT id, message_type, message_text, created_on, direction FROM wa_message WHERE direction = 'outbound' ORDER BY created_on DESC LIMIT 6");
  console.log('RECENT OUTBOUND MESSAGES:');
  msgs.rows.reverse().forEach((m, i) => {
    console.log(`\n=== Message ${i+1} [${m.created_on.toISOString()}] ===\n${m.message_text}`);
  });
  await client.end();
}

main().catch(console.error);
