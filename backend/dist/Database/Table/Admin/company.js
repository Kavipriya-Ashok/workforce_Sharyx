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
exports.company = void 0;
const AuditLog_decorators_1 = require("../../../Helper/AuditLog.decorators");
const typeorm_1 = require("typeorm");
const BaseTable_1 = require("../BaseTable");
const country_1 = require("./country");
const currency_1 = require("./currency");
let company = class company extends BaseTable_1.BaseTable {
};
exports.company = company;
__decorate([
    (0, AuditLog_decorators_1.AuditLogIdentity)(),
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], company.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], company.prototype, "address", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => country_1.country, { onDelete: "RESTRICT" }),
    (0, typeorm_1.JoinColumn)({ name: "country_id" }),
    __metadata("design:type", country_1.country)
], company.prototype, "country", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], company.prototype, "country_id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(type => currency_1.currency, { onDelete: "RESTRICT" }),
    (0, typeorm_1.JoinColumn)({ name: "currency_id" }),
    __metadata("design:type", currency_1.currency)
], company.prototype, "currency", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], company.prototype, "currency_id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], company.prototype, "postal_code", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], company.prototype, "email", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], company.prototype, "website", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], company.prototype, "uen_no", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], company.prototype, "bank_name", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], company.prototype, "bank_acct_no", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], company.prototype, "telephone_no", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], company.prototype, "fax_no", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], company.prototype, "invoice_footer", void 0);
exports.company = company = __decorate([
    (0, typeorm_1.Entity)()
], company);
//# sourceMappingURL=company.js.map