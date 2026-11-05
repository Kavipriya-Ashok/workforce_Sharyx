import { Column, Entity, Index } from "typeorm";
import { BaseTable } from "../BaseTable";
import { EncryptedColumn } from "@Helper/SecretTransformer";

@Entity("whatsapp_config")
export class WhatsAppConfig extends BaseTable {
  // One WhatsApp connection per tenant (company id). Resolved server-side, never from client input.
  @Index({ unique: true })
  @Column({ type: "varchar" })
  tenant_id: string;

  @Column({ length: 30 })
  phone_number: string;

  // Used to route inbound webhooks to the owning tenant.
  @Index()
  @Column({ length: 100 })
  phone_number_id: string;

  @Column({ length: 100, nullable: true })
  waba_id: string;

  // Encrypted at rest (see EncryptedColumn); never returned to the frontend.
  @Column({ type: "text", transformer: EncryptedColumn })
  access_token: string;

  // Meta App Secret used to verify X-Hub-Signature-256 on webhooks. Encrypted at rest; never sent to the browser.
  @Column({ type: "text", nullable: true, transformer: EncryptedColumn })
  app_secret: string;

  // Per-tenant random webhook verify token (generated on save); no shared default.
  @Column({ length: 100, nullable: true })
  verify_token: string;

  @Column({ length: 50, default: "meta_cloud" })
  provider: string; // 'meta_cloud', 'qr_gateway', 'custom_gateway', 'twilio'

  @Column({ type: "text", nullable: true })
  api_url: string;

  @Column({ type: "text", nullable: true, transformer: EncryptedColumn })
  api_key: string;

  @Column({ type: "boolean", default: true })
  is_connected: boolean;
}
