import { Entity, Column, Index, ManyToOne, JoinColumn } from "typeorm";
import { BaseTable } from "../BaseTable";
import { Customer } from "../Customer/customer";

export type IdentityType = "phone" | "email";

@Entity({ name: "customer_identity_mapping" })
export class CustomerIdentityMapping extends BaseTable {
  @Index()
  @Column({ type: "varchar", length: 100, default: "default" })
  tenant_id: string;

  @Index()
  @Column({ type: "uuid" })
  customer_id: string;

  @ManyToOne(() => Customer, { onDelete: "CASCADE", nullable: true })
  @JoinColumn({ name: "customer_id" })
  customer?: Customer;

  @Index()
  @Column({ type: "varchar", length: 20 })
  identity_type: IdentityType; // 'phone' | 'email'

  @Index()
  @Column({ type: "varchar", length: 255 })
  identity_value: string; // E.164 phone or trimmed lowercase email

  @Column({ type: "varchar", length: 255, nullable: true })
  raw_value: string; // original input prior to normalization

  @Column({ type: "varchar", length: 10, default: "IN" })
  country_code: string; // 'IN', 'US', 'GB', etc.

  @Column({ type: "boolean", default: false })
  is_primary: boolean;

  @Column({ type: "boolean", default: true })
  is_verified: boolean;

  @Column({ type: "varchar", length: 50, default: "manual" })
  source: string; // 'whatsapp' | 'email' | 'call' | 'meeting' | 'interview' | 'manual'
}

