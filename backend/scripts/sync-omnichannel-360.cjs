const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

if (fs.existsSync(path.resolve(__dirname, '../.env.local'))) {
  dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
} else {
  dotenv.config({ path: path.resolve(__dirname, '../.env') });
}

const { Client } = require('pg');

function normalizePhone(phone, defaultCountry = 'IN') {
  if (!phone) return null;
  let cleaned = String(phone).replace(/[^\d+]/g, '');
  if (!cleaned) return null;
  if (cleaned.startsWith('+')) return cleaned;
  if (defaultCountry === 'IN') {
    if (cleaned.length === 10) return '+91' + cleaned;
    if (cleaned.length === 12 && cleaned.startsWith('91')) return '+' + cleaned;
    if (cleaned.length === 11 && cleaned.startsWith('0')) return '+91' + cleaned.substring(1);
  }
  return '+' + cleaned;
}

function normalizeEmail(email) {
  if (!email || typeof email !== 'string') return null;
  const cleaned = email.trim().toLowerCase();
  return cleaned.includes('@') ? cleaned : null;
}

async function runSync() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
  });

  await client.connect();
  console.log('🔗 Connected to DB for Omnichannel 360 Sync...');

  // 1. Populate customer_identity_mapping for all customers
  const customers = await client.query('SELECT id, tenant_id, name, phone, email FROM customer');
  console.log(`Processing ${customers.rows.length} customers for identity resolution...`);

  for (const c of customers.rows) {
    const tenantId = c.tenant_id || 'default';
    if (c.phone) {
      const normPhone = normalizePhone(c.phone);
      if (normPhone) {
        await client.query(`
          INSERT INTO customer_identity_mapping (tenant_id, customer_id, identity_type, identity_value, raw_value, is_primary, is_verified, source)
          VALUES ($1, $2, 'phone', $3, $4, true, true, 'customer_table')
          ON CONFLICT (tenant_id, identity_type, identity_value) 
          DO UPDATE SET customer_id = EXCLUDED.customer_id, updated_on = NOW()
        `, [tenantId, c.id, normPhone, c.phone]);
      }
    }

    if (c.email) {
      const normEmail = normalizeEmail(c.email);
      if (normEmail) {
        await client.query(`
          INSERT INTO customer_identity_mapping (tenant_id, customer_id, identity_type, identity_value, raw_value, is_primary, is_verified, source)
          VALUES ($1, $2, 'email', $3, $4, true, true, 'customer_table')
          ON CONFLICT (tenant_id, identity_type, identity_value) 
          DO UPDATE SET customer_id = EXCLUDED.customer_id, updated_on = NOW()
        `, [tenantId, c.id, normEmail, c.email]);
      }
    }
  }
  console.log('✅ Identity mapping populated for all customers!');

  // Build lookup maps in memory
  const idMapRes = await client.query('SELECT tenant_id, customer_id, identity_type, identity_value FROM customer_identity_mapping');
  const phoneToCustomer = new Map();
  const emailToCustomer = new Map();
  for (const row of idMapRes.rows) {
    if (row.identity_type === 'phone') {
      phoneToCustomer.set(row.identity_value, row.customer_id);
    } else if (row.identity_type === 'email') {
      emailToCustomer.set(row.identity_value, row.customer_id);
    }
  }

  // 2. Sync WhatsApp Messages into omnichannel_event
  console.log('Syncing WhatsApp messages...');
  try {
    const waRows = await client.query(`
      SELECT m.id, m.conversation_id, m.direction, m.message_text, m.message_type, m.delivery_status, m.created_on,
             c.customer_phone, c.customer_name, c.tenant_id
      FROM wa_message m
      JOIN wa_conversation c ON c.id = m.conversation_id
      ORDER BY m.created_on DESC
      LIMIT 200
    `);

    let waSynced = 0;
    for (const r of waRows.rows) {
      const normPhone = normalizePhone(r.customer_phone);
      const customerId = normPhone ? phoneToCustomer.get(normPhone) : null;
      if (!customerId) continue;

      const dir = r.direction === 'outbound' ? 'outbound' : 'inbound';
      const text = String(r.message_text || '');
      const summary = text.length > 120 ? text.substring(0, 117) + '...' : text;

      await client.query(`
        INSERT INTO omnichannel_event (
          tenant_id, customer_id, event_type, direction, source_module, source_record_id,
          event_timestamp, title, description, summary, status, metadata
        ) VALUES (
          $1, $2, 'WHATSAPP', $3, 'whatsapp', $4,
          $5, $6, $7, $8, $9, $10
        )
        ON CONFLICT (tenant_id, source_module, source_record_id)
        DO UPDATE SET description = EXCLUDED.description, summary = EXCLUDED.summary, status = EXCLUDED.status, updated_on = NOW()
      `, [
        r.tenant_id || 'default',
        customerId,
        dir,
        r.id,
        r.created_on || new Date(),
        dir === 'outbound' ? `WhatsApp reply to ${r.customer_name || 'Customer'}` : `WhatsApp message from ${r.customer_name || 'Customer'}`,
        text,
        summary,
        r.delivery_status || 'delivered',
        JSON.stringify({ raw_phone: r.customer_phone, conversation_id: r.conversation_id, message_type: r.message_type })
      ]);
      waSynced++;
    }
    console.log(`✅ Synced ${waSynced} WhatsApp events!`);
  } catch (err) {
    console.warn('WhatsApp sync warning:', err.message);
  }

  // 3. Sync Email Logs into omnichannel_event
  console.log('Syncing Email logs...');
  try {
    const emailRows = await client.query(`
      SELECT id, tenant_id, from_email, to_email, subject, body_text, body_html, direction, delivery_status, created_on
      FROM email_log
      ORDER BY created_on DESC
      LIMIT 100
    `);

    let emailSynced = 0;
    for (const r of emailRows.rows) {
      const targetEmail = r.direction === 'inbound' ? normalizeEmail(r.from_email) : normalizeEmail(r.to_email);
      const customerId = targetEmail ? emailToCustomer.get(targetEmail) : null;
      if (!customerId) continue;

      const dir = r.direction === 'inbound' ? 'inbound' : 'outbound';
      const bodyText = (r.body_text || (r.body_html || '').replace(/<[^>]*>?/gm, ' ')).replace(/\s+/g, ' ').trim();
      const summary = bodyText.length > 140 ? bodyText.substring(0, 137) + '...' : bodyText;

      await client.query(`
        INSERT INTO omnichannel_event (
          tenant_id, customer_id, event_type, direction, source_module, source_record_id,
          event_timestamp, title, description, summary, status, metadata
        ) VALUES (
          $1, $2, 'EMAIL', $3, 'email', $4,
          $5, $6, $7, $8, $9, $10
        )
        ON CONFLICT (tenant_id, source_module, source_record_id)
        DO UPDATE SET description = EXCLUDED.description, summary = EXCLUDED.summary, updated_on = NOW()
      `, [
        r.tenant_id || 'default',
        customerId,
        dir,
        r.id,
        r.created_on || new Date(),
        r.subject || (dir === 'outbound' ? 'Outbound Email' : 'Inbound Email'),
        bodyText,
        summary,
        r.delivery_status || 'sent',
        JSON.stringify({ from: r.from_email, to: r.to_email, subject: r.subject })
      ]);
      emailSynced++;
    }
    console.log(`✅ Synced ${emailSynced} Email events!`);
  } catch (err) {
    console.warn('Email sync warning:', err.message);
  }

  // 4. Sync Voice Call Logs into omnichannel_event
  console.log('Syncing Voice Call logs...');
  try {
    const callRows = await client.query(`
      SELECT id, tenant_id, customer_phone, direction, duration_seconds, call_status, summary, transcript, recording_url, created_on
      FROM voice_call_log
      ORDER BY created_on DESC
      LIMIT 50
    `);

    let callSynced = 0;
    for (const r of callRows.rows) {
      const normPhone = normalizePhone(r.customer_phone);
      const customerId = normPhone ? phoneToCustomer.get(normPhone) : null;
      if (!customerId) continue;

      const dir = r.direction === 'inbound' ? 'inbound' : 'outbound';
      const durMins = Math.floor((r.duration_seconds || 0) / 60);
      const durSecs = (r.duration_seconds || 0) % 60;
      const durText = `${durMins}m ${durSecs}s`;

      await client.query(`
        INSERT INTO omnichannel_event (
          tenant_id, customer_id, event_type, direction, source_module, source_record_id,
          event_timestamp, title, description, summary, status, metadata
        ) VALUES (
          $1, $2, 'CALL', $3, 'voice', $4,
          $5, $6, $7, $8, $9, $10
        )
        ON CONFLICT (tenant_id, source_module, source_record_id)
        DO UPDATE SET summary = EXCLUDED.summary, updated_on = NOW()
      `, [
        r.tenant_id || 'default',
        customerId,
        dir,
        r.id,
        r.created_on || new Date(),
        `Voice Call (${durText}) - ${r.call_status || 'Answered'}`,
        r.transcript || r.summary || `Voice call with ${r.customer_phone}`,
        r.summary || `Discussed requirements via voice call (${durText})`,
        r.call_status || 'completed',
        JSON.stringify({
          duration: r.duration_seconds,
          duration_formatted: durText,
          recording_url: r.recording_url,
          transcript: r.transcript,
          call_status: r.call_status
        })
      ]);
      callSynced++;
    }
    console.log(`✅ Synced ${callSynced} Voice Call events!`);
  } catch (err) {
    console.warn('Call sync warning:', err.message);
  }

  // 5. Ensure Ram Kumar has complete 5-channel journey!
  const ramCustList = customers.rows.filter(c => c.name && (c.name.toLowerCase().includes('ram kumar') || c.name.toLowerCase() === 'ram'));
  for (const ramCust of (ramCustList.length > 0 ? ramCustList : [customers.rows[0]])) {
    console.log(`Ensuring rich 5-channel journey for ${ramCust.name} (${ramCust.id})...`);
    const ramId = ramCust.id;
    const tenantId = ramCust.tenant_id || 'default';

    const events = [
      {
        id: 'ram-wa-01',
        type: 'WHATSAPP',
        dir: 'inbound',
        module: 'whatsapp',
        time: new Date(Date.now() - 36 * 3600 * 1000),
        title: 'Initial WhatsApp Inquiry from Ram Kumar',
        desc: 'Hi team, I am Ram Kumar from Ram Enterprises Ltd. We are looking for an AI Workforce SaaS platform to automate our customer support and outbound voice calls across 10 agents. Can you share the pricing tiers and onboarding timeline?',
        summary: 'Inquired about AI Workforce SaaS pricing tiers, 10 agent capacity, and onboarding timeline.',
        status: 'delivered',
        metadata: { sender: 'Ram Kumar', phone: '+919840123456', message_type: 'text' }
      },
      {
        id: 'ram-wa-02',
        type: 'WHATSAPP',
        dir: 'outbound',
        module: 'whatsapp',
        time: new Date(Date.now() - 35 * 3600 * 1000),
        title: 'WhatsApp Response sent to Ram Kumar',
        desc: 'Hello Ram! Welcome to Sharyx. We offer a Starter plan ($299/mo) and Enterprise plan ($799/mo) with full omnichannel AI autonomy for 10+ agents. Would you like to hop on a quick 10-minute discovery call today at 3 PM?',
        summary: 'Sent Starter & Enterprise plan overview and proposed 3 PM discovery call.',
        status: 'read',
        metadata: { agent: 'AI Sales Assistant', phone: '+919840123456' }
      },
      {
        id: 'ram-call-01',
        type: 'CALL',
        dir: 'inbound',
        module: 'voice',
        time: new Date(Date.now() - 24 * 3600 * 1000),
        title: 'Voice Call (04m 15s) - Answered',
        desc: 'Ram Kumar called our voice agent to confirm integration with Zoho CRM and WhatsApp Cloud API. Ram confirmed they have 10,000 monthly active customer chats and require 99.9% uptime SLA.',
        summary: 'Discussed custom CRM integration, 10,000 monthly chats, and SLA guarantee. Ram requested formal quotation with annual billing discount.',
        status: 'completed',
        metadata: {
          duration: 255,
          duration_formatted: '4m 15s',
          recording_url: 'https://actions.google.com/sounds/v1/ambiences/office_background.ogg',
          transcript: 'Agent: Thank you for calling Sharyx AI Workforce. How can I help you today?\nRam: Hi, I am Ram Kumar from Ram Enterprises. I saw your pricing for Enterprise. We have 10 support agents handling about 10,000 chats a month. Can we integrate with Zoho CRM?\nAgent: Yes absolutely Ram! Our Enterprise plan includes direct 2-way Zoho CRM syncing, WhatsApp Business Cloud API, and priority routing.\nRam: Great. What is the annual discount if we pay upfront?\nAgent: We offer a 15% discount on annual billing, plus free dedicated onboarding.\nRam: Wonderful. Please email me the formal quotation and let us do a live product demo tomorrow.\nAgent: Will do right away. Have a great day Ram!',
          call_status: 'completed'
        }
      },
      {
        id: 'ram-email-01',
        type: 'EMAIL',
        dir: 'outbound',
        module: 'email',
        time: new Date(Date.now() - 22 * 3600 * 1000),
        title: 'Formal Proposal: Sharyx Enterprise AI Plan for Ram Enterprises Ltd',
        desc: 'Dear Ram,\n\nThank you for taking the time to speak with our voice team earlier today.\n\nAs discussed, we are pleased to offer Ram Enterprises Ltd our Enterprise Plan tailored for 10 agents and up to 25,000 automated monthly conversations across WhatsApp, Email, and Voice.\n\nKey Inclusions:\n- 10 Dedicated AI Workforce Agents (Autonomous WhatsApp + Voice Telephony)\n- Zoho CRM 2-way live sync & Webhook automations\n- 99.9% Uptime SLA with 1-hr response window\n- Annual Investment: $8,150 / year (includes 15% annual pre-payment discount)\n\nPlease review the attached proposal. We look forward to tomorrow\'s walkthrough meeting.\n\nWarm regards,\nSharyx Enterprise Solutions Team',
        summary: 'Dispatched formal Enterprise proposal ($8,150/year with 15% annual discount) for 10 agents and Zoho CRM integration.',
        status: 'delivered',
        metadata: {
          from: 'enterprise@sharyx.ai',
          to: 'ram@enterprises.in',
          subject: 'Formal Proposal: Sharyx Enterprise AI Plan for Ram Enterprises Ltd',
          attachments: [{ name: 'Sharyx_Enterprise_Proposal_RamEnterprises.pdf', size: '2.4 MB' }]
        }
      },
      {
        id: 'ram-email-02',
        type: 'EMAIL',
        dir: 'inbound',
        module: 'email',
        time: new Date(Date.now() - 14 * 3600 * 1000),
        title: 'Re: Formal Proposal: Sharyx Enterprise AI Plan for Ram Enterprises Ltd',
        desc: 'Hi Sharyx Team,\n\nThe proposal looks comprehensive. Can we split the payment into 2 semi-annual tranches of $4,075 while retaining the 15% discount? Also, please confirm if custom GST invoicing is supported for our Tamil Nadu entity (GSTIN: 33AAAAA0000A1Z5).\n\nSee you on Google Meet at 11:30 AM.\n\nBest,\nRam Kumar\nManaging Director, Ram Enterprises Ltd',
        summary: 'Requested 2 semi-annual tranches for payment while retaining discount; provided GSTIN 33AAAAA0000A1Z5 for Tamil Nadu invoicing.',
        status: 'read',
        metadata: {
          from: 'ram@enterprises.in',
          to: 'enterprise@sharyx.ai',
          subject: 'Re: Formal Proposal: Sharyx Enterprise AI Plan for Ram Enterprises Ltd'
        }
      },
      {
        id: 'ram-meet-01',
        type: 'MEETING',
        dir: 'internal',
        module: 'calendar',
        time: new Date(Date.now() - 2 * 3600 * 1000),
        title: 'Enterprise Architecture & CRM Sync Demo with Ram Enterprises',
        desc: 'Conducted live Google Meet demo with Ram Kumar and his IT Lead. Walked through omnichannel unified timeline, live WhatsApp escalation to voice agent, and Zoho CRM webhook mapping. Ram approved the workflow and agreed to proceed once semi-annual invoice is issued.',
        summary: 'Live product demo completed successfully. Ram approved omnichannel workflow; waiting on split invoice issuance.',
        status: 'completed',
        metadata: {
          meet_url: 'https://meet.google.com/abc-ramk-xyz',
          attendees: ['Ram Kumar (MD)', 'Suresh V (IT Lead)', 'Sharyx Solutions Architect'],
          duration_minutes: 45,
          next_steps: 'Send updated 2-tranche invoice with GSTIN 33AAAAA0000A1Z5 to close $8,150 contract.'
        }
      },
      {
        id: 'ram-interview-01',
        type: 'INTERVIEW',
        dir: 'internal',
        module: 'recruitment',
        time: new Date(Date.now() - 50 * 3600 * 1000),
        title: 'Customer Onboarding Lead Candidate Screening',
        desc: 'Technical screening interview conducted with designated onboarding partner candidate referred by Ram Enterprises to manage local implementation.',
        summary: 'Candidate cleared stage 2 technical review. Ready for client onboarding assignment.',
        status: 'completed',
        metadata: {
          stage: 'Technical Round 2',
          role: 'Implementation Specialist',
          score: '9/10',
          interview_link: 'https://meet.google.com/int-ramk-rec'
        }
      }
    ];

    for (const ev of events) {
      await client.query(`
        INSERT INTO omnichannel_event (
          tenant_id, customer_id, event_type, direction, source_module, source_record_id,
          event_timestamp, title, description, summary, status, metadata
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10, $11, $12
        )
        ON CONFLICT (tenant_id, source_module, source_record_id)
        DO UPDATE SET 
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          summary = EXCLUDED.summary,
          status = EXCLUDED.status,
          metadata = EXCLUDED.metadata,
          event_timestamp = EXCLUDED.event_timestamp,
          updated_on = NOW()
      `, [
        tenantId,
        ramId,
        ev.type,
        ev.dir,
        ev.module,
        ev.id,
        ev.time,
        ev.title,
        ev.desc,
        ev.summary,
        ev.status,
        JSON.stringify(ev.metadata)
      ]);
    }
    console.log(`✅ Seeded complete 5-channel journey for Ram Kumar (${ramCust.name})!`);
  }

  await client.end();
  console.log('🎉 Omnichannel 360 Data Synchronization Finished Successfully!');
}

runSync().catch(console.error);
