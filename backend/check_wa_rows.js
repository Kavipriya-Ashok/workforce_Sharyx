const { Client } = require('pg');

async function test() {
  const client = new Client({
    host: '158.220.99.156',
    port: 5432,
    user: 'myuser',
    password: 'Login@123!',
    database: 'assistant_sharyx',
  });
  await client.connect();

  console.log('=== WA_CONVERSATIONS ===');
  const c = await client.query('SELECT id, customer_phone, customer_name, last_message_text, last_message_at FROM wa_conversation ORDER BY last_message_at DESC LIMIT 5');
  console.table(c.rows);

  console.log('=== WA_MESSAGES ===');
  const m = await client.query('SELECT id, sender_phone, recipient_phone, direction, message_text, delivery_status, created_on FROM wa_message ORDER BY created_on DESC LIMIT 5');
  console.table(m.rows);

  await client.end();
}

test().catch(console.error);

