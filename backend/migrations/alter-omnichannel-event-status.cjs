const { Client } = require('pg');
require('dotenv').config({ path: 'backend/.env' });

async function run() {
  const c = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASS || '12345',
    database: process.env.DB_NAME || 'ai_workforce',
  });
  await c.connect();
  await c.query(`
    ALTER TABLE omnichannel_event ADD COLUMN IF NOT EXISTS event_status VARCHAR(50) DEFAULT 'completed';
    UPDATE omnichannel_event SET event_status = COALESCE(status, 'completed') WHERE event_status IS NULL;
  `);
  console.log('ALTER TABLE SUCCESS!');
  await c.end();
}
run().catch(console.error);

