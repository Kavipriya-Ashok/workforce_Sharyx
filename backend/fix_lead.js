const { Client } = require('pg');

async function fix() {
  const client = new Client({
    host: '158.220.99.156',
    port: 5432,
    user: 'myuser',
    password: 'Login@123!',
    database: 'assistant_sharyx',
  });
  await client.connect();

  const res = await client.query(
    "UPDATE lead SET name = 'Kavipriya Ashok', phone = '8015779116' WHERE email = 'sharyx.kavipriya@gmail.com'"
  );
  console.log('✅ Updated lead records:', res.rowCount);

  const check = await client.query(
    "SELECT id, name, email, phone FROM lead WHERE email = 'sharyx.kavipriya@gmail.com'"
  );
  console.table(check.rows);

  await client.end();
}

fix().catch(console.error);

