const { Client } = require('pg');

const c = new Client({
  host: '158.220.99.156',
  port: 5432,
  user: 'myuser',
  password: 'Login@123!',
  database: 'new_sharyx_saas',
  ssl: false
});

async function main() {
  await c.connect();
  const res = await c.query("SELECT * FROM call WHERE caller LIKE '%8015779116%' OR provider_call_id = '9150e036-0441-4841-b052-987bc48364f0' ORDER BY created_on DESC LIMIT 5");
  console.log('CALL RECORD IN SAAS:', JSON.stringify(res.rows, null, 2));
  await c.end();
}

main().catch(console.error);
