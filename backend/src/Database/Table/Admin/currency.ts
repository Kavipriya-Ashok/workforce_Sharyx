import { AuditLogIdentity } from "@Helper/AuditLog.decorators";
import { Entity, Column } from "typeorm";
import { BaseTable } from "../BaseTable";

@Entity()
export class currency extends BaseTable {

  @AuditLogIdentity()
  @Column({ unique: true })
  name: string;

  @Column({ unique: true })
  code: string;

  @Column()
  symbol: string;

}
