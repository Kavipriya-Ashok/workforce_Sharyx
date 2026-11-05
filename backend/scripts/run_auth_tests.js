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

async function getDbClient() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASS || 'postgres',
    database: process.env.DB_NAME || 'ai_workforce'
  });
  await client.connect();
  return client;
}

async function run() {
  console.log('=== MODULE 1: COMPREHENSIVE TEST SUITE ===');
  const db = await getDbClient();
  const testResults = [];

  function record(id, scenario, expected, actual, result, notes = '') {
    testResults.push({ id, scenario, expected, actual, result, notes });
    console.log(`[${result}] ${id}: ${scenario} -> ${actual}`);
  }

  // --- A. SIGN UP TESTS ---
  const ts = Date.now();
  const emailA = `tenant_a_${ts}@test.com`;
  const emailB = `tenant_b_${ts}@test.com`;

  // A1. Valid signup flow: SendSignupOtp -> VerifySignupOtp
  let res = await request({ path: '/api/v1/Auth/SendSignupOtp', method: 'POST' }, { email: emailA, name: 'Tenant A Admin' });
  const debugOtpA = res.body?.result?.debugOtp;
  record('A1-otp', 'SendSignupOtp for valid email', 'HTTP 200 or 201 with success message', `HTTP ${res.status} msg=${res.body?.Message || res.body?.message}`, res.status === 200 || res.status === 201 ? 'Pass' : 'Fail');

  // Let's see if debugOtp is returned (it's non-prod so debugOtp is present if Ethereal preview is generated, or check in-memory)
  let otpToUse = debugOtpA;
  if (!otpToUse) {
    // If debugOtp is not exposed, let's check how Auth.service sends it
    console.log('Notice: debugOtp not returned in response (AUTH_EXPOSE_DEBUG_OTP not true or real SMTP configured). Body:', res.body);
  }

  // A3. Invalid inputs on SendSignupOtp
  let resDup = await request({ path: '/api/v1/Auth/SendSignupOtp', method: 'POST' }, { email: 'bad-email-format' });
  record('A3-email-fmt', 'Bad email format on SendSignupOtp', 'HTTP 400', `HTTP ${resDup.status}`, resDup.status === 400 ? 'Pass' : 'Fail');

  let resEmpty = await request({ path: '/api/v1/Auth/SendSignupOtp', method: 'POST' }, { email: '' });
  record('A3-empty-email', 'Empty email on SendSignupOtp', 'HTTP 400', `HTTP ${resEmpty.status}`, resEmpty.status === 400 ? 'Pass' : 'Fail');

  let res5000 = await request({ path: '/api/v1/Auth/SendSignupOtp', method: 'POST' }, { email: 'a'.repeat(5000) + '@test.com' });
  record('A3-5000-char', '5000-character email on SendSignupOtp', 'HTTP 400', `HTTP ${res5000.status}`, res5000.status >= 400 ? 'Pass' : 'Fail');

  let resSql = await request({ path: '/api/v1/Auth/SendSignupOtp', method: 'POST' }, { email: "admin' OR 1=1;--@test.com" });
  record('A3-sql-inj', 'SQL injection string in email', 'HTTP 400 or rejected safely', `HTTP ${resSql.status}`, resSql.status >= 400 ? 'Pass' : 'Fail');

  // A4. Verify with wrong OTP
  let resWrongOtp = await request({ path: '/api/v1/Auth/VerifySignupOtp', method: 'POST' }, {
    email: emailA,
    otp: '000000',
    password: 'Password123!',
    company_name: 'Alpha Corp'
  });
  record('A4-wrong-otp', 'Wrong OTP submitted to VerifySignupOtp', 'HTTP 400', `HTTP ${resWrongOtp.status} msg=${resWrongOtp.body?.message || resWrongOtp.body?.Message}`, resWrongOtp.status === 400 ? 'Pass' : 'Fail');

  // A3. Short password (<8 characters)
  let resShortPass = await request({ path: '/api/v1/Auth/VerifySignupOtp', method: 'POST' }, {
    email: emailA,
    otp: '123456',
    password: 'short',
    company_name: 'Alpha Corp'
  });
  record('A3-short-pass', 'Password < 8 chars on VerifySignupOtp', 'HTTP 400', `HTTP ${resShortPass.status} msg=${resShortPass.body?.message || resShortPass.body?.Message}`, resShortPass.status === 400 ? 'Pass' : 'Fail');

  // A4-cooldown: Test OTP resend rate limiting (cooldown)
  let resResendFast = await request({ path: '/api/v1/Auth/ResendSignupOtp', method: 'POST' }, { email: emailA });
  record('A4-cooldown', 'Fast OTP resend within 30s cooldown', 'HTTP 429 Too Many Requests', `HTTP ${resResendFast.status} msg=${resResendFast.body?.message || resResendFast.body?.Message}`, resResendFast.status === 429 ? 'Pass' : 'Fail');

  // --- B. LOGIN TESTS ---
  // B2. Brute force lockout test on Login
  const targetEmail = `brute_victim_${ts}@test.com`;
  let lockoutHit = false;
  let statusCodes = [];
  for (let i = 1; i <= 6; i++) {
    let r = await request({ path: '/api/v1/Auth/Login', method: 'POST' }, { email: targetEmail, password: 'WrongPassword' + i });
    statusCodes.push(r.status);
    if (r.status === 429) {
      lockoutHit = true;
    }
  }
  record('B2-lockout', 'Lockout after 5 consecutive failed logins', 'HTTP 429 on 6th attempt', `Statuses: ${statusCodes.join(', ')} (lockoutHit=${lockoutHit})`, lockoutHit ? 'Pass' : 'Fail');

  // B1. User enumeration check on Login: Does wrong password vs unknown email return the same error?
  let resUnknown = await request({ path: '/api/v1/Auth/Login', method: 'POST' }, { email: `totally_unknown_${ts}@test.com`, password: 'SomePassword123!' });
  record('B1-user-enum', 'Unknown email error message vs wrong password', 'Generic "Invalid email or password"', `Status: ${resUnknown.status}, msg: ${resUnknown.body?.message || resUnknown.body?.Message}`, (resUnknown.body?.message || '').includes('Invalid email or password') ? 'Pass' : 'Fail');

  // B3. Token tampering test
  let resTampered = await request({
    path: '/api/v1/Company/Get',
    method: 'GET',
    headers: { 'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImhhY2tlckB0ZXN0LmNvbSIsInRlbmFudF9pZCI6IjAwMDAwMDAwLTAwMDAtMDAwMC0wMDAwLTAwMDAwMDAwMDAwMCJ9.invalid_signature' }
  });
  record('B3-tamper', 'Tampered token with invalid signature', 'HTTP 401 Unauthorized', `HTTP ${resTampered.status}`, resTampered.status === 401 ? 'Pass' : 'Fail');

  // B3. No token test on protected route
  let resNoToken = await request({ path: '/api/v1/Company/Get', method: 'GET' });
  record('B3-no-token', 'Missing token on protected route /Company/Get', 'HTTP 401 Unauthorized', `HTTP ${resNoToken.status}`, resNoToken.status === 401 ? 'Pass' : 'Fail');

  // --- C. GOOGLE LOGIN TESTS ---
  // C1. Empty or caller-supplied fake email without Google code or credential
  let resFakeGoogle = await request({ path: '/api/v1/Auth/GoogleAuth', method: 'POST' }, { email: 'fakeadmin@google.com', name: 'Fake Admin' });
  record('C1-forged-google', 'Fake Google payload with only caller-supplied email', 'HTTP 400 (rejected)', `HTTP ${resFakeGoogle.status} msg=${resFakeGoogle.body?.message || resFakeGoogle.body?.Message}`, resFakeGoogle.status === 400 ? 'Pass' : 'Fail');

  // C2. Forged invalid Google token
  let resInvalidGoogleToken = await request({ path: '/api/v1/Auth/GoogleAuth', method: 'POST' }, { credential: 'forged.google.jwt.token' });
  record('C2-forged-token', 'Forged Google ID token', 'HTTP 401 (signature rejected)', `HTTP ${resInvalidGoogleToken.status}`, resInvalidGoogleToken.status === 401 ? 'Pass' : 'Fail');

  // --- D. FORGOT / RESET PASSWORD TESTS ---
  let resForgotUnknown = await request({ path: '/api/v1/Auth/ForgotPassword', method: 'POST' }, { email: `ghost_${ts}@example.com` });
  record('D1-forgot-enum', 'ForgotPassword response for unregistered email', 'Same success message (no user enumeration)', `HTTP ${resForgotUnknown.status} msg=${resForgotUnknown.body?.Message || resForgotUnknown.body?.message}`, (resForgotUnknown.body?.Message || '').includes('accepted') || (resForgotUnknown.body?.message || '').includes('accepted') ? 'Pass' : 'Fail');

  // D2. ResetPassword with invalid user_id
  let resResetInvalid = await request({ path: '/api/v1/Auth/ResetPassword', method: 'POST' }, {
    user_id: 'invalid-encrypted-id',
    reset_otp: '123456',
    password: 'NewPassword123!'
  });
  record('D2-reset-invalid-id', 'ResetPassword with malformed encrypted user_id', 'HTTP 400 Invalid or expired reset link', `HTTP ${resResetInvalid.status} msg=${resResetInvalid.body?.message || resResetInvalid.body?.Message}`, resResetInvalid.status === 400 ? 'Pass' : 'Fail');

  // Check DB user and password hashing algorithm
  const users = await db.query('SELECT id, email, password FROM "user" LIMIT 5');
  console.log('\n--- Sample DB Users Password Format ---');
  users.rows.forEach(u => {
    const isScrypt = u.password && u.password.startsWith('scrypt$');
    console.log(`User ${u.email}: isScrypt=${isScrypt}, hashPreview=${(u.password || '').substring(0, 15)}...`);
  });

  await db.end();
  console.log('\n=== TEST SUITE COMPLETED ===');
  console.log(`Total tests executed: ${testResults.length}`);
}

run().catch(console.error);

