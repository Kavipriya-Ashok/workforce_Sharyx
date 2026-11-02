const { Client } = require('pg');
const client = new Client({
  host: '158.220.99.156',
  port: 5432,
  user: 'myuser',
  password: 'Login@123!',
  database: 'assistant_sharyx'
});

async function main() {
  await client.connect();
  const res = await client.query("SELECT id, recording_url, call_status, duration_seconds, provider_call_id, summary, created_on FROM voice_call_log WHERE customer_phone LIKE '%8015779116%' ORDER BY created_on DESC LIMIT 5");
  console.log("Recent calls for 8015779116:", res.rows);
  await client.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

