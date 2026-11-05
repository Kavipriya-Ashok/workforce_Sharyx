-- Module 3 / Phase 1: data foundation for WhatsApp attribution, intent, contact memory, opt-outs, outcome rules and e-mail events.
-- ADDITIVE and IDEMPOTENT: safe to run more than once. Nothing is renamed, dropped or rewritten, and the backend works
-- (with the old behaviour) BEFORE this runs, so deploy order does not matter.
--
--   pg_dump -Fc -h <host> -U <user> -d <db> -f backup.dump          # take a backup first
--   psql -h <host> -U <user> -d <db> -v ON_ERROR_STOP=1 -f migrations/1731200000000-WhatsAppFoundation.sql
-- Rollback: migrations/1731200000000-WhatsAppFoundation.down.sql
--
-- Every new table carries tenant_id and every uniqueness / index starts with tenant_id.
-- (whatsapp_config health columns are NOT added: Module 2's tenant_integration_status already holds status,
--  last_checked_at, last_success_at, error_code and error_message per tenant and per integration.)

BEGIN;

-- 1. wa_message: which campaign / outcome / channel / topic / event produced the message ----------------------------------
ALTER TABLE wa_message ADD COLUMN IF NOT EXISTS campaign_id   uuid;
ALTER TABLE wa_message ADD COLUMN IF NOT EXISTS outcome       varchar(100);
ALTER TABLE wa_message ADD COLUMN IF NOT EXISTS channel       varchar(20);   -- whatsapp | call | email | system
ALTER TABLE wa_message ADD COLUMN IF NOT EXISTS topic         varchar(100);
ALTER TABLE wa_message ADD COLUMN IF NOT EXISTS source_event  varchar(150);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_wa_message_campaign') THEN
    ALTER TABLE wa_message ADD CONSTRAINT fk_wa_message_campaign FOREIGN KEY (campaign_id) REFERENCES wa_campaign(id) ON DELETE SET NULL;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_wa_message_tenant_campaign ON wa_message (tenant_id, campaign_id) WHERE campaign_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wa_message_tenant_outcome  ON wa_message (tenant_id, outcome)     WHERE outcome IS NOT NULL;

-- 2. wa_conversation: what the customer wants (filled by the intent classifier) ------------------------------------------
ALTER TABLE wa_conversation ADD COLUMN IF NOT EXISTS detected_intent    varchar(30);   -- candidate | sales | support | unknown
ALTER TABLE wa_conversation ADD COLUMN IF NOT EXISTS intent_confidence  numeric(4,3);   -- 0.000 - 1.000
ALTER TABLE wa_conversation ADD COLUMN IF NOT EXISTS topic              varchar(100);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_wa_conv_intent_conf') THEN
    ALTER TABLE wa_conversation ADD CONSTRAINT chk_wa_conv_intent_conf CHECK (intent_confidence IS NULL OR (intent_confidence >= 0 AND intent_confidence <= 1));
  END IF;
END $$;

-- 3. contact_memory: ONE memory per (tenant, contact) shared by call / WhatsApp / e-mail ---------------------------------
CREATE TABLE IF NOT EXISTS contact_memory (
  id                  uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           varchar(64)  NOT NULL,
  contact_phone       varchar(32),                      -- E.164 (+919876543210); NULL for an e-mail-only contact
  contact_email       varchar(255),
  lead_id             uuid,
  summary             text         NOT NULL DEFAULT '',  -- rolling summary written by the LLM; treated as DATA, never as instructions
  facts               jsonb        NOT NULL DEFAULT '{}'::jsonb,
  open_tasks          jsonb        NOT NULL DEFAULT '[]'::jsonb,
  version             integer      NOT NULL DEFAULT 1,   -- optimistic-lock counter
  last_channel        varchar(20),
  last_interaction_at timestamptz,
  created_on          timestamptz  NOT NULL DEFAULT now(),
  updated_on          timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT chk_contact_memory_has_key CHECK (contact_phone IS NOT NULL OR contact_email IS NOT NULL),
  CONSTRAINT chk_contact_memory_facts   CHECK (jsonb_typeof(facts) = 'object'),
  CONSTRAINT chk_contact_memory_tasks   CHECK (jsonb_typeof(open_tasks) = 'array')
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_contact_memory_tenant_phone ON contact_memory (tenant_id, contact_phone);
CREATE UNIQUE INDEX IF NOT EXISTS uq_contact_memory_tenant_email_only ON contact_memory (tenant_id, lower(contact_email)) WHERE contact_phone IS NULL;
CREATE INDEX        IF NOT EXISTS idx_contact_memory_tenant_email ON contact_memory (tenant_id, contact_email);
CREATE INDEX        IF NOT EXISTS idx_contact_memory_tenant_lead  ON contact_memory (tenant_id, lead_id) WHERE lead_id IS NOT NULL;

-- 4. wa_opt_outs: STOP / START per tenant and number ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS wa_opt_outs (
  id             uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      varchar(64)  NOT NULL,
  contact_phone  varchar(32)  NOT NULL,                  -- E.164
  is_opted_out   boolean      NOT NULL DEFAULT true,
  keyword        varchar(30),                            -- the exact word that was received (STOP / START ...)
  source         varchar(20)  NOT NULL DEFAULT 'whatsapp', -- whatsapp | manual | import
  opted_out_at   timestamptz,
  opted_in_at    timestamptz,
  created_on     timestamptz  NOT NULL DEFAULT now(),
  updated_on     timestamptz  NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_wa_opt_outs_tenant_phone ON wa_opt_outs (tenant_id, contact_phone);

-- 5. wa_outcome_mapping: "when this outcome happens on this channel, send THIS" -------------------------------------------
CREATE TABLE IF NOT EXISTS wa_outcome_mapping (
  id                      uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               varchar(64)  NOT NULL,
  source_channel          varchar(20)  NOT NULL DEFAULT 'ALL',   -- call | whatsapp | email | ALL
  outcome_name            varchar(100) NOT NULL,                  -- demo_booked | interview_scheduled | details_requested ...
  campaign_id             uuid         REFERENCES wa_campaign(id)  ON DELETE SET NULL,
  template_id             uuid         REFERENCES wa_template(id)  ON DELETE SET NULL,
  email_template_id       uuid         REFERENCES email_template(id) ON DELETE SET NULL,
  send_email_confirmation boolean      NOT NULL DEFAULT true,
  language                varchar(20),
  is_active               boolean      NOT NULL DEFAULT true,
  created_on              timestamptz  NOT NULL DEFAULT now(),
  updated_on              timestamptz  NOT NULL DEFAULT now()
);
CREATE INDEX        IF NOT EXISTS idx_wa_outcome_mapping_tenant_outcome ON wa_outcome_mapping (tenant_id, outcome_name);
CREATE UNIQUE INDEX IF NOT EXISTS uq_wa_outcome_mapping_active ON wa_outcome_mapping (tenant_id, source_channel, outcome_name) WHERE is_active;

-- 6. email_event_template: the e-mail a tenant sends for an event (interview / demo / ...) ----------------------------------
CREATE TABLE IF NOT EXISTS email_event_template (
  id          uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   varchar(64)  NOT NULL,
  event       varchar(100) NOT NULL,                      -- interview_booked | demo_booked | details_requested ...
  language    varchar(20)  NOT NULL DEFAULT 'en',
  subject     varchar(300) NOT NULL,
  body_html   text,
  body_text   text,
  is_active   boolean      NOT NULL DEFAULT true,
  created_on  timestamptz  NOT NULL DEFAULT now(),
  updated_on  timestamptz  NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_email_event_template ON email_event_template (tenant_id, event, language);

-- 7. email_delivery_log: also record SENT mails, the mailbox, retries and a dedupe key -----------------------------------------
ALTER TABLE email_delivery_log ADD COLUMN IF NOT EXISTS event               varchar(100);
ALTER TABLE email_delivery_log ADD COLUMN IF NOT EXISTS source_event        varchar(150);
ALTER TABLE email_delivery_log ADD COLUMN IF NOT EXISTS booking_ref         varchar(100);
ALTER TABLE email_delivery_log ADD COLUMN IF NOT EXISTS mailbox             varchar(255);   -- the TENANT mailbox that sent it
ALTER TABLE email_delivery_log ADD COLUMN IF NOT EXISTS provider            varchar(30);    -- smtp | resend
ALTER TABLE email_delivery_log ADD COLUMN IF NOT EXISTS provider_message_id varchar(200);
ALTER TABLE email_delivery_log ADD COLUMN IF NOT EXISTS sent_at             timestamptz;
ALTER TABLE email_delivery_log ADD COLUMN IF NOT EXISTS next_retry_at       timestamptz;
ALTER TABLE email_delivery_log ADD COLUMN IF NOT EXISTS dedupe_key          varchar(200);
CREATE UNIQUE INDEX IF NOT EXISTS uq_email_delivery_dedupe ON email_delivery_log (tenant_id, dedupe_key) WHERE dedupe_key IS NOT NULL;
CREATE INDEX        IF NOT EXISTS idx_email_delivery_retry ON email_delivery_log (tenant_id, next_retry_at) WHERE next_retry_at IS NOT NULL;

COMMIT;
