import { AuditLogIdentity } from "@Helper/AuditLog.decorators";
import { Entity, Column, JoinColumn, ManyToOne, Index } from "typeorm";
import { BaseTable } from "../BaseTable";
import { currency } from "./currency";

@Entity()
export class country extends BaseTable {

  @ManyToOne(() => currency, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "currency_id" })
  currency: currency;

  @Column()
  @Index()
  currency_id: string;

  @AuditLogIdentity()
  @Column({ unique: true })
  name: string;

  @Column({ unique: true })
  code: string;

}
