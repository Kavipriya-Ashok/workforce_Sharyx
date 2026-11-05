const http = require('http');
const jwt = require('jsonwebtoken');
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
  console.log('=== MODULE 2: ONBOARDING, STATUS & PROFILE AUDIT ===');
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

  // T1: Unauthenticated GET /Onboarding/State
  const r1 = await request({ path: '/api/v1/Onboarding/State', method: 'GET' });
  tests.push({ id: 'M2-01', name: 'Unauth GET /Onboarding/State -> 401', pass: r1.status === 401, status: r1.status });

  // T2: Tenant A GET /Onboarding/State
  const r2 = await request({ path: '/api/v1/Onboarding/State', method: 'GET', headers: { Authorization: `Bearer ${tokenA}` } });
  const compA = r2.body?.company?.id;
  tests.push({ id: 'M2-02', name: 'Tenant A State loads correct company', pass: compA === tenantA_id, actual: compA });

  // T3: Tenant B GET /Onboarding/State
  const r3 = await request({ path: '/api/v1/Onboarding/State', method: 'GET', headers: { Authorization: `Bearer ${tokenB}` } });
  const compB = r3.body?.company?.id;
  tests.push({ id: 'M2-03', name: 'Tenant B State loads correct company', pass: compB === tenantB_id, actual: compB });

  // T4: IDOR header spoof on /Onboarding/State
  const r4 = await request({
    path: '/api/v1/Onboarding/State',
    method: 'GET',
    headers: { Authorization: `Bearer ${tokenA}`, 'x-tenant-id': tenantB_id }
  });
  const compSpoof = r4.body?.company?.id;
  tests.push({ id: 'M2-04', name: 'IDOR x-tenant-id spoof blocked on /Onboarding/State', pass: compSpoof === tenantA_id, actual: compSpoof });

  // T5: PUT /Onboarding/Step with invalid step number (0)
  const r5 = await request({
    path: '/api/v1/Onboarding/Step',
    method: 'PUT',
    headers: { Authorization: `Bearer ${tokenA}` }
  }, { step: 0, data: {} });
  tests.push({ id: 'M2-05', name: 'Invalid step 0 rejected with 400', pass: r5.status === 400, status: r5.status, msg: r5.body?.message || r5.body?.Message });

  // T6: PUT /Onboarding/Step with invalid step number (11)
  const r6 = await request({
    path: '/api/v1/Onboarding/Step',
    method: 'PUT',
    headers: { Authorization: `Bearer ${tokenA}` }
  }, { step: 11, data: {} });
  tests.push({ id: 'M2-06', name: 'Invalid step 11 rejected with 400', pass: r6.status === 400, status: r6.status });

  // T7: PUT /Onboarding/Step with non-numeric step ("abc")
  const r7 = await request({
    path: '/api/v1/Onboarding/Step',
    method: 'PUT',
    headers: { Authorization: `Bearer ${tokenA}` }
  }, { step: 'abc', data: {} });
  tests.push({ id: 'M2-07', name: 'Non-numeric step string rejected with 400', pass: r7.status === 400, status: r7.status });

  // T8: WhatsApp Config GET for Tenant A
  const r8 = await request({
    path: '/api/v1/WhatsApp/Config',
    method: 'GET',
    headers: { Authorization: `Bearer ${tokenA}` }
  });
  const waA = r8.body?.data || r8.body?.AddtionalData || r8.body;
  const waMasked = waA ? (!waA.access_token && waA.has_access_token !== undefined) : true;
  tests.push({ id: 'M2-08', name: 'WhatsApp Safe Config masks access_token', pass: waMasked, data: waA });

  // T9: Email Config GET for Tenant A (Secret leak check)
  const r9 = await request({
    path: '/api/v1/Email/Config',
    method: 'GET',
    headers: { Authorization: `Bearer ${tokenA}` }
  });
  const emA = r9.body?.data || r9.body?.AddtionalData || r9.body;
  const emHasSecret = emA && (emA.client_secret !== undefined || emA.access_token !== undefined || emA.smtp_password !== undefined);
  tests.push({ id: 'M2-09', name: 'Email Config secret exposure check (FAIL = leaks secrets)', pass: !emHasSecret, leaks: emHasSecret ? { client_secret: !!emA?.client_secret, access_token: !!emA?.access_token, smtp_password: !!emA?.smtp_password } : null });

  // T10: Email OAuth Status GET for Tenant A
  const r10 = await request({
    path: '/api/v1/Email/OAuth/Status',
    method: 'GET',
    headers: { Authorization: `Bearer ${tokenA}` }
  });
  tests.push({ id: 'M2-10', name: 'Email OAuth Status returns status object', pass: r10.status === 200, body: r10.body });

  // T11: WhatsApp TestConnection with empty credentials
  const r11 = await request({
    path: '/api/v1/WhatsApp/Test-Connection',
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` }
  }, { provider: 'meta_cloud', phone_number_id: '', access_token: '' });
  tests.push({ id: 'M2-11', name: 'WhatsApp Test-Connection without creds returns 400', pass: r11.status === 400, status: r11.status });

  // T12: Email TestConnection with invalid SMTP pass
  const r12 = await request({
    path: '/api/v1/Email/Test-Connection',
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` }
  }, { email_address: 'test@domain.com', smtp_host: 'smtp.gmail.com', smtp_port: 587, smtp_password: 'totally_invalid_password_xyz' });
  tests.push({ id: 'M2-12', name: 'Email Test-Connection with bad credentials returns error', pass: r12.status >= 400 || r12.body?.Type === 'E', status: r12.status });

  console.log('\n--- TEST RESULTS ---');
  let passCount = 0;
  let failCount = 0;
  tests.forEach(t => {
    if (t.pass) passCount++; else failCount++;
    console.log(`[${t.pass ? 'PASS' : 'FAIL'}] ${t.id}: ${t.name} (Status: ${t.status || 'OK'})`);
    if (t.leaks) console.log('   LEAKS:', t.leaks);
    if (t.actual) console.log('   Actual:', t.actual);
  });
  console.log(`\nTOTAL: ${tests.length} | PASS: ${passCount} | FAIL: ${failCount}`);
}

run().catch(console.error);
