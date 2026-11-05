-- Rollback for 1731100000000-IntegrationStatus.sql. Status history is derived data (every integration can be
-- re-tested), so dropping the table loses nothing that cannot be recomputed with "Test again".
BEGIN;
DROP TABLE IF EXISTS tenant_integration_status;
COMMIT;
