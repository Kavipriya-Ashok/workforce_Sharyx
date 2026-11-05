import { WhatsAppConfig } from "@Database/Table/WhatsApp/WhatsAppConfig.entity";

/**
 * "Does this database already have the new column / table?" - so code can use a migrated feature when it is there and
 * fall back to the old behaviour when it is not (the backend must work BEFORE a migration is applied; a missing
 * column must never turn into a 500).
 *
 * Answers are cached for TTL ms (default 60 s) so a migration applied while the server runs is noticed without a restart.
 */
const TTL = 60_000;
const cache = new Map<string, { at: number; value: boolean }>();

async function ask(sql: string, params: any[]): Promise<boolean> {
  try {
    // any entity gives access to the default connection; it throws when the database is not initialised yet
    const rows = await WhatsAppConfig.query(sql, params);
    return Array.isArray(rows) && rows.length > 0;
  } catch {
    return false;
  }
}

export async function hasColumn(table: string, column: string): Promise<boolean> {
  const k = `c:${table}.${column}`;
  const hit = cache.get(k);
  if (hit && Date.now() - hit.at < TTL) return hit.value;
  const value = await ask(`SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = $1 AND column_name = $2`, [table, column]);
  cache.set(k, { at: Date.now(), value });
  return value;
}

export async function hasTable(table: string): Promise<boolean> {
  const k = `t:${table}`;
  const hit = cache.get(k);
  if (hit && Date.now() - hit.at < TTL) return hit.value;
  const value = await ask(`SELECT 1 FROM information_schema.tables WHERE table_schema = current_schema() AND table_name = $1`, [table]);
  cache.set(k, { at: Date.now(), value });
  return value;
}

/** For tests. */
export function clearSchemaFeatureCache() {
  cache.clear();
}
