const { Client } = require('pg');

const client = new Client({
  host: '158.220.99.156',
  port: 5432,
  user: 'myuser',
  password: 'Login@123!',
  database: 'assistant_sharyx'
});

async function run() {
  await client.connect();
  console.log('Connected to database assistant_sharyx');

  // 1. WhatsApp Template
  const existingWaTpl = await client.query("SELECT id FROM wa_template WHERE name='quotation_dispatch';");
  if (existingWaTpl.rows.length === 0) {
    await client.query(`
      INSERT INTO wa_template (
        tenant_id, name, category, language, body_text, approval_status,
        is_active, outcome_filter, attach_pdf, pdf_template_type, pdf_title,
        status, created_by_id, created_on, updated_on
      ) VALUES (
        'default', 'quotation_dispatch', 'MARKETING', 'en_US',
        'Hi {{lead_name}}! 📄 Thank you for speaking with {{agent_name}}. Here is the official quotation for Sharyx Workforce Automation. Estimated value: {{currency}} {{deal_value}}. Our team will follow up with you shortly!',
        'APPROVED', true, 'Quotation Requested', true, 'executive_proposal', 'Official Quotation & Proposal',
        true, 'system', NOW(), NOW()
      );
    `);
    console.log('✅ Created WhatsApp Template: quotation_dispatch');
  } else {
    console.log('ℹ️ WhatsApp Template quotation_dispatch already exists');
  }

  // 2. WhatsApp Campaign
  const existingWaCamp = await client.query("SELECT id FROM wa_campaign WHERE name='Instant Voice Call Quotation Dispatch';");
  if (existingWaCamp.rows.length === 0) {
    await client.query(`
      INSERT INTO wa_campaign (
        tenant_id, name, description, trigger_event, template_name,
        delay_minutes, is_active, campaign_status, outcome_filter,
        attach_pdf, pdf_template_type, pdf_title,
        status, created_by_id, created_on, updated_on
      ) VALUES (
        'default', 'Instant Voice Call Quotation Dispatch',
        'Automatically sends WhatsApp quotation message & proposal PDF whenever customer asks for quote on call',
        'quotation_requested', 'quotation_dispatch',
        0, true, 'active', 'Quotation Requested',
        true, 'executive_proposal', 'Official Quotation & Proposal',
        true, 'system', NOW(), NOW()
      );
    `);
    console.log('✅ Created WhatsApp Campaign: Instant Voice Call Quotation Dispatch');
  } else {
    console.log('ℹ️ WhatsApp Campaign already exists');
  }

  // 3. Email Template
  const htmlTemplate = `
<p>Dear <strong>{{lead_name}}</strong>,</p>
<p>Thank you for speaking with our AI team today! As discussed during the call, here is your customized proposal and quotation for <strong>{{company}}</strong>.</p>
<div style="background:#f8fafc;border:1px solid #e2e8f0;padding:20px;border-radius:12px;margin:20px 0;">
  <h3 style="margin-top:0;color:#1e293b;">📋 Plan Overview: Sharyx Autonomous Workforce</h3>
  <p><strong>Estimated Investment:</strong> {{currency}} {{deal_value}}</p>
  <p><strong>Includes:</strong> Voice AI Calling, Omnichannel WhatsApp Copilot, Autonomous Email Handling, and CRM Integration.</p>
</div>
<p>Your official quotation document has also been attached. To proceed with implementation or discuss further, feel free to reply directly to this email or book a walkthrough:</p>
<p>👉 <a href="{{meet_url}}">Schedule a follow-up walkthrough</a></p>
<p>Warm regards,<br/><strong>{{agent_name}}</strong><br/>Sharyx Enterprise Solutions</p>
  `.trim();

  const existingEmTpl = await client.query("SELECT id FROM email_template WHERE name='Quotation & Proposal Dispatch';");
  if (existingEmTpl.rows.length === 0) {
    await client.query(`
      INSERT INTO email_template (
        tenant_id, name, category, subject, body_html, body_text,
        preview_text, variables, is_active, attach_pdf, pdf_template_type, pdf_title,
        status, created_by_id, created_on, updated_on
      ) VALUES (
        'default', 'Quotation & Proposal Dispatch', 'Sales',
        'Official Quotation & Proposal for {{company}} — Sharyx AI',
        $1,
        'Thank you for speaking with our AI team! Attached is your quotation proposal.',
        'Official quotation proposal inside',
        $2,
        true, true, 'executive_proposal', 'Official Quotation & Proposal',
        true, 'system', NOW(), NOW()
      );
    `, [htmlTemplate, JSON.stringify(['lead_name', 'company', 'currency', 'deal_value', 'meet_url', 'agent_name'])]);
    console.log('✅ Created Email Template: Quotation & Proposal Dispatch');
  } else {
    console.log('ℹ️ Email Template Quotation & Proposal Dispatch already exists');
  }

  // 4. Email Campaign
  const existingEmCamp = await client.query("SELECT id FROM email_campaign WHERE campaign_name='Instant Voice Call Quotation Dispatch';");
  if (existingEmCamp.rows.length === 0) {
    await client.query(`
      INSERT INTO email_campaign (
        tenant_id, campaign_name, subject, html_template,
        campaign_status, trigger_event, is_active, delay_seconds,
        outcome_filter, recipient_type, attach_pdf, pdf_template_type,
        status, created_by_id, created_on, updated_on
      ) VALUES (
        'default', 'Instant Voice Call Quotation Dispatch',
        'Official Quotation & Proposal for {{company}} — Sharyx AI',
        $1,
        'active', 'quotation_requested', true, 0,
        'Quotation Requested', 'lead_or_customer', true, 'executive_proposal',
        true, 'system', NOW(), NOW()
      );
    `, [htmlTemplate]);
    console.log('✅ Created Email Campaign: Instant Voice Call Quotation Dispatch');
  } else {
    console.log('ℹ️ Email Campaign already exists');
  }

  // Also check Demo Booked campaign
  const existingDemoCamp = await client.query("SELECT id FROM wa_campaign WHERE name='Demo Scheduled Confirmation';");
  if (existingDemoCamp.rows.length === 0) {
    await client.query(`
      INSERT INTO wa_campaign (
        tenant_id, name, description, trigger_event, template_name,
        delay_minutes, is_active, campaign_status, outcome_filter,
        attach_pdf, pdf_template_type, pdf_title,
        status, created_by_id, created_on, updated_on
      ) VALUES (
        'default', 'Demo Scheduled Confirmation',
        'Confirmation WhatsApp message dispatched when a demo is booked on call',
        'appointment_booked', 'quotation_dispatch',
        0, true, 'active', 'Demo Booked',
        false, null, null,
        true, 'system', NOW(), NOW()
      );
    `);
    console.log('✅ Created WhatsApp Campaign: Demo Scheduled Confirmation');
  }

  await client.end();
}

run().catch(err => {
  console.error('Seed error:', err);
  client.end();
});

