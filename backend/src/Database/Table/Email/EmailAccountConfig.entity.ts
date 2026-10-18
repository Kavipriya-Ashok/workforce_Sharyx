import { Column, Entity } from "typeorm";
import { BaseTable } from "../BaseTable";

@Entity("email_account_config")
export class EmailAccountConfig extends BaseTable {
  @Column({ default: "default" })
  tenant_id: string;

  @Column({ length: 150 })
  email_address: string;

  @Column({ length: 150 })
  smtp_host: string;

  @Column({ type: "int", default: 587 })
  smtp_port: number;

  @Column({ length: 150 })
  smtp_user: string;

  @Column({ type: "text" })
  smtp_password: string;

  @Column({ length: 150, nullable: true })
  imap_host: string;

  @Column({ type: "int", default: 993 })
  imap_port: number;

  @Column({ type: "boolean", default: true })
  use_ssl: boolean;

  @Column({ type: "boolean", default: true })
  is_active: boolean;
}
