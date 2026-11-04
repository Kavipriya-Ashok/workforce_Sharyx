const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

if (fs.existsSync(path.resolve(__dirname, '../.env.local'))) {
  dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
} else {
  dotenv.config({ path: path.resolve(__dirname, '../.env') });
}

async function runMigration() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASS || '12345',
    database: process.env.DB_NAME || 'ai_workforce',
  });

  await client.connect();
  console.log('Connected to PostgreSQL for Customer-Centric Omnichannel 360 Migration...');

  await client.query(`
    -- 1. Customer Identity Mapping Table
    CREATE TABLE IF NOT EXISTS customer_identity_mapping (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id VARCHAR(100) NOT NULL DEFAULT 'default',
      customer_id UUID NOT NULL REFERENCES customer(id) ON DELETE CASCADE,
      identity_type VARCHAR(20) NOT NULL, -- 'phone' | 'email'
      identity_value VARCHAR(255) NOT NULL, -- normalized E.164 phone or lowercase email
      raw_value VARCHAR(255),
      country_code VARCHAR(10) DEFAULT 'IN',
      is_primary BOOLEAN DEFAULT false,
      is_verified BOOLEAN DEFAULT true,
      source VARCHAR(50) DEFAULT 'manual',
      created_on TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_on TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_cim_tenant_id ON customer_identity_mapping(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_cim_customer_id ON customer_identity_mapping(customer_id);
    CREATE INDEX IF NOT EXISTS idx_cim_type ON customer_identity_mapping(identity_type);
    CREATE INDEX IF NOT EXISTS idx_cim_value ON customer_identity_mapping(identity_value);
    CREATE UNIQUE INDEX IF NOT EXISTS uq_cim_tenant_type_value ON customer_identity_mapping(tenant_id, identity_type, identity_value);

    -- 2. Universal Omnichannel Event Table
    CREATE TABLE IF NOT EXISTS omnichannel_event (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id VARCHAR(100) NOT NULL DEFAULT 'default',
      customer_id UUID NOT NULL REFERENCES customer(id) ON DELETE CASCADE,
      event_type VARCHAR(30) NOT NULL, -- 'WHATSAPP', 'EMAIL', 'CALL', 'MEETING', 'INTERVIEW'
      direction VARCHAR(20) NOT NULL DEFAULT 'inbound', -- 'inbound', 'outbound', 'internal'
      source_module VARCHAR(50) NOT NULL, -- 'whatsapp', 'email', 'voice', 'calendar', 'recruitment'
      source_record_id VARCHAR(150) NOT NULL, -- ID in source table (wa_message, email_log, etc.)
      event_timestamp TIMESTAMPTZ NOT NULL,
      title VARCHAR(300) NOT NULL,
      description TEXT,
      summary TEXT,
      status VARCHAR(50) NOT NULL DEFAULT 'completed',
      metadata JSONB DEFAULT '{}'::jsonb,
      created_on TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_on TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE UNIQUE INDEX IF NOT EXISTS uq_omnichannel_source_record ON omnichannel_event(tenant_id, source_module, source_record_id);
    CREATE INDEX IF NOT EXISTS idx_oe_customer_time ON omnichannel_event(customer_id, event_timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_oe_channel_time ON omnichannel_event(customer_id, event_type, event_timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_oe_tenant_time ON omnichannel_event(tenant_id, event_timestamp DESC);
  `);

  console.log('✅ Successfully created customer_identity_mapping and omnichannel_event tables with indexes!');
  await client.end();
}

runMigration().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
