/**
 * @author VarunAnand
 */
import {
  AuditLogIdentity,
  AuditLogTableRemoveColumns,
} from "@Helper/AuditLog.decorators";
import { Entity, Column, JoinColumn, ManyToOne, Index } from "typeorm";
import { BaseTable } from "../BaseTable";
import { user_role } from "./user_role";
import { company } from "./company";

@Entity({ name: "user" })
export class user extends BaseTable {
  @ManyToOne(() => user_role, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "user_role_id" })
  user_role: user_role;

  @Column({ type: "uuid" })
  @Index()
  user_role_id: string;

  // The tenant this user belongs to. Every signup must create/attach its own
  // company row here instead of relying on a hardcoded tenant id anywhere else.
  @ManyToOne(() => company, { onDelete: "RESTRICT", nullable: true })
  @JoinColumn({ name: "company_id" })
  company: company;

  @Column({ type: "uuid", nullable: true })
  @Index()
  company_id: string;

  @Column({ type: "text", nullable: true })
  first_name: string;

  @Column({ type: "text", nullable: true })
  last_name: string;

  @AuditLogIdentity()
  @Column({ unique: true })
  email: string;

  @AuditLogTableRemoveColumns()
  @Column({ type: "text" })
  password: string;

  @Column({ nullable: true })
  mobile: string;

  @Column({ type: "bigint", nullable: true })
  reset_otp: number;

  @Column({ type: "timestamp", nullable: true })
  reset_otp_expires_at: Date;

  // NOTE: user.token_version and user.reset_otp_attempts (migrations/1731000000000-AuthHardening.sql) are intentionally
  // NOT mapped here. They are read/written with raw SQL in Service/Auth/SessionVersion.ts so this build also runs on a
  // database where the migration has not been applied yet (a mapped column would break every query on `user`).
}
