import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  BaseEntity,
  Index,
} from "typeorm";

@Entity("job_openings")
export class JobOpening extends BaseEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Index()
  @Column({ type: "varchar", length: 100, default: "default" })
  tenant_id: string;

  @Column({ type: "varchar", length: 200 })
  title: string;

  @Column({ type: "jsonb", default: () => "'[]'::jsonb" })
  skills: string[];

  @Column({ type: "numeric", precision: 4, scale: 1, default: 0 })
  min_experience: number;

  @Column({ type: "jsonb", default: () => "'[]'::jsonb" })
  locations: string[];

  @Column({ type: "varchar", length: 50, default: "Hybrid" })
  work_mode: string; // 'Onsite' | 'Hybrid' | 'Remote'

  @Column({ type: "boolean", default: true })
  relocation_supported: boolean;

  @Index()
  @Column({ type: "varchar", length: 30, default: "open" })
  status: string; // 'open' | 'closed'

  @Column({ type: "varchar", length: 100, nullable: true })
  updated_by: string;

  @CreateDateColumn({ type: "timestamptz" })
  created_at: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updated_at: Date;
}

