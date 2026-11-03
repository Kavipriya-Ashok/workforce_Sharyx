const { Client } = require('pg');
require('dotenv').config({ path: './.env' });

async function checkConstraint() {
  const c = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASS || '12345',
    database: process.env.DB_NAME || 'ai_workforce'
  });
  await c.connect();
  try {
    const res = await c.query(
      `INSERT INTO processed_messages (wamid, sender_phone, created_at) VALUES ($1, $2, NOW()) ON CONFLICT (wamid) DO NOTHING RETURNING wamid`,
      ['test_wamid_999', '919840199999']
    );
    console.log('Insert result:', res.rows);
  } catch (err) {
    console.error('💥 INSERT ERROR:', err.message);
  }
  await c.end();
}
checkConstraint();
