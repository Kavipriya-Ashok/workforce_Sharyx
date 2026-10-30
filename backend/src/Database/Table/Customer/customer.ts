import { Entity, Column, Index } from "typeorm";
import { BaseTable } from "../BaseTable";

export enum CustomerStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  CHURNED = "CHURNED",
}

export enum CustomerTier {
  STARTER = "STARTER",
  PROFESSIONAL = "PROFESSIONAL",
  ENTERPRISE = "ENTERPRISE",
}

@Entity({ name: "customer" })
export class Customer extends BaseTable {
  @Index()
  @Column({ type: "varchar", length: 100, default: "default" })
  tenant_id: string;

  @Column({ type: "varchar", length: 300 })
  name: string;

  @Column({ type: "varchar", length: 150, nullable: true })
  first_name: string;

  @Column({ type: "varchar", length: 150, nullable: true })
  last_name: string;

  @Index()
  @Column({ type: "varchar", length: 255, nullable: true })
  email: string;

  @Index()
  @Column({ type: "varchar", length: 50, nullable: true })
  phone: string;

  @Column({ type: "varchar", length: 200, nullable: true })
  company_name: string;

  @Column({ type: "varchar", length: 150, nullable: true })
  job_title: string;

  @Index()
  @Column({ type: "varchar", length: 50, default: CustomerStatus.ACTIVE })
  customer_status: CustomerStatus | string;

  @Index()
  @Column({ type: "varchar", length: 50, default: CustomerTier.PROFESSIONAL })
  tier: CustomerTier | string;

  @Column({ type: "numeric", precision: 12, scale: 2, default: 0 })
  total_spend: number;

  @Column({ type: "varchar", length: 10, default: "INR" })
  currency: string;

  @Index()
  @Column({ type: "uuid", nullable: true })
  converted_from_lead_id: string;

  @Column({ type: "timestamptz", nullable: true })
  conversion_date: Date;

  @Column({ type: "jsonb", nullable: true })
  tags: string[];

  @Column({ type: "jsonb", nullable: true })
  custom_fields: Record<string, any>;

  @Column({ type: "text", nullable: true })
  notes: string;

  @Index()
  @Column({ type: "uuid", nullable: true })
  assigned_to_id: string;
}
