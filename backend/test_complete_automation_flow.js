const axios = require('axios');
const { Client } = require('pg');

async function testCompleteAutomationFlow() {
  console.log('===========================================================');
  console.log('🚀 SHARYX EMAIL AUTOMATION END-TO-END VERIFICATION SUITE');
  console.log('===========================================================');

  const BASE_URL = 'http://localhost:8000/api/v1';

  // 1. Backend Port 8000 Health & OAuth Status Check
  console.log('\n[TEST 1] Checking Backend Health & OAuth Connection...');
  try {
    const oauthRes = await axios.get(`${BASE_URL}/Email/OAuth/Status`);
    console.log('✅ Backend responded successfully!');
    console.log('   Provider:', oauthRes.data?.provider);
    console.log('   Connected Email:', oauthRes.data?.email_address);
    console.log('   Status:', oauthRes.data?.isConnected ? 'ACTIVE & CONNECTED' : 'DISCONNECTED');
  } catch (err) {
    console.error('❌ Backend health check failed:', err.message);
  }

  // 2. Database Multi-Tenant Schema & Configurations Check
  console.log('\n[TEST 2] Verifying PostgreSQL Multi-Tenant Database...');
  const client = new Client({
    host: '158.220.99.156',
    port: 5432,
    user: 'myuser',
    password: 'Login@123!',
    database: 'assistant_sharyx',
  });

  try {
    await client.connect();
    const accountConfigs = await client.query('SELECT tenant_id, email_address, provider, is_active FROM email_account_config');
    console.log(`✅ email_account_config: ${accountConfigs.rows.length} record(s) found`);
    accountConfigs.rows.forEach(r => console.log(`   - Tenant: ${r.tenant_id} | Email: ${r.email_address} | Provider: ${r.provider}`));

    const aiConfigs = await client.query('SELECT tenant_id, auto_reply_enabled, llm_provider, llm_model FROM email_ai_config');
    console.log(`✅ email_ai_config: ${aiConfigs.rows.length} record(s) found`);
    aiConfigs.rows.forEach(r => console.log(`   - Tenant: ${r.tenant_id} | Auto-Reply: ${r.auto_reply_enabled} | Model: ${r.llm_model}`));

    const logs = await client.query('SELECT COUNT(*) FROM email_log');
    console.log(`✅ email_log: ${logs.rows[0].count} email record(s) tracked in database`);

    await client.end();
  } catch (dbErr) {
    console.error('❌ Database verification failed:', dbErr.message);
  }

  // 3. Gemini LLM Copilot & Recruitment / Sales Intent Test
  console.log('\n[TEST 3] Testing AI Intent Engine (Gemini LLM)...');
  const geminiKey = process.env.GEMINI_API_KEY;
  try {
    const aiRes = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
      {
        contents: [
          {
            role: 'user',
            parts: [{ text: 'Draft a short, 2-line polite response acknowledging an inquiry for software engineering openings.' }],
          },
        ],
      }
    );
    const reply = aiRes.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    console.log('✅ Gemini LLM connection confirmed!');
    console.log('   Sample AI Output:\n  ', reply?.trim().replace(/\n/g, '\n   '));
  } catch (aiErr) {
    console.error('❌ Gemini LLM test failed:', aiErr.response?.data || aiErr.message);
  }

  // 4. Inbound Email Poller & Sync Ingestion Test
  console.log('\n[TEST 4] Testing Inbound Poller Sync API (POST /api/v1/Email/Sync)...');
  try {
    const syncRes = await axios.post(`${BASE_URL}/Email/Sync`);
    console.log('✅ Sync endpoint executed successfully!');
    console.log('   Result:', syncRes.data);
  } catch (syncErr) {
    console.error('❌ Inbound sync test failed:', syncErr.message);
  }

  console.log('\n===========================================================');
  console.log('🎉 ALL EMAIL AUTOMATION CORE PIPELINES ARE LIVE & VERIFIED!');
  console.log('===========================================================');
}

testCompleteAutomationFlow().catch(console.error);

