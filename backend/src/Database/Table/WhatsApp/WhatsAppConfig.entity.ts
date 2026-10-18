import { Column, Entity } from "typeorm";
import { BaseTable } from "../BaseTable";

@Entity("whatsapp_config")
export class WhatsAppConfig extends BaseTable {
  @Column({ default: "default" })
  tenant_id: string;

  @Column({ length: 30 })
  phone_number: string;

  @Column({ length: 100 })
  phone_number_id: string;

  @Column({ length: 100, nullable: true })
  waba_id: string;

  @Column({ type: "text" })
  access_token: string;

  @Column({ length: 100, default: "sharyx_verify_token_secure" })
  verify_token: string;

  @Column({ length: 50, default: "meta_cloud" })
  provider: string; // 'meta_cloud', 'qr_gateway', 'custom_gateway', 'twilio'

  @Column({ type: "text", nullable: true })
  api_url: string;

  @Column({ type: "text", nullable: true })
  api_key: string;

  @Column({ type: "boolean", default: true })
  is_connected: boolean;
}
