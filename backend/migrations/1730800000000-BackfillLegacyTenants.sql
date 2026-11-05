-- =====================================================================================
-- ONE-OFF DATA MIGRATION for databases created BEFORE real multi-tenancy.      (NOT RUN)
--
-- Why: until now every user/record was effectively in one shared tenant: user rows had no
-- company, and business rows were tagged tenant_id = 'default' (or the old hardcoded
-- '646b4abe-e6de-401b-ba33-46884bf3f6e6'). The new code is strict (exact tenant match,
-- no 'default' fallback) so those legacy rows/users would otherwise be unreachable.
--
-- What it does (all UPDATEs, nothing is deleted):
--   1. attaches every user without a company to the OLDEST company (your original tenant)
--   2. marks that company as already onboarded (it predates the onboarding wizard)
--   3. re-tags every legacy 'default' / hardcoded / NULL tenant_id row to that company
--
-- HOW TO RUN: review the target below, take a backup, run in a transaction, check, then COMMIT.
--   psql -d <db> -f backend/migrations/1730800000000-BackfillLegacyTenants.sql
-- If you want legacy data to belong to a different company, change the target query.
-- =====================================================================================

BEGIN;

-- Target tenant = the oldest company. Inspect it before committing:
--   SELECT id, name, created_on FROM company ORDER BY created_on ASC NULLS LAST LIMIT 1;
CREATE TEMP TABLE _legacy_target AS
  SELECT id FROM company ORDER BY created_on ASC NULLS LAST LIMIT 1;

-- 1. users without a tenant
UPDATE "user"
   SET company_id = (SELECT id FROM _legacy_target)
 WHERE company_id IS NULL;

-- 2. the legacy company predates the wizard
UPDATE company
   SET onboarding_completed = true
 WHERE id = (SELECT id FROM _legacy_target)
   AND onboarding_data IS NULL;

-- 3. every table that has a tenant_id column
DO $$
DECLARE
  t record;
  target uuid := (SELECT id FROM _legacy_target);
BEGIN
  FOR t IN
    SELECT table_name
      FROM information_schema.columns
     WHERE table_schema = 'public' AND column_name = 'tenant_id'
  LOOP
    EXECUTE format(
      'UPDATE %I SET tenant_id = %L WHERE tenant_id IS NULL OR tenant_id IN (''default'', ''all'', ''646b4abe-e6de-401b-ba33-46884bf3f6e6'')',
      t.table_name, target::text
    );
    RAISE NOTICE 'backfilled %', t.table_name;
  END LOOP;
END $$;

-- Sanity checks (should all return 0 rows before you COMMIT):
--   SELECT id, email FROM "user" WHERE company_id IS NULL;
--   SELECT 'lead', count(*) FROM lead WHERE tenant_id IN ('default') OR tenant_id IS NULL;

-- COMMIT;   -- <- uncomment after reviewing, or run COMMIT manually
ROLLBACK;    -- safe default: nothing is applied until you replace this line with COMMIT
