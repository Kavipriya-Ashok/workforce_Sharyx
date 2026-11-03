const { Client } = require('pg');

async function checkLatestStatus() {
  console.log('================================================================');
  console.log('🔍 SHARYX EMAIL AUTOMATION & CALL DISPATCH - LATEST STATUS');
  console.log('================================================================\n');

  const client = new Client({
    host: '158.220.99.156',
    port: 5432,
    user: 'myuser',
    password: 'Login@123!',
    database: 'assistant_sharyx',
  });
  await client.connect();

  console.log('📬 1. LATEST 3 EMAIL LOGS:');
  const emails = await client.query(`
    SELECT from_email, to_email, subject, direction, delivery_status, body_text, created_on 
    FROM email_log 
    ORDER BY created_on DESC 
    LIMIT 3
  `);
  for (const e of emails.rows) {
    console.log(`   [${e.direction.toUpperCase()} | ${e.delivery_status}] ${e.from_email} -> ${e.to_email}`);
    console.log(`   Subject: ${e.subject}`);
    console.log(`   Time: ${new Date(e.created_on).toLocaleTimeString()}`);
    console.log(`   Preview: ${(e.body_text || '').slice(0, 120).replace(/\n/g, ' ')}\n`);
  }

  console.log('👤 2. LATEST LEAD RECORD:');
  const leads = await client.query(`
    SELECT name, email, phone, lead_status, preferred_interview_slot, interview_link, updated_on 
    FROM lead 
    WHERE email ILIKE '%kavipriya%' 
    ORDER BY COALESCE(updated_on, created_on) DESC 
    LIMIT 1
  `);
  if (leads.rows.length > 0) {
    const l = leads.rows[0];
    console.log(`   Name  : ${l.name}`);
    console.log(`   Email : ${l.email}`);
    console.log(`   Phone : ${l.phone}`);
    console.log(`   Slot  : ${l.preferred_interview_slot}`);
    console.log(`   Meet  : ${l.interview_link}\n`);
  }

  console.log('📞 3. LATEST VOICE CALL DISPATCH ATTEMPT:');
  const calls = await client.query(`
    SELECT agent_name, provider, customer_phone, customer_name, call_status, summary, created_on 
    FROM voice_call_log 
    ORDER BY created_on DESC 
    LIMIT 1
  `);
  if (calls.rows.length > 0) {
    const c = calls.rows[0];
    console.log(`   Agent   : ${c.agent_name} (${c.provider.toUpperCase()})`);
    console.log(`   Dialed  : ${c.customer_phone} (${c.customer_name})`);
    console.log(`   Status  : ${c.call_status.toUpperCase()}`);
    console.log(`   Message : ${c.summary}`);
    console.log(`   Time    : ${new Date(c.created_on).toLocaleTimeString()}`);
  }

  console.log('\n================================================================');
  await client.end();
}

checkLatestStatus().catch(console.error);

