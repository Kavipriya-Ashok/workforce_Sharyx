const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const client = new Client({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME
});

async function main() {
  await client.connect();
  const res = await client.query('SELECT u.id, u.email, u.company_id, u.status, c.name as company_name, u.password FROM "user" u LEFT JOIN company c ON u.company_id = c.id');
  console.log('--- USERS IN assistant_sharyx ---');
  res.rows.forEach(r => {
    const isScrypt = (r.password || '').startsWith('scrypt$');
    console.log(`- Email: ${r.email} | CompanyID: ${r.company_id} (${r.company_name}) | Status: ${r.status} | Scrypt: ${isScrypt}`);
  });
  await client.end();
}

main().catch(console.error);
