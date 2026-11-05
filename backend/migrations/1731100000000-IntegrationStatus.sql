-- Module 2: unified, per-tenant integration status. Idempotent and additive: safe to run more than once, and the
-- backend works (with in-memory status) BEFORE this runs, so deploy order does not matter.
--
--   psql -h <host> -U <user> -d <db> -f migrations/1731100000000-IntegrationStatus.sql
-- Rollback:  migrations/1731100000000-IntegrationStatus.down.sql

BEGIN;

CREATE TABLE IF NOT EXISTS tenant_integration_status (
  tenant_id        varchar(64)  NOT NULL,
  type             varchar(30)  NOT NULL,
  status           varchar(20)  NOT NULL DEFAULT 'not_configured',
  display_name     varchar(255),
  last_checked_at  timestamptz,
  last_success_at  timestamptz,
  error_code       varchar(50),
  -- plain-language reason for the user; secrets are stripped before it is written (see Helper/Redact.ts)
  error_message    varchar(500),
  updated_at       timestamptz  NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, type),
  CONSTRAINT chk_tis_status CHECK (status IN ('not_configured', 'connected', 'failed', 'degraded')),
  CONSTRAINT chk_tis_type   CHECK (type   IN ('whatsapp', 'whatsapp_webhook', 'email_smtp', 'email_imap', 'llm', 'voice'))
);

CREATE INDEX IF NOT EXISTS idx_tis_status_checked ON tenant_integration_status (status, last_checked_at);

COMMIT;
