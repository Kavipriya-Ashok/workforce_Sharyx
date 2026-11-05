import { BaseEntity, Column, Entity, PrimaryColumn } from "typeorm";

/**
 * Pending signup verification codes (one row per e-mail). Replaces the old in-memory Map so a code
 * survives a restart and works across several backend instances. The code itself is never stored,
 * only an HMAC of it. `otp_hash` is NULL for a decoy row (the e-mail is already registered).
 * Rows are read/written with raw SQL in AuthOtpService (atomic upsert / lock / consume).
 */
@Entity({ name: "auth_otp" })
export class auth_otp extends BaseEntity {
  @PrimaryColumn({ type: "varchar", length: 255 })
  email: string;

  @Column({ type: "varchar", length: 128, nullable: true })
  otp_hash: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  name: string | null;

  @Column({ type: "timestamptz" })
  expires_at: Date;

  @Column({ type: "timestamptz" })
  last_sent_at: Date;

  @Column({ type: "int", default: 1 })
  send_count: number;

  @Column({ type: "int", default: 0 })
  failed_attempts: number;
}
