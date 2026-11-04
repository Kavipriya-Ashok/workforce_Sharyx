const dotenv = require('dotenv');
dotenv.config({ path: 'backend/.env.local' });
const { Client } = require('pg');
const client = new Client({ host: process.env.DB_HOST, port: 5432, user: process.env.DB_USER, password: process.env.DB_PASS, database: process.env.DB_NAME });

async function checkKavi() {
  await client.connect();
  const kaviLead = await client.query("SELECT id, name, phone, email FROM lead WHERE name ILIKE '%kavi%' OR phone ILIKE '%8015779116%'");
  console.log('Kavi in lead:', kaviLead.rows);

  const kaviCust = await client.query("SELECT id, name, phone, email FROM customer WHERE name ILIKE '%kavi%' OR phone ILIKE '%8015779116%'");
  console.log('Kavi in customer:', kaviCust.rows);

  const waRes = await client.query(`
    SELECT id, conversation_id, direction, message_text, created_on, sender_phone, recipient_phone 
    FROM wa_message 
    WHERE sender_phone ILIKE '%8015779116%' OR recipient_phone ILIKE '%8015779116%' 
    ORDER BY created_on ASC
  `);
  console.log(`Kavi wa_messages (${waRes.rows.length}):`);
  waRes.rows.slice(0, 10).forEach(m => {
    console.log(` - [${m.created_on ? m.created_on.toISOString() : 'no time'}] (${m.direction}): ${(m.message_text||'').substring(0, 50)}`);
  });

  // Check what is currently in communications table for Kavi's lead id:
  if (kaviLead.rows.length > 0) {
    const leadId = kaviLead.rows[0].id;
    const commsRes = await client.query("SELECT id, channel, direction, description, occurred_at FROM communications WHERE lead_id = $1 ORDER BY occurred_at ASC", [leadId]);
    console.log(`Comms in communications table for Kavi (${commsRes.rows.length}):`);
    commsRes.rows.slice(0, 10).forEach(c => {
      console.log(` - [${c.occurred_at ? c.occurred_at.toISOString() : 'no time'}] (${c.direction}): ${c.description}`);
    });
  }

  await client.end();
}
checkKavi().catch(console.error);

