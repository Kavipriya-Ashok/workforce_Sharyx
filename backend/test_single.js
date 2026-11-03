const { Client } = require('pg');
require('dotenv').config({ path: './.env' });
const axios = require('axios');

async function testSingleMessage() {
  const c = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASS || '12345',
    database: process.env.DB_NAME || 'ai_workforce'
  });
  await c.connect();

  const testPhone = '919840199999';
  const wamid = `wamid.live_audit_${Date.now()}`;
  console.log('Sending message with wamid:', wamid);

  const payload = {
    entry: [
      {
        changes: [
          {
            value: {
              metadata: { display_phone_number: '+919344078088' },
              contacts: [{ profile: { name: 'Karthik Raja' }, wa_id: testPhone }],
              messages: [
                {
                  from: testPhone,
                  id: wamid,
                  timestamp: Math.floor(Date.now() / 1000).toString(),
                  type: 'text',
                  text: { body: 'Hi, I am looking for Backend Developer job openings in Chennai.' }
                }
              ]
            }
          }
        ]
      }
    ]
  };

  const res = await axios.post('http://localhost:8000/api/v1/WhatsApp/Webhook', payload);
  console.log('Response:', res.data);

  // Poll database every 1 second for 10 seconds
  for (let i = 0; i < 10; i++) {
    await new Promise(r => setTimeout(r, 1000));
    const conv = await c.query('SELECT * FROM wa_conversation WHERE customer_phone=$1', [testPhone]);
    const msgs = await c.query('SELECT * FROM wa_message WHERE recipient_phone=$1 OR sender_phone=$1', [testPhone]);
    console.log(`Poll ${i+1}s: Conv count=${conv.rows.length}, Msgs count=${msgs.rows.length}`);
    if (msgs.rows.length > 0) {
      console.log('Found messages:');
      msgs.rows.forEach(m => console.log(' ->', m.direction, m.delivery_status, m.message_text));
      break;
    }
  }

  // Cleanup
  await c.query('DELETE FROM wa_message WHERE recipient_phone=$1 OR sender_phone=$1', [testPhone]);
  await c.query('DELETE FROM wa_conversation WHERE customer_phone=$1', [testPhone]);
  await c.query('DELETE FROM lead WHERE phone=$1', [testPhone]);
  await c.query('DELETE FROM processed_messages WHERE sender_phone=$1', [testPhone]);
  await c.end();
}

testSingleMessage().catch(console.error);
