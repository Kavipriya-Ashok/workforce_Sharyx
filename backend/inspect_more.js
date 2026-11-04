const { Client } = require('pg');

async function inspectMore() {
  const c = new Client({
    host: '158.220.99.156',
    port: 5432,
    user: 'myuser',
    password: 'Login@123!',
    database: 'assistant_sharyx'
  });
  await c.connect();

  console.log('=== customer_identity_mapping ===');
  const cols = await c.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'customer_identity_mapping'");
  console.log('Columns:', cols.rows);
  const rows = await c.query("SELECT * FROM customer_identity_mapping LIMIT 5");
  console.log('Sample rows:', rows.rows);

  console.log('\n=== meetings inspection ===');
  // Check if any meetings exist in wa_conversation or communications or other tables
  const waMeetings = await c.query("SELECT id, customer_phone, meeting_info FROM wa_conversation WHERE meeting_info IS NOT NULL LIMIT 5");
  console.log('wa_conversation with meeting_info:', waMeetings.rows);

  const commMeetings = await c.query("SELECT id, channel, description, occurred_at FROM communications WHERE channel IN ('meeting', 'interview') LIMIT 5");
  console.log('communications meetings/interviews:', commMeetings.rows);

  const omniEvents = await c.query("SELECT event_type, COUNT(*) FROM omnichannel_event GROUP BY event_type");
  console.log('omnichannel_event types:', omniEvents.rows);

  console.log('\n=== interviews inspection in lead table ===');
  const leadInterviews = await c.query("SELECT id, name, phone, email, candidate_stage, interview_date, interview_link FROM lead WHERE interview_date IS NOT NULL OR interview_link IS NOT NULL OR candidate_stage IS NOT NULL LIMIT 5");
  console.log('lead table with interview info:', leadInterviews.rows);

  console.log('\n=== foreign keys for lead, customer, communications, wa_conversation, email_log, voice_call_log ===');
  const fks = await c.query(`
    SELECT
      tc.table_name, kcu.column_name, ccu.table_name AS foreign_table_name, ccu.column_name AS foreign_column_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name IN ('lead', 'customer', 'communications', 'wa_conversation', 'wa_message', 'email_log', 'voice_call_log', 'omnichannel_event', 'customer_identity_mapping')
  `);
  console.log('Foreign keys:', fks.rows);

  await c.end();
}

inspectMore().catch(console.error);

async function checkInterviews() {
  const c = new Client({
    host: '158.220.99.156',
    port: 5432,
    user: 'myuser',
    password: 'Login@123!',
    database: 'assistant_sharyx'
  });
  await c.connect();
  const r = await c.query("SELECT id, name, phone, email, lead_status, candidate_stage, interview_date, interview_link FROM lead WHERE interview_date IS NOT NULL OR candidate_stage = 'interview_scheduled' OR lead_status ILIKE '%INTERVIEW%'");
  console.log('=== LEADS WITH INTERVIEWS ===', r.rows);
  await c.end();
}
checkInterviews().catch(console.error);
