const http = require('http');
const { Client } = require('pg');
require('dotenv').config({ path: 'backend/.env' });

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

async function runDetailedTests() {
  const db = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASS || 'postgres',
    database: process.env.DB_NAME || 'ai_workforce'
  });
  await db.connect();

  console.log('--- Checking existing users & companies ---');
  const existingUsers = await db.query('SELECT u.id, u.email, u.company_id, c.name as company_name FROM "user" u LEFT JOIN company c ON u.company_id = c.id LIMIT 5');
  console.log('Users found:', existingUsers.rows);

  // If there are existing users, let's test login with real credentials if known, or inspect passwords
  const usersWithHash = await db.query('SELECT id, email, password FROM "user" LIMIT 3');
  console.log('Hashes:', usersWithHash.rows.map(r => ({ email: r.email, hash: (r.password || '').substring(0, 20) })));

  // Test 50 fast login requests (Rate limit check)
  console.log('\n--- Testing 50 Fast Login Requests ---');
  let rateLimitHit = 0;
  let errorCount = 0;
  const promises = [];
  for (let i = 0; i < 50; i++) {
    promises.push(request({ path: '/api/v1/Auth/Login', method: 'POST' }, {
      email: `spam_user_${i}@example.com`,
      password: 'SomePassword123!'
    }).then(r => {
      if (r.status === 429) rateLimitHit++;
      else if (r.status >= 400) errorCount++;
    }));
  }
  await Promise.all(promises);
  console.log(`Results of 50 fast requests: 429 Too Many Requests: ${rateLimitHit}, 400/401 Client Errors: ${errorCount}`);

  // Test IDOR: Tenant isolation via headers and parameters
  // Let's create two mock JWT payloads signed with TOKEN_SECRET
  const jwt = require('../node_modules/jsonwebtoken');
  const secret = process.env.TOKEN_SECRET;

  if (secret && existingUsers.rows.length >= 1) {
    const u1 = existingUsers.rows[0];
    const token1 = jwt.sign({
      user_id: u1.id,
      email: u1.email,
      company_id: u1.company_id,
      tenant_id: u1.company_id,
      user_role_name: 'Admin',
      is_super_admin: false
    }, secret, { expiresIn: '1h' });

    console.log('\n--- Testing Token Claims & Expiry ---');
    const decoded = jwt.decode(token1);
    console.log('Token Decoded Claims:', decoded);
    console.log('Contains password? ', 'password' in decoded);
    console.log('Contains secret? ', 'secret' in decoded);

    // Test calling /Company/Get with Token 1
    const resOwnCompany = await request({
      path: '/api/v1/Company/Get',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token1}` }
    });
    console.log('Own Company fetch status:', resOwnCompany.status, 'Company ID returned:', resOwnCompany.body?.id || resOwnCompany.body?.result?.id);

    // Test Spoofing: Send header x-tenant-id with another ID
    const fakeTenantId = '11111111-2222-3333-4444-555555555555';
    const resSpoofHeader = await request({
      path: '/api/v1/Company/Get',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token1}`,
        'x-tenant-id': fakeTenantId
      }
    });
    console.log('Spoofed x-tenant-id header result: ID returned is:', resSpoofHeader.body?.id || resSpoofHeader.body?.result?.id, '(Did it change to fake ID? ', (resSpoofHeader.body?.id || resSpoofHeader.body?.result?.id) === fakeTenantId, ')');

    // Test Spoofing: Send query ?tenantId=
    const resSpoofQuery = await request({
      path: `/api/v1/Company/Get?tenantId=${fakeTenantId}`,
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token1}` }
    });
    console.log('Spoofed ?tenantId query result: ID returned is:', resSpoofQuery.body?.id || resSpoofQuery.body?.result?.id);
  }

  await db.end();
}

runDetailedTests().catch(console.error);
