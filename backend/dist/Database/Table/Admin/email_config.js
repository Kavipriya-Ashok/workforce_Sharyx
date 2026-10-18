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
exports.email_config = void 0;
const AuditLog_decorators_1 = require("../../../Helper/AuditLog.decorators");
const typeorm_1 = require("typeorm");
const BaseTable_1 = require("../BaseTable");
let email_config = class email_config extends BaseTable_1.BaseTable {
};
exports.email_config = email_config;
__decorate([
    (0, AuditLog_decorators_1.AuditLogIdentity)(),
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], email_config.prototype, "email_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], email_config.prototype, "password", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, default: "BoilerPlate" }),
    __metadata("design:type", String)
], email_config.prototype, "mailer_name", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, default: "smtp.gmail.com" }),
    __metadata("design:type", String)
], email_config.prototype, "host", void 0);
exports.email_config = email_config = __decorate([
    (0, typeorm_1.Entity)()
], email_config);
//# sourceMappingURL=email_config.js.map