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
exports.EmailAccountConfig = void 0;
const typeorm_1 = require("typeorm");
const BaseTable_1 = require("../BaseTable");
let EmailAccountConfig = class EmailAccountConfig extends BaseTable_1.BaseTable {
};
exports.EmailAccountConfig = EmailAccountConfig;
__decorate([
    (0, typeorm_1.Column)({ default: "default" }),
    __metadata("design:type", String)
], EmailAccountConfig.prototype, "tenant_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 50, default: "smtp" }),
    __metadata("design:type", String)
], EmailAccountConfig.prototype, "provider", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 150, nullable: true }),
    __metadata("design:type", String)
], EmailAccountConfig.prototype, "display_name", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 150 }),
    __metadata("design:type", String)
], EmailAccountConfig.prototype, "email_address", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], EmailAccountConfig.prototype, "client_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], EmailAccountConfig.prototype, "client_secret", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], EmailAccountConfig.prototype, "refresh_token", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], EmailAccountConfig.prototype, "access_token", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "timestamp", nullable: true }),
    __metadata("design:type", Date)
], EmailAccountConfig.prototype, "token_expires_at", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 150, nullable: true }),
    __metadata("design:type", String)
], EmailAccountConfig.prototype, "smtp_host", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "int", default: 587, nullable: true }),
    __metadata("design:type", Number)
], EmailAccountConfig.prototype, "smtp_port", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 150, nullable: true }),
    __metadata("design:type", String)
], EmailAccountConfig.prototype, "smtp_user", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], EmailAccountConfig.prototype, "smtp_password", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 150, nullable: true }),
    __metadata("design:type", String)
], EmailAccountConfig.prototype, "imap_host", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "int", default: 993, nullable: true }),
    __metadata("design:type", Number)
], EmailAccountConfig.prototype, "imap_port", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "boolean", default: true }),
    __metadata("design:type", Boolean)
], EmailAccountConfig.prototype, "use_ssl", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "boolean", default: true }),
    __metadata("design:type", Boolean)
], EmailAccountConfig.prototype, "is_active", void 0);
exports.EmailAccountConfig = EmailAccountConfig = __decorate([
    (0, typeorm_1.Entity)("email_account_config")
], EmailAccountConfig);
//# sourceMappingURL=EmailAccountConfig.entity.js.map