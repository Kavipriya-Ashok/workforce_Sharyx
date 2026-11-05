-- Brain Phase 1: per-tenant email delivery log + per-tenant Meta app secret.
-- Additive and idempotent. In dev TypeORM `synchronize` creates the same objects; run this in production.
--   psql -d <db> -f backend/migrations/1730900000001-BrainPhase1.sql
-- ROLLBACK (manual):
--   DROP TABLE IF EXISTS email_delivery_log;
--   ALTER TABLE whatsapp_config DROP COLUMN IF EXISTS app_secret;

BEGIN;

CREATE TABLE IF NOT EXISTS email_delivery_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   varchar(64)  NOT NULL,
  to_email    varchar(255),
  subject     varchar(300),
  status      varchar(20)  NOT NULL,            -- 'skipped' | 'failed'
  reason      varchar(500),
  attempts    int          NOT NULL DEFAULT 0,
  lead_id     uuid,
  created_on  timestamptz  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_email_delivery_log_tenant ON email_delivery_log (tenant_id, created_on);

-- Encrypted by the app (EncryptedColumn, "enc:v1:" prefix). NULL = fall back to the platform META_APP_SECRET.
ALTER TABLE whatsapp_config ADD COLUMN IF NOT EXISTS app_secret text;

COMMIT;
