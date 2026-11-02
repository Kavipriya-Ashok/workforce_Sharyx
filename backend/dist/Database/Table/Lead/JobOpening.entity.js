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
exports.JobOpening = void 0;
const typeorm_1 = require("typeorm");
let JobOpening = class JobOpening extends typeorm_1.BaseEntity {
};
exports.JobOpening = JobOpening;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid"),
    __metadata("design:type", String)
], JobOpening.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ type: "varchar", length: 100, default: "default" }),
    __metadata("design:type", String)
], JobOpening.prototype, "tenant_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 200 }),
    __metadata("design:type", String)
], JobOpening.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "jsonb", default: () => "'[]'::jsonb" }),
    __metadata("design:type", Array)
], JobOpening.prototype, "skills", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "numeric", precision: 4, scale: 1, default: 0 }),
    __metadata("design:type", Number)
], JobOpening.prototype, "min_experience", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "jsonb", default: () => "'[]'::jsonb" }),
    __metadata("design:type", Array)
], JobOpening.prototype, "locations", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 50, default: "Hybrid" }),
    __metadata("design:type", String)
], JobOpening.prototype, "work_mode", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "boolean", default: true }),
    __metadata("design:type", Boolean)
], JobOpening.prototype, "relocation_supported", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ type: "varchar", length: 30, default: "open" }),
    __metadata("design:type", String)
], JobOpening.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 100, nullable: true }),
    __metadata("design:type", String)
], JobOpening.prototype, "updated_by", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ type: "timestamptz" }),
    __metadata("design:type", Date)
], JobOpening.prototype, "created_at", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ type: "timestamptz" }),
    __metadata("design:type", Date)
], JobOpening.prototype, "updated_at", void 0);
exports.JobOpening = JobOpening = __decorate([
    (0, typeorm_1.Entity)("job_openings")
], JobOpening);
//# sourceMappingURL=JobOpening.entity.js.map