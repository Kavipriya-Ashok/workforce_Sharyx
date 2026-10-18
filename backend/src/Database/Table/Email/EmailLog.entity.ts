import { Column, Entity } from "typeorm";
import { BaseTable } from "../BaseTable";

@Entity("email_log")
export class EmailLog extends BaseTable {
  @Column({ default: "default" })
  tenant_id: string;

  @Column({ type: "uuid", nullable: true })
  lead_id: string;

  @Column({ length: 150 })
  from_email: string;

  @Column({ length: 150 })
  to_email: string;

  @Column({ type: "text", nullable: true })
  subject: string;

  @Column({ type: "text", nullable: true })
  body_text: string;

  @Column({ type: "text", nullable: true })
  body_html: string;

  @Column({ length: 15, default: "outbound" }) // 'inbound', 'outbound'
  direction: string;

  @Column({ length: 20, default: "sent" }) // 'sent', 'received', 'failed'
  delivery_status: string;

  @Column({ type: "boolean", default: false })
  is_ai_drafted: boolean;

  @Column({ length: 250, nullable: true })
  message_id: string;
}
