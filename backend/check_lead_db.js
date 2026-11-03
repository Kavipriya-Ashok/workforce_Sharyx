const { Client } = require('pg');

async function check() {
  const client = new Client({
    host: '158.220.99.156',
    port: 5432,
    user: 'myuser',
    password: 'Login@123!',
    database: 'assistant_sharyx',
  });
  await client.connect();

  console.log('=== LEADS with email or name ===');
  const leads = await client.query(`
    SELECT id, name, email, phone, tenant_id, lead_status, preferred_interview_slot, interview_link, created_on, updated_on 
    FROM lead 
    WHERE email ILIKE '%kavipriya%' OR email ILIKE '%sharyx%' OR name ILIKE '%Abishek%' OR name ILIKE '%kavi%'
    ORDER BY updated_on DESC
  `);
  console.table(leads.rows);

  console.log('=== EMAIL LOGS ===');
  const logs = await client.query(`
    SELECT id, lead_id, from_email, to_email, subject, direction, delivery_status, body_text, created_on 
    FROM email_log 
    WHERE from_email ILIKE '%kavipriya%' OR to_email ILIKE '%kavipriya%' 
    ORDER BY created_on DESC 
    LIMIT 10
  `);
  for (const r of logs.rows) {
    console.log('---');
    console.log('ID:', r.id, '| LeadID:', r.lead_id);
    console.log('From:', r.from_email, '-> To:', r.to_email);
    console.log('Subject:', r.subject);
    console.log('Direction:', r.direction, '| Status:', r.delivery_status);
    console.log('Body:', r.body_text?.slice(0, 150));
    console.log('Date:', r.created_on);
  }

  await client.end();
}

check().catch(console.error);

