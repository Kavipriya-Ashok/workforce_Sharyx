import { AuditLogIdentity } from "@Helper/AuditLog.decorators";
import { Column, Entity } from "typeorm";
import { BaseTable } from "../BaseTable";

@Entity()
export class email_config extends BaseTable {

  @AuditLogIdentity()
  @Column()
  email_id: string;

  @Column({ type: 'text' })
  password: string;

  @Column({ nullable: true, default: "BoilerPlate" })
  mailer_name: string;

  @Column({ nullable: true, default: "smtp.gmail.com" })
  host: string;
}
