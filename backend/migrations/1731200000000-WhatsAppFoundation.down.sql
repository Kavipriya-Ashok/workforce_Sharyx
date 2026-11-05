-- Rollback for 1731200000000-WhatsAppFoundation.sql.
-- WARNING: this DELETES whatever was stored in the new tables and columns after the migration ran
-- (contact memory, opt-outs, outcome rules, e-mail event templates, message attribution). Take a backup first:
--   pg_dump -Fc -h <host> -U <user> -d <db> -f before-rollback.dump
-- Existing wa_message / wa_conversation / email_delivery_log rows are kept; only the added columns go.
BEGIN;

DROP TABLE IF EXISTS wa_outcome_mapping;
DROP TABLE IF EXISTS email_event_template;
DROP TABLE IF EXISTS wa_opt_outs;
DROP TABLE IF EXISTS contact_memory;

DROP INDEX IF EXISTS uq_email_delivery_dedupe;
DROP INDEX IF EXISTS idx_email_delivery_retry;
ALTER TABLE email_delivery_log DROP COLUMN IF EXISTS event;
ALTER TABLE email_delivery_log DROP COLUMN IF EXISTS source_event;
ALTER TABLE email_delivery_log DROP COLUMN IF EXISTS booking_ref;
ALTER TABLE email_delivery_log DROP COLUMN IF EXISTS mailbox;
ALTER TABLE email_delivery_log DROP COLUMN IF EXISTS provider;
ALTER TABLE email_delivery_log DROP COLUMN IF EXISTS provider_message_id;
ALTER TABLE email_delivery_log DROP COLUMN IF EXISTS sent_at;
ALTER TABLE email_delivery_log DROP COLUMN IF EXISTS next_retry_at;
ALTER TABLE email_delivery_log DROP COLUMN IF EXISTS dedupe_key;

ALTER TABLE wa_conversation DROP CONSTRAINT IF EXISTS chk_wa_conv_intent_conf;
ALTER TABLE wa_conversation DROP COLUMN IF EXISTS detected_intent;
ALTER TABLE wa_conversation DROP COLUMN IF EXISTS intent_confidence;
ALTER TABLE wa_conversation DROP COLUMN IF EXISTS topic;

DROP INDEX IF EXISTS idx_wa_message_tenant_campaign;
DROP INDEX IF EXISTS idx_wa_message_tenant_outcome;
ALTER TABLE wa_message DROP CONSTRAINT IF EXISTS fk_wa_message_campaign;
ALTER TABLE wa_message DROP COLUMN IF EXISTS campaign_id;
ALTER TABLE wa_message DROP COLUMN IF EXISTS outcome;
ALTER TABLE wa_message DROP COLUMN IF EXISTS channel;
ALTER TABLE wa_message DROP COLUMN IF EXISTS topic;
ALTER TABLE wa_message DROP COLUMN IF EXISTS source_event;

COMMIT;
