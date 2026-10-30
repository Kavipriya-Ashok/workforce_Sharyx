"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.lead = exports.RelocationAvailability = exports.EmploymentStatus = exports.CandidateStage = exports.LeadSource = exports.LeadStatus = void 0;
const typeorm_1 = require("typeorm");
const BaseTable_1 = require("../BaseTable");
var LeadStatus;
(function (LeadStatus) {
    LeadStatus["NEW"] = "NEW";
    LeadStatus["CONTACTED"] = "CONTACTED";
    LeadStatus["QUALIFIED"] = "QUALIFIED";
    LeadStatus["PROPOSAL"] = "PROPOSAL";
    LeadStatus["WON"] = "WON";
    LeadStatus["LOST"] = "LOST";
    LeadStatus["UNQUALIFIED"] = "UNQUALIFIED";
})(LeadStatus || (exports.LeadStatus = LeadStatus = {}));
var LeadSource;
(function (LeadSource) {
    LeadSource["MANUAL"] = "MANUAL";
    LeadSource["CSV_IMPORT"] = "CSV_IMPORT";
    LeadSource["WEBHOOK"] = "WEBHOOK";
    LeadSource["FORM"] = "FORM";
    LeadSource["ZAPIER"] = "ZAPIER";
    LeadSource["FACEBOOK"] = "FACEBOOK";
    LeadSource["AI_AGENT"] = "AI_AGENT";
    LeadSource["INBOUND_CALL"] = "INBOUND_CALL";
    LeadSource["WHATSAPP"] = "WHATSAPP";
    LeadSource["EMAIL"] = "EMAIL";
    LeadSource["OTHER"] = "OTHER";
})(LeadSource || (exports.LeadSource = LeadSource = {}));
var CandidateStage;
(function (CandidateStage) {
    CandidateStage["NEW"] = "new";
    CandidateStage["SCREENING"] = "screening";
    CandidateStage["SCHEDULED"] = "scheduled";
    CandidateStage["OFFERED"] = "offered";
    CandidateStage["JOINED"] = "joined";
    CandidateStage["REJECTED"] = "rejected";
})(CandidateStage || (exports.CandidateStage = CandidateStage = {}));
var EmploymentStatus;
(function (EmploymentStatus) {
    EmploymentStatus["WORKING"] = "working";
    EmploymentStatus["NOTICE"] = "notice";
    EmploymentStatus["RELIEVED"] = "relieved";
})(EmploymentStatus || (exports.EmploymentStatus = EmploymentStatus = {}));
var RelocationAvailability;
(function (RelocationAvailability) {
    RelocationAvailability["YES"] = "yes";
    RelocationAvailability["NO"] = "no";
    RelocationAvailability["CONDITIONAL"] = "conditional";
})(RelocationAvailability || (exports.RelocationAvailability = RelocationAvailability = {}));
let lead = class lead extends BaseTable_1.BaseTable {
};
exports.lead = lead;
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 150, nullable: true }),
    __metadata("design:type", String)
], lead.prototype, "first_name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 150, nullable: true }),
    __metadata("design:type", String)
], lead.prototype, "last_name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 300, nullable: true }),
    __metadata("design:type", String)
], lead.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ type: "varchar", length: 255, nullable: true }),
    __metadata("design:type", String)
], lead.prototype, "email", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ type: "varchar", length: 50, nullable: true }),
    __metadata("design:type", String)
], lead.prototype, "phone", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 200, nullable: true }),
    __metadata("design:type", String)
], lead.prototype, "company_name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 150, nullable: true }),
    __metadata("design:type", String)
], lead.prototype, "job_title", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ type: "varchar", length: 50, default: LeadStatus.NEW }),
    __metadata("design:type", String)
], lead.prototype, "lead_status", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ type: "varchar", length: 50, default: LeadSource.MANUAL }),
    __metadata("design:type", String)
], lead.prototype, "source", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "int", default: 50 }),
    __metadata("design:type", Number)
], lead.prototype, "score", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "numeric", precision: 12, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], lead.prototype, "deal_value", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 10, default: "INR" }),
    __metadata("design:type", String)
], lead.prototype, "currency", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], lead.prototype, "notes", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "json", nullable: true }),
    __metadata("design:type", Array)
], lead.prototype, "tags", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "jsonb", nullable: true }),
    __metadata("design:type", Object)
], lead.prototype, "custom_fields", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ type: "uuid", nullable: true }),
    __metadata("design:type", String)
], lead.prototype, "assigned_to_id", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ type: "varchar", length: 100, default: "default" }),
    __metadata("design:type", String)
], lead.prototype, "tenant_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "timestamptz", nullable: true }),
    __metadata("design:type", Date)
], lead.prototype, "last_contacted_at", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ type: "boolean", default: false }),
    __metadata("design:type", Boolean)
], lead.prototype, "is_candidate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "numeric", precision: 5, scale: 1, nullable: true }),
    __metadata("design:type", Number)
], lead.prototype, "total_experience", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "numeric", precision: 5, scale: 1, nullable: true }),
    __metadata("design:type", Number)
], lead.prototype, "relevant_experience", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 30, nullable: true }),
    __metadata("design:type", String)
], lead.prototype, "employment_status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "timestamptz", nullable: true }),
    __metadata("design:type", Date)
], lead.prototype, "relieving_date", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "numeric", precision: 14, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], lead.prototype, "current_ctc", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "numeric", precision: 14, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], lead.prototype, "expected_ctc", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 10, nullable: true, default: "annual" }),
    __metadata("design:type", String)
], lead.prototype, "ctc_basis", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 20, nullable: true }),
    __metadata("design:type", String)
], lead.prototype, "relocation", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 200, nullable: true }),
    __metadata("design:type", String)
], lead.prototype, "preferred_interview_slot", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], lead.prototype, "resume_url", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ type: "varchar", length: 30, nullable: true, default: CandidateStage.NEW }),
    __metadata("design:type", String)
], lead.prototype, "candidate_stage", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "timestamptz", nullable: true }),
    __metadata("design:type", Date)
], lead.prototype, "interview_date", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], lead.prototype, "interview_link", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "boolean", default: false }),
    __metadata("design:type", Boolean)
], lead.prototype, "reminder_sent", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "boolean", default: false }),
    __metadata("design:type", Boolean)
], lead.prototype, "followup_sent", void 0);
exports.lead = lead = __decorate([
    (0, typeorm_1.Entity)({ name: "lead" })
], lead);
//# sourceMappingURL=lead.js.map