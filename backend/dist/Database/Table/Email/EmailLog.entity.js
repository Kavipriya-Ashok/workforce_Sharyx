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
exports.EmailLog = void 0;
const typeorm_1 = require("typeorm");
const BaseTable_1 = require("../BaseTable");
let EmailLog = class EmailLog extends BaseTable_1.BaseTable {
};
exports.EmailLog = EmailLog;
__decorate([
    (0, typeorm_1.Column)({ default: "default" }),
    __metadata("design:type", String)
], EmailLog.prototype, "tenant_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "uuid", nullable: true }),
    __metadata("design:type", String)
], EmailLog.prototype, "lead_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 150 }),
    __metadata("design:type", String)
], EmailLog.prototype, "from_email", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 150 }),
    __metadata("design:type", String)
], EmailLog.prototype, "to_email", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], EmailLog.prototype, "subject", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], EmailLog.prototype, "body_text", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], EmailLog.prototype, "body_html", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 15, default: "outbound" }),
    __metadata("design:type", String)
], EmailLog.prototype, "direction", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 20, default: "sent" }),
    __metadata("design:type", String)
], EmailLog.prototype, "delivery_status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "boolean", default: false }),
    __metadata("design:type", Boolean)
], EmailLog.prototype, "is_ai_drafted", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 250, nullable: true }),
    __metadata("design:type", String)
], EmailLog.prototype, "message_id", void 0);
exports.EmailLog = EmailLog = __decorate([
    (0, typeorm_1.Entity)("email_log")
], EmailLog);
//# sourceMappingURL=EmailLog.entity.js.map