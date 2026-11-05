import { Logger } from '@nestjs/common';
import { user } from '@Database/Table/Admin/user';

/**
 * Access to user.token_version / user.reset_otp_attempts.
 *
 * These two columns come from migrations/1731000000000-AuthHardening.sql. They are deliberately NOT mapped on the
 * `user` entity: a mapped column would be part of every SELECT/INSERT on the table, so deploying this build
 * before the migration has run would break login, user admin and everything else that touches `user`.
 * Going through raw SQL lets the new code run safely on a database that has not been migrated yet
 * (session revocation is simply inactive until it is) and activates automatically once the migration is applied.
 */
const logger = new Logger('SessionVersion');

export const isUndefinedColumn = (e: any): boolean => (e?.code || e?.driverError?.code) === '42703';
export const isUndefinedTable = (e: any): boolean => (e?.code || e?.driverError?.code) === '42P01';

/** TypeORM returns [rows, count] for raw UPDATE/DELETE ... RETURNING, plain rows otherwise. */
export const rowsOf = (res: any): any[] => (Array.isArray(res) && Array.isArray(res[0]) ? res[0] : res);

let warnedAt = 0;
const warnMigrationPending = () => {
  if (Date.now() - warnedAt > 5 * 60 * 1000) {
    warnedAt = Date.now();
    logger.warn('Column user.token_version is missing - run migrations/1731000000000-AuthHardening.sql. Session revocation is INACTIVE until then.');
  }
};

export interface SessionRow {
  status: boolean;
  tokenVersion: number;
}

/** Account state + current token_version, or null when the user no longer exists. */
export async function readSession(userId: string): Promise<SessionRow | null> {
  try {
    const rows = rowsOf(await user.query(`SELECT status, token_version FROM "user" WHERE id = $1`, [userId]));
    return rows[0] ? { status: rows[0].status !== false, tokenVersion: Number(rows[0].token_version) || 0 } : null;
  } catch (e) {
    if (!isUndefinedColumn(e)) throw e;
    warnMigrationPending();
    const rows = rowsOf(await user.query(`SELECT status FROM "user" WHERE id = $1`, [userId]));
    return rows[0] ? { status: rows[0].status !== false, tokenVersion: 0 } : null;
  }
}

export async function getTokenVersion(userId: string): Promise<number> {
  return (await readSession(userId))?.tokenVersion ?? 0;
}

/** Invalidates every JWT issued to this user so far. No-op (with a warning) before the migration. */
export async function bumpTokenVersion(userId: string): Promise<void> {
  try {
    await user.query(`UPDATE "user" SET token_version = token_version + 1 WHERE id = $1`, [userId]);
  } catch (e) {
    if (!isUndefinedColumn(e)) throw e;
    warnMigrationPending();
  }
}
