import { Column, Entity } from "typeorm";
import { BaseTable } from "../BaseTable";
import { EncryptedColumn } from "@Helper/SecretTransformer";

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

  // Encrypted at rest (enc:v1:, see SecretTransformer); plain legacy values are still readable until migrated.
  @Column({ type: "text", nullable: true, transformer: EncryptedColumn })
  client_secret: string;

  // Encrypted at rest (enc:v1:, see SecretTransformer); plain legacy values are still readable until migrated.
  @Column({ type: "text", nullable: true, transformer: EncryptedColumn })
  refresh_token: string;

  // Encrypted at rest (enc:v1:, see SecretTransformer); plain legacy values are still readable until migrated.
  @Column({ type: "text", nullable: true, transformer: EncryptedColumn })
  access_token: string;

  @Column({ type: "timestamp", nullable: true })
  token_expires_at: Date;

  @Column({ length: 150, nullable: true })
  smtp_host: string;

  @Column({ type: "int", default: 587, nullable: true })
  smtp_port: number;

  @Column({ length: 150, nullable: true })
  smtp_user: string;

  // Encrypted at rest (enc:v1:, see SecretTransformer); plain legacy values are still readable until migrated.
  @Column({ type: "text", nullable: true, transformer: EncryptedColumn })
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
