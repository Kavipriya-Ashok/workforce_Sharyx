import { Entity, Column, PrimaryColumn, CreateDateColumn, Index } from "typeorm";
import { BaseEntity } from "typeorm";

@Entity("processed_messages")
export class ProcessedMessage extends BaseEntity {
  @PrimaryColumn({ type: "varchar", length: 191 })
  wamid: string;

  @Index()
  @Column({ type: "varchar", length: 50, nullable: true })
  sender_phone: string;

  @CreateDateColumn({ type: "timestamptz" })
  created_at: Date;
}

