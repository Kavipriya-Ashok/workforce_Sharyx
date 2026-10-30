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
exports.CrmDeal = void 0;
const typeorm_1 = require("typeorm");
const BaseTable_1 = require("../BaseTable");
let CrmDeal = class CrmDeal extends BaseTable_1.BaseTable {
};
exports.CrmDeal = CrmDeal;
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ type: "varchar", length: 100, default: "default" }),
    __metadata("design:type", String)
], CrmDeal.prototype, "tenant_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 250 }),
    __metadata("design:type", String)
], CrmDeal.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ type: "uuid", nullable: true }),
    __metadata("design:type", String)
], CrmDeal.prototype, "lead_id", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ type: "uuid", nullable: true }),
    __metadata("design:type", String)
], CrmDeal.prototype, "customer_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "numeric", precision: 12, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], CrmDeal.prototype, "deal_value", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 10, default: "INR" }),
    __metadata("design:type", String)
], CrmDeal.prototype, "currency", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ type: "varchar", length: 50, default: "Won" }),
    __metadata("design:type", String)
], CrmDeal.prototype, "stage", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 100, default: "Standard Pipeline" }),
    __metadata("design:type", String)
], CrmDeal.prototype, "pipeline", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "int", default: 100 }),
    __metadata("design:type", Number)
], CrmDeal.prototype, "probability", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "timestamptz", nullable: true }),
    __metadata("design:type", Date)
], CrmDeal.prototype, "expected_close_date", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "timestamptz", nullable: true }),
    __metadata("design:type", Date)
], CrmDeal.prototype, "closed_at", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], CrmDeal.prototype, "notes", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "jsonb", nullable: true }),
    __metadata("design:type", Array)
], CrmDeal.prototype, "tags", void 0);
exports.CrmDeal = CrmDeal = __decorate([
    (0, typeorm_1.Entity)({ name: "crm_deal" })
], CrmDeal);
//# sourceMappingURL=crm_deal.js.map