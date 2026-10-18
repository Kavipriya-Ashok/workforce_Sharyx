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
exports.user = void 0;
const AuditLog_decorators_1 = require("../../../Helper/AuditLog.decorators");
const typeorm_1 = require("typeorm");
const BaseTable_1 = require("../BaseTable");
const user_role_1 = require("./user_role");
let user = class user extends BaseTable_1.BaseTable {
};
exports.user = user;
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_role_1.user_role, { onDelete: "RESTRICT" }),
    (0, typeorm_1.JoinColumn)({ name: "user_role_id" }),
    __metadata("design:type", user_role_1.user_role)
], user.prototype, "user_role", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "uuid" }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], user.prototype, "user_role_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], user.prototype, "first_name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], user.prototype, "last_name", void 0);
__decorate([
    (0, AuditLog_decorators_1.AuditLogIdentity)(),
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], user.prototype, "email", void 0);
__decorate([
    (0, AuditLog_decorators_1.AuditLogTableRemoveColumns)(),
    (0, typeorm_1.Column)({ type: "text" }),
    __metadata("design:type", String)
], user.prototype, "password", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], user.prototype, "mobile", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "bigint", nullable: true }),
    __metadata("design:type", Number)
], user.prototype, "reset_otp", void 0);
exports.user = user = __decorate([
    (0, typeorm_1.Entity)()
], user);
//# sourceMappingURL=user.js.map