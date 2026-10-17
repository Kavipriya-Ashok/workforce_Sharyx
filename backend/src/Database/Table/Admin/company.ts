import { AuditLogIdentity } from "@Helper/AuditLog.decorators";
import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseTable } from "../BaseTable";
import { country } from "./country";
import { currency } from "./currency";

@Entity()
export class company extends BaseTable {

  @AuditLogIdentity()
  @Column()
  name: string;

  @Column()
  address: string;

  @ManyToOne(() => country, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "country_id" })
  country: country;

  @Column()
  @Index()
  country_id: string;

  @ManyToOne(type => currency, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "currency_id" })
  currency: currency;

  @Column()
  @Index()
  currency_id: string;

  @Column()
  postal_code: string;

  @Column()
  email: string;

  @Column({ nullable: true })
  website: string;

  @Column({ nullable: true })
  uen_no: string;

  @Column({ nullable: true })
  bank_name: string;

  @Column({ nullable: true })
  bank_acct_no: string;

  @Column({ nullable: true })
  telephone_no: string;

  @Column({ nullable: true })
  fax_no: string;

  @Column({ nullable: true })
  invoice_footer: string;

}
