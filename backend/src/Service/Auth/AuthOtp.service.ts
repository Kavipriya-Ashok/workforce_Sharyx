import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { createHmac, randomInt, timingSafeEqual } from 'crypto';
import { DataSource, EntityManager } from 'typeorm';

export const OTP_TTL_MINUTES = 10;
export const OTP_COOLDOWN_SECONDS = 30;
export const OTP_MAX_FAILED = 5;
/** After too many wrong guesses the e-mail cannot get a new code for this long. */
export const OTP_LOCKOUT_MINUTES = 5;

/** TypeORM returns [rows, count] for raw UPDATE/DELETE ... RETURNING, plain rows otherwise. */
const rowsOf = (res: any): any[] => (Array.isArray(res) && Array.isArray(res[0]) ? res[0] : res);

export type OtpRow = {
  email: string;
  otp_hash: string | null;
  name: string | null;
  expired: boolean;
  failed_attempts: number;
};

/**
 * Signup verification codes, stored in the `auth_otp` table (survives restarts, shared by every
 * backend instance). Only an HMAC of the code is stored. A row with a NULL hash is a "decoy"
 * created for an already-registered address, so registered and unregistered addresses behave
 * identically for the caller (same cooldown, same wrong-code lockout).
 */
@Injectable()
export class AuthOtpService {
  constructor(private readonly _DataSource: DataSource) {}

  generate(): string {
    return randomInt(100000, 1000000).toString();
  }

  hash(email: string, otp: string): string {
    const pepper = process.env.TOKEN_SECRET || '';
    return createHmac('sha256', pepper).update(`signup:${email}:${otp}`).digest('hex');
  }

  matches(row: OtpRow, email: string, otp: string): boolean {
    if (!row.otp_hash) return false;
    const a = Buffer.from(row.otp_hash, 'hex');
    const b = Buffer.from(this.hash(email, otp), 'hex');
    return a.length === b.length && timingSafeEqual(a, b);
  }

  /**
   * Atomically create/replace the pending code for `email`, honouring the resend cooldown.
   * Throws 429 (with the number of seconds to wait) when a code was issued too recently.
   * `otp === null` stores a decoy row (no code can ever match it).
   */
  async issue(email: string, otp: string | null, name?: string): Promise<void> {
    let rows: any[];
    try {
      rows = await this.insertOrCooldown(email, otp, name);
    } catch (e: any) {
      if ((e?.code || e?.driverError?.code) === '42P01') {
        // migrations/1731000000000-AuthHardening.sql has not been applied to this database yet
        throw new HttpException('Sign-up is temporarily unavailable (database upgrade pending). Please try again shortly.', HttpStatus.SERVICE_UNAVAILABLE);
      }
      throw e;
    }
    if (rows.length === 0) {
      const [w] = await this._DataSource.query(
        `SELECT GREATEST(1, CEIL(EXTRACT(EPOCH FROM (last_sent_at + make_interval(secs => $2) - now()))))::int AS wait
           FROM auth_otp WHERE email = $1`,
        [email, OTP_COOLDOWN_SECONDS]
      );
      const wait = w?.wait ?? OTP_COOLDOWN_SECONDS;
      throw new HttpException(
        `Please wait ${wait} seconds before requesting a new verification code.`,
        HttpStatus.TOO_MANY_REQUESTS
      );
    }
  }

  private async insertOrCooldown(email: string, otp: string | null, name?: string): Promise<any[]> {
    await this._DataSource.query(`DELETE FROM auth_otp WHERE expires_at < now() - interval '1 day'`);
    return await this._DataSource.query(
      `INSERT INTO auth_otp (email, otp_hash, name, expires_at, last_sent_at, send_count, failed_attempts)
       VALUES ($1, $2, $3, now() + make_interval(mins => $4), now(), 1, 0)
       ON CONFLICT (email) DO UPDATE SET
         otp_hash = EXCLUDED.otp_hash,
         name = COALESCE(EXCLUDED.name, auth_otp.name),
         expires_at = EXCLUDED.expires_at,
         last_sent_at = now(),
         send_count = auth_otp.send_count + 1,
         failed_attempts = 0
       WHERE auth_otp.last_sent_at <= now() - make_interval(secs => $5)
       RETURNING email`,
      [email, otp ? this.hash(email, otp) : null, name || null, OTP_TTL_MINUTES, OTP_COOLDOWN_SECONDS]
    );
  }

  /** Row-locks the pending code for the duration of the surrounding transaction. */
  async lock(em: EntityManager, email: string): Promise<OtpRow | null> {
    const rows = await em.query(
      `SELECT email, otp_hash, name, (expires_at < now()) AS expired, failed_attempts
         FROM auth_otp WHERE email = $1 FOR UPDATE`,
      [email]
    );
    return rows[0] || null;
  }

  async consume(em: EntityManager, email: string): Promise<void> {
    await em.query(`DELETE FROM auth_otp WHERE email = $1`, [email]);
  }

  /**
   * Record a wrong guess. On reaching the limit the code is destroyed and the address is locked out
   * of requesting a new one for OTP_LOCKOUT_MINUTES. Returns true when this guess caused the lockout.
   */
  async recordFailure(em: EntityManager, email: string): Promise<boolean> {
    const [r] = rowsOf(await em.query(
      `UPDATE auth_otp SET failed_attempts = failed_attempts + 1 WHERE email = $1 RETURNING failed_attempts`,
      [email]
    ));
    if (r && r.failed_attempts >= OTP_MAX_FAILED) {
      // otp_hash NULL kills the code; pushing last_sent_at into the future stretches the resend cooldown.
      await em.query(
        `UPDATE auth_otp SET otp_hash = NULL, last_sent_at = now() + make_interval(mins => $2) WHERE email = $1`,
        [email, OTP_LOCKOUT_MINUTES]
      );
      return true;
    }
    return false;
  }
}
