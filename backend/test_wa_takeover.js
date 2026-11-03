const axios = require('axios');
const { Client } = require('pg');

async function testTakeoverFlow() {
  console.log('=== TESTING BUG-WA-002: HUMAN TAKEOVER PERSISTENCE & BOT SUPPRESSION ===');
  const BASE_URL = 'http://localhost:8000/api/v1';

  const client = new Client({
    host: '158.220.99.156',
    port: 5432,
    user: 'myuser',
    password: 'Login@123!',
    database: 'assistant_sharyx',
  });
  await client.connect();

  const testPhone = '919840998877';
  const testWamid = `wamid.takeover_${Date.now()}`;

  // Clean any previous test records
  await client.query('DELETE FROM wa_message WHERE recipient_phone=$1 OR sender_phone=$1', [testPhone]);
  await client.query('DELETE FROM wa_conversation WHERE customer_phone=$1', [testPhone]);
  await client.query('DELETE FROM lead WHERE phone=$1', [testPhone]);
  await client.query('DELETE FROM processed_messages WHERE sender_phone=$1', [testPhone]);

  // 1. Send first message to create conversation
  console.log('\n[STEP 1] Creating initial conversation via webhook...');
  const msg1Payload = {
    entry: [{
      changes: [{
        value: {
          metadata: { display_phone_number: '+919344078088' },
          contacts: [{ profile: { name: 'Praveen Tester' }, wa_id: testPhone }],
          messages: [{
            from: testPhone,
            id: testWamid,
            timestamp: Math.floor(Date.now() / 1000).toString(),
            type: 'text',
            text: { body: 'Hello, need help with product details.' }
          }]
        }
      }]
    }]
  };
  await axios.post(`${BASE_URL}/WhatsApp/Webhook`, msg1Payload);

  let conv = null;
  for (let i = 0; i < 10; i++) {
    await new Promise(r => setTimeout(r, 1000));
    const convRes = await client.query('SELECT id, customer_phone, conversation_status FROM wa_conversation WHERE customer_phone=$1', [testPhone]);
    if (convRes.rows.length > 0) {
      conv = convRes.rows[0];
      break;
    }
  }

  if (!conv) {
    throw new Error('FAILED: Initial conversation was not created within 10s!');
  }
  console.log('  Initial conversation created:', conv.id, 'Status:', conv.conversation_status);

  // Wait for initial bot reply to complete
  await new Promise(r => setTimeout(r, 4000));

  // 2. Activate Human Takeover via API
  console.log('\n[STEP 2] Activating Human Takeover via PATCH /Conversations/:id/status...');
  const patchRes1 = await axios.patch(`${BASE_URL}/WhatsApp/Conversations/${conv.id}/status`, {
    status: 'human_takeover'
  });
  console.log('  API Response status:', patchRes1.status, 'Payload:', patchRes1.data?.AddtionalData || patchRes1.data);

  // Verify DB state
  const convRes2 = await client.query('SELECT conversation_status FROM wa_conversation WHERE id=$1', [conv.id]);
  console.log('  DB conversation_status after takeover:', convRes2.rows[0].conversation_status);
  if (convRes2.rows[0].conversation_status !== 'human_takeover') {
    throw new Error('FAILED: DB conversation_status was not updated to human_takeover!');
  }

  // Count outbound AI messages before sending test message
  const msgsBefore = await client.query('SELECT count(*) FROM wa_message WHERE recipient_phone=$1 AND is_ai_generated=true', [testPhone]);
  const countBefore = parseInt(msgsBefore.rows[0].count);
  console.log(`  Outbound AI messages before test: ${countBefore}`);

  // 3. Send second candidate message while Human Takeover is active
  console.log('\n[STEP 3] Sending inbound message while human takeover is ACTIVE...');
  const testWamid2 = `wamid.takeover_${Date.now()}_2`;
  const msg2Payload = {
    entry: [{
      changes: [{
        value: {
          metadata: { display_phone_number: '+919344078088' },
          contacts: [{ profile: { name: 'Praveen Tester' }, wa_id: testPhone }],
          messages: [{
            from: testPhone,
            id: testWamid2,
            timestamp: Math.floor(Date.now() / 1000).toString(),
            type: 'text',
            text: { body: 'Are you a real human or a bot?' }
          }]
        }
      }]
    }]
  };
  await axios.post(`${BASE_URL}/WhatsApp/Webhook`, msg2Payload);
  console.log('  Waiting 5s to verify bot does NOT reply...');
  await new Promise(r => setTimeout(r, 5000));

  const msgsAfter = await client.query('SELECT count(*) FROM wa_message WHERE recipient_phone=$1 AND is_ai_generated=true', [testPhone]);
  const countAfter = parseInt(msgsAfter.rows[0].count);
  console.log(`  AI messages count: before=${countBefore}, after=${countAfter}`);

  if (countAfter !== countBefore) {
    throw new Error('FAILED: Bot replied during human takeover!');
  }
  console.log('  SUCCESS: Bot was completely suppressed during human takeover!');

  // 4. Release Takeover back to bot
  console.log('\n[STEP 4] Releasing Human Takeover back to AI (status = open)...');
  const patchRes2 = await axios.patch(`${BASE_URL}/WhatsApp/Conversations/${conv.id}/status`, {
    status: 'open'
  });
  console.log('  API Response status:', patchRes2.status);
  const convRes3 = await client.query('SELECT conversation_status FROM wa_conversation WHERE id=$1', [conv.id]);
  console.log('  DB conversation_status after release:', convRes3.rows[0].conversation_status);
  if (convRes3.rows[0].conversation_status !== 'open') {
    throw new Error('FAILED: DB conversation_status was not updated back to open!');
  }

  // 5. Send third message and verify bot resumes
  console.log('\n[STEP 5] Sending inbound message after release to verify bot resumes...');
  const testWamid3 = `wamid.takeover_${Date.now()}_3`;
  const msg3Payload = {
    entry: [{
      changes: [{
        value: {
          metadata: { display_phone_number: '+919344078088' },
          contacts: [{ profile: { name: 'Praveen Tester' }, wa_id: testPhone }],
          messages: [{
            from: testPhone,
            id: testWamid3,
            timestamp: Math.floor(Date.now() / 1000).toString(),
            type: 'text',
            text: { body: 'Can I apply for the role?' }
          }]
        }
      }]
    }]
  };
  await axios.post(`${BASE_URL}/WhatsApp/Webhook`, msg3Payload);
  console.log('  Waiting 5s for bot reply...');
  await new Promise(r => setTimeout(r, 5000));

  const msgsResumed = await client.query('SELECT count(*) FROM wa_message WHERE recipient_phone=$1 AND is_ai_generated=true', [testPhone]);
  const countResumed = parseInt(msgsResumed.rows[0].count);
  console.log(`  AI messages count after release: ${countResumed}`);

  if (countResumed <= countAfter) {
    throw new Error('FAILED: Bot did not resume after releasing takeover!');
  }
  console.log('  SUCCESS: Bot successfully resumed auto-replying after release!');

  // Cleanup test records
  await client.query('DELETE FROM wa_message WHERE recipient_phone=$1 OR sender_phone=$1', [testPhone]);
  await client.query('DELETE FROM wa_conversation WHERE customer_phone=$1', [testPhone]);
  await client.query('DELETE FROM lead WHERE phone=$1', [testPhone]);
  await client.query('DELETE FROM processed_messages WHERE sender_phone=$1', [testPhone]);
  console.log('  Test records cleaned up.');
  await client.end();

  console.log('\n🎉 ALL TESTS PASSED FOR BUG-WA-002!');
}

testTakeoverFlow().catch(err => {
  console.error('💥 TEST FAILED:', err.message);
  process.exit(1);
});
