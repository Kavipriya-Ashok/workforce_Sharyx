import { Column, Entity } from "typeorm";
import { BaseTable } from "../BaseTable";

export type VoiceProviderType = "vapi" | "retell" | "bland" | "saas_fallback";

@Entity("voice_provider_config")
export class VoiceProviderConfig extends BaseTable {
  @Column({ default: "default" })
  tenant_id: string;

  @Column({ type: "varchar", length: 30, default: "vapi" })
  provider: VoiceProviderType;

  @Column({ type: "text", nullable: true })
  api_key: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  phone_number_id: string;

  @Column({ type: "varchar", length: 40, nullable: true })
  caller_id: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  base_url: string;

  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, any>;

  @Column({ type: "boolean", default: true })
  is_active: boolean;
}
