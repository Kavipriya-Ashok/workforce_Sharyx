import { Column, Entity } from "typeorm";
import { BaseTable } from "../BaseTable";

@Entity("email_account_config")
export class EmailAccountConfig extends BaseTable {
  @Column({ default: "default" })
  tenant_id: string;

  @Column({ length: 50, default: "smtp" })
  provider: string; // 'smtp' or 'google-email'

  @Column({ length: 150, nullable: true })
  display_name: string;

  @Column({ length: 150 })
  email_address: string;

  @Column({ type: "text", nullable: true })
  client_id: string;

  @Column({ type: "text", nullable: true })
  client_secret: string;

  @Column({ type: "text", nullable: true })
  refresh_token: string;

  @Column({ type: "text", nullable: true })
  access_token: string;

  @Column({ type: "timestamp", nullable: true })
  token_expires_at: Date;

  @Column({ length: 150, nullable: true })
  smtp_host: string;

  @Column({ type: "int", default: 587, nullable: true })
  smtp_port: number;

  @Column({ length: 150, nullable: true })
  smtp_user: string;

  @Column({ type: "text", nullable: true })
  smtp_password: string;

  @Column({ length: 150, nullable: true })
  imap_host: string;

  @Column({ type: "int", default: 993, nullable: true })
  imap_port: number;

  @Column({ type: "boolean", default: true })
  use_ssl: boolean;

  @Column({ type: "boolean", default: true })
  is_active: boolean;
}
