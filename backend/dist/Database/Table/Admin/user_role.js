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
exports.user_role = void 0;
const BaseTable_1 = require("../BaseTable");
const typeorm_1 = require("typeorm");
const AuditLog_decorators_1 = require("../../../Helper/AuditLog.decorators");
let user_role = class user_role extends BaseTable_1.BaseTable {
};
exports.user_role = user_role;
__decorate([
    (0, AuditLog_decorators_1.AuditLogIdentity)(),
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], user_role.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], user_role.prototype, "code", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], user_role.prototype, "landing_page", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "json", nullable: true }),
    __metadata("design:type", Object)
], user_role.prototype, "permission", void 0);
exports.user_role = user_role = __decorate([
    (0, typeorm_1.Entity)()
], user_role);
//# sourceMappingURL=user_role.js.map