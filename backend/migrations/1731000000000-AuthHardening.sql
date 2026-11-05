-- Module 1 (Authentication & Identity) hardening.  Idempotent: safe to run more than once.
-- Apply to each environment BEFORE deploying the matching backend build (DB_SYNC is false).
--
--   psql -h <host> -U <user> -d <db> -f migrations/1731000000000-AuthHardening.sql

BEGIN;

-- Session revocation: every JWT carries the user's token_version; bumping it (logout, password
-- reset/change, admin reset) instantly invalidates every token issued before.
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS token_version integer NOT NULL DEFAULT 0;

-- Wrong reset-code guesses against the CURRENT reset code (was an in-memory Map).
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS reset_otp_attempts integer NOT NULL DEFAULT 0;

-- Signup OTPs: was an in-memory Map (lost on restart, not shared between instances).
-- One pending row per e-mail. otp_hash is NULL for a "decoy" row (e-mail already registered) so an
-- attacker cannot tell registered and unregistered addresses apart.
CREATE TABLE IF NOT EXISTS auth_otp (
  email           varchar(255) PRIMARY KEY,
  otp_hash        varchar(128),
  name            varchar(255),
  expires_at      timestamptz  NOT NULL,
  last_sent_at    timestamptz  NOT NULL,
  send_count      integer      NOT NULL DEFAULT 1,
  failed_attempts integer      NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_auth_otp_expires_at ON auth_otp (expires_at);

COMMIT;
