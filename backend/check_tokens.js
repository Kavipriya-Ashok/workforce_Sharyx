const { Client } = require('pg');

async function check() {
  const client = new Client({
    host: '158.220.99.156',
    port: 5432,
    user: 'myuser',
    password: 'Login@123!',
    database: 'assistant_sharyx',
  });
  await client.connect();

  const res = await client.query("SELECT tenant_id, access_token FROM whatsapp_config");
  for (const r of res.rows) {
    console.log(`Tenant: ${r.tenant_id}`);
    console.log(`Token: ${r.access_token ? r.access_token.slice(0, 35) + '... (len: ' + r.access_token.length + ')' : 'NULL'}`);
  }

  await client.end();
}

check().catch(console.error);

