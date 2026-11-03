const axios = require('axios');
const { Client } = require('pg');
require('dotenv').config({ path: './backend/.env' });

async function runWaTests() {
  console.log('=== RUNNING WHATSAPP AUTOMATION AUDIT TEST HARNESS ===');
  const BASE_URL = 'http://localhost:8000/api/v1';

  // 1. Verify Webhook GET Handshake
  console.log('\n[TEST 1] Webhook Handshake (GET /api/v1/WhatsApp/Webhook)...');
  try {
    const res = await axios.get(`${BASE_URL}/WhatsApp/Webhook`, {
      params: {
        'hub.mode': 'subscribe',
        'hub.verify_token': 'sharyx_verify_token_secure',
        'hub.challenge': 'CHALLENGE_98765'
      }
    });
    console.log('  Result:', res.status, res.data);
  } catch (e) {
    console.error('  Error:', e.response?.status, e.message);
  }

  // 2. Inbound WhatsApp Message
  const testPhone = '919840199999';
  const wamid1 = `wamid.test_${Date.now()}_1`;
  console.log(`\n[TEST 2] Inbound WhatsApp Candidate Inquiry from ${testPhone} (ID: ${wamid1})...`);
  const inboundPayload = {
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
                  id: wamid1,
                  timestamp: Math.floor(Date.now() / 1000).toString(),
                  type: 'text',
                  text: { body: 'Hi, I am looking for Backend Developer job openings in Chennai. 4 years exp, serving notice, expected CTC 10 LPA.' }
                }
              ]
            }
          }
        ]
      }
    ]
  };

  try {
    const res = await axios.post(`${BASE_URL}/WhatsApp/Webhook`, inboundPayload);
    console.log('  Webhook POST status:', res.status, res.data);
  } catch (e) {
    console.error('  Webhook POST error:', e.message);
  }

  // 3. Test Deduplication: Deliver exact same wamid1 again
  console.log(`\n[TEST 3] Duplicate Webhook Delivery Check (Re-sending wamid1)...`);
  try {
    const res = await axios.post(`${BASE_URL}/WhatsApp/Webhook`, inboundPayload);
    console.log('  Duplicate delivery returned:', res.status, res.data);
  } catch (e) {
    console.error('  Duplicate delivery error:', e.message);
  }

  // Wait 4 seconds for AI processing
  console.log('\n  Waiting 4s for AI Copilot processing...');
  await new Promise(r => setTimeout(r, 4000));

  // 4. Check PostgreSQL DB state
  console.log('\n[TEST 4] Checking DB Records for conversation and reply...');
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASS || '12345',
    database: process.env.DB_NAME || 'ai_workforce'
  });

  try {
    await client.connect();
    const conv = await client.query('SELECT id, customer_phone, customer_name, conversation_status, last_message_text FROM wa_conversation WHERE customer_phone=$1', [testPhone]);
    console.log('  wa_conversation:', conv.rows[0]);

    const msgs = await client.query('SELECT direction, message_text, delivery_status, is_ai_generated, created_on FROM wa_message WHERE recipient_phone=$1 OR sender_phone=$1 ORDER BY created_on ASC', [testPhone]);
    console.log(`  wa_message records (${msgs.rows.length}):`);
    msgs.rows.forEach((m, i) => console.log(`    [${i+1}] [${m.direction}] [AI:${m.is_ai_generated}] ${m.message_text.slice(0, 100)}...`));

    const ld = await client.query('SELECT id, name, phone, job_title, candidate_stage, total_experience, expected_ctc, employment_status FROM lead WHERE phone=$1', [testPhone]);
    console.log('  lead CRM profile:', ld.rows[0]);

    // Clean up test records
    await client.query('DELETE FROM wa_message WHERE recipient_phone=$1 OR sender_phone=$1', [testPhone]);
    await client.query('DELETE FROM wa_conversation WHERE customer_phone=$1', [testPhone]);
    await client.query('DELETE FROM lead WHERE phone=$1', [testPhone]);
    await client.query('DELETE FROM processed_messages WHERE sender_phone=$1', [testPhone]);
    console.log('  (Test records cleaned up from DB)');
    await client.end();
  } catch (dbErr) {
    console.error('  DB check error:', dbErr.message);
  }

  console.log('\n=== TEST HARNESS EXECUTION COMPLETE ===');
}

runWaTests().catch(console.error);
