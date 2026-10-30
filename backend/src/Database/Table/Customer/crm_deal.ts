import { Entity, Column, Index } from "typeorm";
import { BaseTable } from "../BaseTable";

@Entity({ name: "crm_deal" })
export class CrmDeal extends BaseTable {
  @Index()
  @Column({ type: "varchar", length: 100, default: "default" })
  tenant_id: string;

  @Column({ type: "varchar", length: 250 })
  title: string;

  @Index()
  @Column({ type: "uuid", nullable: true })
  lead_id: string;

  @Index()
  @Column({ type: "uuid", nullable: true })
  customer_id: string;

  @Column({ type: "numeric", precision: 12, scale: 2, default: 0 })
  deal_value: number;

  @Column({ type: "varchar", length: 10, default: "INR" })
  currency: string;

  @Index()
  @Column({ type: "varchar", length: 50, default: "Won" })
  stage: string;

  @Column({ type: "varchar", length: 100, default: "Standard Pipeline" })
  pipeline: string;

  @Column({ type: "int", default: 100 })
  probability: number;

  @Column({ type: "timestamptz", nullable: true })
  expected_close_date: Date;

  @Column({ type: "timestamptz", nullable: true })
  closed_at: Date;

  @Column({ type: "text", nullable: true })
  notes: string;

  @Column({ type: "jsonb", nullable: true })
  tags: string[];
}
