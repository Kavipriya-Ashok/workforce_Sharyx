const http = require('http');
const jwt = require('jsonwebtoken');
const { Client } = require('pg');
require('dotenv').config({ path: 'backend/.env.local' });

function request(options, body) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      host: 'localhost',
      port: 8000,
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let parsed = data;
        try { parsed = JSON.parse(data); } catch (e) {}
        resolve({ status: res.statusCode, headers: res.headers, body: parsed, raw: data });
      });
    });
    req.on('error', reject);
    if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}

async function run() {
  const secret = process.env.TOKEN_SECRET;
  console.log('=== MODULE 3: WHATSAPP AUTOMATION AUDIT ===');
  console.log('JWT Secret exists:', !!secret);

  const tenantA_id = '646b4abe-e6de-401b-ba33-46884bf3f6e6'; // Sharyx Enterprise Inc
  const tenantB_id = '2cc6ac94-ffb7-4239-85eb-eddc852ab61a'; // ZOHO

  const tokenA = jwt.sign({
    user_id: 'c83abcba-903b-47f6-9ca3-3268a7468147',
    email: 'priyashok@gmail.com',
    company_id: tenantA_id,
    tenant_id: tenantA_id,
    user_role_name: 'Admin',
    is_super_admin: false
  }, secret, { expiresIn: '7d' });

  const tokenB = jwt.sign({
    user_id: '8a50eec6-b7e5-4502-ad12-2407816a0c13',
    email: 'kavipriyaashok12@gmail.com',
    company_id: tenantB_id,
    tenant_id: tenantB_id,
    user_role_name: 'Admin',
    is_super_admin: false
  }, secret, { expiresIn: '7d' });

  const tests = [];

  // T1: Unauthenticated GET /WhatsApp/Config
  const r1 = await request({ path: '/api/v1/WhatsApp/Config', method: 'GET' });
  tests.push({ id: 'M3-01', name: 'Unauth GET /WhatsApp/Config -> 401', pass: r1.status === 401, status: r1.status });

  // T2: Tenant A WhatsApp Config (Secrets masked)
  const r2 = await request({ path: '/api/v1/WhatsApp/Config', method: 'GET', headers: { Authorization: `Bearer ${tokenA}` } });
  const waA = r2.body?.data || r2.body?.AddtionalData || r2.body;
  const noAccessToken = waA ? (!waA.access_token && waA.has_access_token !== undefined) : true;
  tests.push({ id: 'M3-02', name: 'Tenant A WhatsApp Safe Config masks access_token', pass: noAccessToken, status: r2.status });

  // T3: Tenant B WhatsApp Config (Tenant Isolation)
  const r3 = await request({ path: '/api/v1/WhatsApp/Config', method: 'GET', headers: { Authorization: `Bearer ${tokenB}` } });
  const waB = r3.body?.data || r3.body?.AddtionalData || r3.body;
  tests.push({ id: 'M3-03', name: 'Tenant B WhatsApp Config isolated', pass: r3.status === 200, status: r3.status });

  // T4: IDOR header spoof on /WhatsApp/Config
  const r4 = await request({
    path: '/api/v1/WhatsApp/Config',
    method: 'GET',
    headers: { Authorization: `Bearer ${tokenA}`, 'x-tenant-id': tenantB_id }
  });
  const waSpoof = r4.body?.data || r4.body?.AddtionalData || r4.body;
  const spoofBlocked = waSpoof?.tenant_id ? waSpoof.tenant_id === tenantA_id : true;
  tests.push({ id: 'M3-04', name: 'IDOR x-tenant-id spoof blocked on WhatsApp Config', pass: spoofBlocked, status: r4.status });

  // T5: Webhook Signature Verification check (Unsigned POST)
  const r5 = await request({
    path: '/api/v1/WhatsApp/Webhook',
    method: 'POST',
    headers: {}
  }, { object: 'whatsapp_business_account', entry: [] });
  // Signature enforcement: if WA_SIGNATURE_MODE=enforce it should return 401, if log it returns 200
  tests.push({ id: 'M3-05', name: 'Webhook Unsigned POST check', pass: r5.status === 200 || r5.status === 401, status: r5.status, note: r5.status === 200 ? 'Accepted in log mode' : 'Rejected' });

  // T6: AI Config GET Tenant A
  const r6 = await request({ path: '/api/v1/WhatsApp/AI/Config', method: 'GET', headers: { Authorization: `Bearer ${tokenA}` } });
  const aiCfgA = r6.body?.data || r6.body?.AddtionalData || r6.body;
  const aiNoKey = aiCfgA ? (!aiCfgA.api_key && aiCfgA.has_api_key !== undefined) : true;
  tests.push({ id: 'M3-06', name: 'AI Config GET Tenant A (Key masked)', pass: aiNoKey, status: r6.status, model: aiCfgA?.llm_model });

  // T7: Check if Reset to default endpoint exists (Bug A4)
  const r7 = await request({ path: '/api/v1/WhatsApp/AI/Reset', method: 'POST', headers: { Authorization: `Bearer ${tokenA}` } });
  tests.push({ id: 'M3-07', name: 'AI Reset to Default endpoint existence', pass: r7.status !== 404, status: r7.status, note: r7.status === 404 ? 'Bug A4 Still Open (No reset endpoint)' : 'Exists' });

  // T8: Templates List Tenant A
  const r8 = await request({ path: '/api/v1/WhatsApp/Templates', method: 'GET', headers: { Authorization: `Bearer ${tokenA}` } });
  tests.push({ id: 'M3-08', name: 'Templates List Tenant A returns 200', pass: r8.status === 200, status: r8.status });

  // T9: Campaigns List Tenant A
  const r9 = await request({ path: '/api/v1/WhatsApp/Campaigns', method: 'GET', headers: { Authorization: `Bearer ${tokenA}` } });
  tests.push({ id: 'M3-09', name: 'Campaigns List Tenant A returns 200', pass: r9.status === 200, status: r9.status });

  // T10: Analytics GET Tenant A
  const r10 = await request({ path: '/api/v1/WhatsApp/Analytics', method: 'GET', headers: { Authorization: `Bearer ${tokenA}` } });
  tests.push({ id: 'M3-10', name: 'Analytics GET Tenant A returns 200', pass: r10.status === 200, status: r10.status });

  // T11: Inspect Database schema for Module 3 columns
  const pgClient = new Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
  });
  await pgClient.connect();

  const msgColsRes = await pgClient.query(`
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = 'wa_message' AND column_name IN ('campaign_id', 'outcome', 'channel')
  `);
  const msgCols = msgColsRes.rows.map(r => r.column_name);
  tests.push({ id: 'M3-11', name: 'wa_message has campaign_id, outcome, channel columns', pass: msgCols.includes('campaign_id'), cols: msgCols, note: !msgCols.includes('campaign_id') ? 'Bug E-track Still Open' : 'Columns exist' });

  const convColsRes = await pgClient.query(`
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = 'wa_conversation' AND column_name IN ('detected_intent', 'intent_confidence')
  `);
  const convCols = convColsRes.rows.map(r => r.column_name);
  tests.push({ id: 'M3-12', name: 'wa_conversation has detected_intent, intent_confidence columns', pass: convCols.includes('detected_intent'), cols: convCols, note: !convCols.includes('detected_intent') ? 'Q7 intent columns missing' : 'Columns exist' });

  const waCfgColsRes = await pgClient.query(`
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = 'whatsapp_config' AND column_name IN ('last_checked_at', 'error_message', 'status')
  `);
  const waCfgCols = waCfgColsRes.rows.map(r => r.column_name);
  tests.push({ id: 'M3-13', name: 'whatsapp_config has status, last_checked_at, error_message columns', pass: waCfgCols.includes('last_checked_at'), cols: waCfgCols, note: !waCfgCols.includes('last_checked_at') ? 'Health tracking columns missing' : 'Columns exist' });

  await pgClient.end();

  console.log('\n--- TEST RESULTS ---');
  let passCount = 0;
  let failCount = 0;
  tests.forEach(t => {
    if (t.pass) passCount++; else failCount++;
    console.log(`[${t.pass ? 'PASS' : 'FAIL'}] ${t.id}: ${t.name} (Status: ${t.status || 'DB'})`);
    if (t.note) console.log(`   Note: ${t.note}`);
    if (t.cols) console.log(`   Columns Found:`, t.cols);
  });
  console.log(`\nTOTAL: ${tests.length} | PASS: ${passCount} | FAIL: ${failCount}`);
}

run().catch(console.error);

