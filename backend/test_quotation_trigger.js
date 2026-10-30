const axios = require('axios');
const { Client } = require('pg');

async function testTrigger() {
  console.log('🧪 Starting End-to-End Quotation Trigger Test...');

  const client = new Client({
    host: '158.220.99.156',
    port: 5432,
    user: 'myuser',
    password: 'Login@123!',
    database: 'assistant_sharyx'
  });
  await client.connect();

  // 1. Verify Campaigns exist in DB
  const waCamp = await client.query("SELECT id, name, trigger_event, outcome_filter, is_active FROM wa_campaign WHERE outcome_filter='Quotation Requested';");
  console.log('✅ WhatsApp Quotation Campaign in DB:', waCamp.rows);

  const emCamp = await client.query("SELECT id, campaign_name, trigger_event, outcome_filter, is_active FROM email_campaign WHERE outcome_filter='Quotation Requested';");
  console.log('✅ Email Quotation Campaign in DB:', emCamp.rows);

  // 2. Simulate Vapi Webhook payload where caller asks for quotation
  const mockVapiPayload = {
    message: {
      type: "end-of-call-report",
      call: {
        id: "vapi_test_quote_" + Date.now(),
        status: "ended",
        endedReason: "customer-ended-call",
        customer: {
          number: "+918015779116",
          name: "Kavya Priya"
        },
        analysis: {
          summary: "The customer asked for a quotation for the Sharyx AI workforce package and requested pricing details.",
          structuredData: {
            outcome: "Quotation Requested",
            deal_value: 25000,
            currency: "INR"
          }
        },
        artifact: {
          transcript: "Agent: Welcome to Sharyx! How can I help?\nUser: Can you please send me a quotation for your workforce AI package?\nAgent: Absolutely, I will dispatch the quotation and proposal to your WhatsApp right now!"
        }
      }
    }
  };

  console.log('📡 Sending simulated Vapi webhook with Quotation request to local backend: http://localhost:8000/api/v1/Voice/Webhook/vapi ...');
  try {
    const res = await axios.post('http://localhost:8000/api/v1/Voice/Webhook/vapi', mockVapiPayload);
    console.log('✅ Webhook Response:', res.data);
  } catch (err) {
    console.log('ℹ️ Webhook HTTP error (checking if port 8000 is open):', err.message);
  }

  // 3. Query voice_call_log to check outcome saved
  const callLog = await client.query("SELECT id, customer_phone, call_outcome, summary FROM voice_call_log WHERE call_outcome='Quotation Requested' ORDER BY created_on DESC LIMIT 1;");
  if (callLog.rows.length > 0) {
    console.log('🎉 Voice Call Log Saved with Quotation Outcome:', callLog.rows[0]);
  } else {
    console.log('ℹ️ Checking latest voice call log:');
    const latest = await client.query("SELECT id, customer_phone, call_outcome, summary FROM voice_call_log ORDER BY created_on DESC LIMIT 1;");
    console.log(latest.rows);
  }

  await client.end();
  console.log('🏁 Test completed.');
}

testTrigger().catch(console.error);

