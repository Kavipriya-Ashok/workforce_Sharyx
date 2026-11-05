const http = require('http');
const jwt = require('jsonwebtoken');
const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

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

async function main() {
  const secret = process.env.TOKEN_SECRET;
  console.log('=== MODULE 1: DEEP SECURITY & ISOLATION AUDIT ===');
  console.log('JWT Secret configured:', !!secret);

  const tenantA_id = '646b4abe-e6de-401b-ba33-46884bf3f6e6'; // Sharyx Enterprise Inc
  const tenantB_id = '2cc6ac94-ffb7-4239-85eb-eddc852ab61a'; // ZOHO

  // Generate valid signed token for Tenant A
  const tokenA = jwt.sign({
    user_id: 'a1111111-1111-1111-1111-111111111111',
    email: 'tenant_a_user@sharyx.com',
    company_id: tenantA_id,
    tenant_id: tenantA_id,
    user_role_name: 'Admin',
    is_super_admin: false
  }, secret, { expiresIn: '7d' });

  // Generate valid signed token for Tenant B
  const tokenB = jwt.sign({
    user_id: 'b2222222-2222-2222-2222-222222222222',
    email: 'tenant_b_user@zoho.com',
    company_id: tenantB_id,
    tenant_id: tenantB_id,
    user_role_name: 'Admin',
    is_super_admin: false
  }, secret, { expiresIn: '7d' });

  // 1. Tenant A reads own company
  const resOwnA = await request({
    path: '/api/v1/Company/Get',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${tokenA}` }
  });
  console.log('\n[TEST 1] Tenant A reads /Company/Get:');
  console.log(`Status: ${resOwnA.status}, Company: ${resOwnA.body?.name} (ID: ${resOwnA.body?.id})`);

  // 2. Tenant B reads own company
  const resOwnB = await request({
    path: '/api/v1/Company/Get',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${tokenB}` }
  });
  console.log('\n[TEST 2] Tenant B reads /Company/Get:');
  console.log(`Status: ${resOwnB.status}, Company: ${resOwnB.body?.name} (ID: ${resOwnB.body?.id})`);

  // 3. IDOR Attack: Tenant A attempts to read Tenant B's data by sending x-tenant-id: tenantB_id
  const resSpoofHeader = await request({
    path: '/api/v1/Company/Get',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${tokenA}`,
      'x-tenant-id': tenantB_id
    }
  });
  console.log('\n[TEST 3] IDOR Attack - Tenant A sends header x-tenant-id=<Tenant B>:');
  console.log(`Status: ${resSpoofHeader.status}, Returned Company ID: ${resSpoofHeader.body?.id}`);
  const headerSpoofBlocked = resSpoofHeader.body?.id === tenantA_id;
  console.log(`Header Spoof Blocked (forced to Tenant A): ${headerSpoofBlocked ? 'YES (PASS)' : 'NO (FAIL - LEAKED)'}`);

  // 4. IDOR Attack: Tenant A sends query ?tenantId=<Tenant B>
  const resSpoofQuery = await request({
    path: `/api/v1/Company/Get?tenantId=${tenantB_id}`,
    method: 'GET',
    headers: { 'Authorization': `Bearer ${tokenA}` }
  });
  console.log('\n[TEST 4] IDOR Attack - Tenant A sends query ?tenantId=<Tenant B>:');
  console.log(`Status: ${resSpoofQuery.status}, Returned Company ID: ${resSpoofQuery.body?.id}`);
  const querySpoofBlocked = resSpoofQuery.body?.id === tenantA_id;
  console.log(`Query Spoof Blocked (forced to Tenant A): ${querySpoofBlocked ? 'YES (PASS)' : 'NO (FAIL - LEAKED)'}`);

  // 5. Tenant A attempts to update Tenant B's company
  const resSpoofUpdate = await request({
    path: '/api/v1/Company/Update',
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${tokenA}`,
      'x-tenant-id': tenantB_id
    }
  }, {
    id: tenantB_id,
    tenant_id: tenantB_id,
    name: 'Hacked By Tenant A'
  });
  console.log('\n[TEST 5] Mutation Attack - Tenant A tries to update Tenant B name:');
  console.log(`Status: ${resSpoofUpdate.status}, Result:`, resSpoofUpdate.body);

  // Check DB to verify Tenant B was NOT changed
  const client = new Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
  });
  await client.connect();
  const checkB = await client.query('SELECT id, name FROM company WHERE id = $1', [tenantB_id]);
  console.log('Tenant B name in DB after attack:', checkB.rows[0]?.name, `(Untouched: ${checkB.rows[0]?.name === 'ZOHO'})`);

  // 6. Token Tampering: Change tenant_id to Tenant B inside token and sign with wrong secret
  const fakeSecretToken = jwt.sign({
    user_id: 'attacker',
    email: 'hacker@darkweb.com',
    company_id: tenantB_id,
    tenant_id: tenantB_id,
    user_role_name: 'Admin',
    is_super_admin: false
  }, 'wrong_attacker_secret_12345', { expiresIn: '7d' });

  const resWrongSecret = await request({
    path: '/api/v1/Company/Get',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${fakeSecretToken}` }
  });
  console.log('\n[TEST 6] Token signed with unauthorized secret key:');
  console.log(`Status: ${resWrongSecret.status} (Expected: 401) -> ${resWrongSecret.status === 401 ? 'PASS' : 'FAIL'}`);

  // 7. Expired Token
  const expiredToken = jwt.sign({
    user_id: 'a1111111-1111-1111-1111-111111111111',
    email: 'tenant_a_user@sharyx.com',
    company_id: tenantA_id,
    tenant_id: tenantA_id
  }, secret, { expiresIn: '-1s' }); // expired 1 sec ago

  const resExpired = await request({
    path: '/api/v1/Company/Get',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${expiredToken}` }
  });
  console.log('\n[TEST 7] Expired Token:');
  console.log(`Status: ${resExpired.status} (Expected: 401) -> ${resExpired.status === 401 ? 'PASS' : 'FAIL'}`);

  // 8. Super Admin Impersonation
  const superToken = jwt.sign({
    user_id: 'super-admin-uuid',
    email: 'super@sharyx.com',
    company_id: tenantA_id,
    tenant_id: tenantA_id,
    user_role_name: 'Super Admin',
    is_super_admin: true
  }, secret, { expiresIn: '7d' });

  const resSuperImpersonateB = await request({
    path: '/api/v1/Company/Get',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${superToken}`,
      'x-tenant-id': tenantB_id
    }
  });
  console.log('\n[TEST 8] Super Admin impersonates Tenant B via x-tenant-id:');
  console.log(`Status: ${resSuperImpersonateB.status}, Returned Company: ${resSuperImpersonateB.body?.name} (ID: ${resSuperImpersonateB.body?.id})`);

  // 9. Super Admin calls /Company/List (should see ALL companies)
  const resSuperList = await request({
    path: '/api/v1/Company/List',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${superToken}` }
  });
  console.log('\n[TEST 9] Super Admin calls /Company/List:');
  console.log(`Status: ${resSuperList.status}, Companies count visible: ${Array.isArray(resSuperList.body) ? resSuperList.body.length : (resSuperList.body?.data || []).length}`);

  // 10. Normal Tenant A calls /Company/List (must see ONLY their own company)
  const resNormalList = await request({
    path: '/api/v1/Company/List',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${tokenA}` }
  });
  console.log('\n[TEST 10] Normal Tenant A calls /Company/List:');
  const normalListItems = Array.isArray(resNormalList.body) ? resNormalList.body : (resNormalList.body?.data || []);
  console.log(`Status: ${resNormalList.status}, Companies count visible: ${normalListItems.length}`);
  const normalOnlySeesSelf = normalListItems.length === 1 && normalListItems[0]?.id === tenantA_id;
  console.log(`Normal user restricted to only own company: ${normalOnlySeesSelf ? 'YES (PASS)' : 'NO (FAIL - LEAKED OTHERS)'}`);

  await client.end();
}

main().catch(console.error);

