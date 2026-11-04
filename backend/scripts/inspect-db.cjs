const fs = require('fs');
const dotenv = require('dotenv');
dotenv.config({ path: 'backend/.env.local' });
const { Client } = require('pg');
const client = new Client({ host: process.env.DB_HOST, port: 5432, user: process.env.DB_USER, password: process.env.DB_PASS, database: process.env.DB_NAME });
async function check() {
  await client.connect();
  const ramId = 'dff74932-366e-417a-b07a-2a58a14a5bae';
  
  // Copy events from f5a9ceb7-ada1-40e3-8452-67115a3aff5a to Ram Kumar
  await client.query(`
    INSERT INTO omnichannel_event (
      tenant_id, customer_id, event_type, direction, source_module, source_record_id,
      event_timestamp, title, description, summary, status, metadata
    )
    SELECT tenant_id, $1, event_type, direction, source_module, source_record_id || '-for-ram',
           event_timestamp, title, description, summary, status, metadata
    FROM omnichannel_event
    WHERE customer_id = 'f5a9ceb7-ada1-40e3-8452-67115a3aff5a'
    ON CONFLICT (tenant_id, source_module, source_record_id) DO NOTHING
  `, [ramId]);

  console.log('Copied events to Ram Kumar!');
  const ramEvents = await client.query("SELECT count(*), event_type FROM omnichannel_event WHERE customer_id = $1 GROUP BY event_type", [ramId]);
  console.log('Ram events:', ramEvents.rows);
  await client.end();
}
check();

