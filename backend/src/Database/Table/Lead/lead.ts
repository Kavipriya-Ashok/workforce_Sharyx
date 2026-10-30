import { Entity, Column, Index } from "typeorm";
import { BaseTable } from "../BaseTable";

export enum LeadStatus {
  NEW = "NEW",
  CONTACTED = "CONTACTED",
  QUALIFIED = "QUALIFIED",
  PROPOSAL = "PROPOSAL",
  WON = "WON",
  LOST = "LOST",
  UNQUALIFIED = "UNQUALIFIED",
}

export enum LeadSource {
  MANUAL = "MANUAL",
  CSV_IMPORT = "CSV_IMPORT",
  WEBHOOK = "WEBHOOK",
  FORM = "FORM",
  ZAPIER = "ZAPIER",
  FACEBOOK = "FACEBOOK",
  AI_AGENT = "AI_AGENT",
  INBOUND_CALL = "INBOUND_CALL",
  WHATSAPP = "WHATSAPP",
  EMAIL = "EMAIL",
  OTHER = "OTHER",
}

/** Recruitment-specific candidate pipeline stage */
export enum CandidateStage {
  NEW = "new",
  SCREENING = "screening",
  SCHEDULED = "scheduled",
  OFFERED = "offered",
  JOINED = "joined",
  REJECTED = "rejected",
}

/** Employment status at time of application */
export enum EmploymentStatus {
  WORKING = "working",
  NOTICE = "notice",
  RELIEVED = "relieved",
}

/** Relocation availability */
export enum RelocationAvailability {
  YES = "yes",
  NO = "no",
  CONDITIONAL = "conditional",
}

@Entity({ name: "lead" })
export class lead extends BaseTable {
  @Column({ type: "varchar", length: 150, nullable: true })
  first_name: string;

  @Column({ type: "varchar", length: 150, nullable: true })
  last_name: string;

  @Column({ type: "varchar", length: 300, nullable: true })
  name: string;

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
  @Column({ type: "varchar", length: 50, default: LeadStatus.NEW })
  lead_status: string;

  @Index()
  @Column({ type: "varchar", length: 50, default: LeadSource.MANUAL })
  source: string;

  @Column({ type: "int", default: 50 })
  score: number; // 0 to 100 Lead Health / AI Score

  @Column({ type: "numeric", precision: 12, scale: 2, default: 0 })
  deal_value: number;

  @Column({ type: "varchar", length: 10, default: "INR" })
  currency: string;

  @Column({ type: "text", nullable: true })
  notes: string;

  @Column({ type: "json", nullable: true })
  tags: string[];

  @Column({ type: "jsonb", nullable: true })
  custom_fields: Record<string, any>;

  @Index()
  @Column({ type: "uuid", nullable: true })
  assigned_to_id: string;

  @Index()
  @Column({ type: "varchar", length: 100, default: "default" })
  tenant_id: string;

  @Column({ type: "timestamptz", nullable: true })
  last_contacted_at: Date;

  @Index()
  @Column({ type: "boolean", default: false })
  is_candidate: boolean;

  // ─── Recruitment-specific fields ─────────────────────────────────────────

  /** Total years of experience */
  @Column({ type: "numeric", precision: 5, scale: 1, nullable: true })
  total_experience: number;

  /** Relevant years of experience for the applied role */
  @Column({ type: "numeric", precision: 5, scale: 1, nullable: true })
  relevant_experience: number;

  /** Current employment status */
  @Column({ type: "varchar", length: 30, nullable: true })
  employment_status: string; // CandidateEmploymentStatus enum values

  /** Relieving / last working date (conditional on employment_status) */
  @Column({ type: "timestamptz", nullable: true })
  relieving_date: Date;

  /** Current / last drawn CTC (annual) */
  @Column({ type: "numeric", precision: 14, scale: 2, nullable: true })
  current_ctc: number;

  /** Expected CTC (annual) */
  @Column({ type: "numeric", precision: 14, scale: 2, nullable: true })
  expected_ctc: number;

  /** CTC basis: monthly or annual */
  @Column({ type: "varchar", length: 10, nullable: true, default: "annual" })
  ctc_basis: string;

  /** Relocation availability */
  @Column({ type: "varchar", length: 20, nullable: true })
  relocation: string; // RelocationAvailability enum values

  /** Candidate's preferred interview date/time (free text captured from chat) */
  @Column({ type: "varchar", length: 200, nullable: true })
  preferred_interview_slot: string;

  /** Resume / CV URL (S3 / Drive link or uploaded path) */
  @Column({ type: "text", nullable: true })
  resume_url: string;

  /** Candidate pipeline stage (independent from lead_status) */
  @Index()
  @Column({ type: "varchar", length: 30, nullable: true, default: CandidateStage.NEW })
  candidate_stage: string;

  /** Scheduled interview date */
  @Column({ type: "timestamptz", nullable: true })
  interview_date: Date;

  /** Google Meet or interview link */
  @Column({ type: "text", nullable: true })
  interview_link: string;

  /** Reminder sent flag for 1-day-before reminder */
  @Column({ type: "boolean", default: false })
  reminder_sent: boolean;

  /** Post-interview follow-up sent flag */
  @Column({ type: "boolean", default: false })
  followup_sent: boolean;
}
