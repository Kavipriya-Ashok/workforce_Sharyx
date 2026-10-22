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
exports.VoiceCallLog = void 0;
const typeorm_1 = require("typeorm");
const BaseTable_1 = require("../BaseTable");
let VoiceCallLog = class VoiceCallLog extends BaseTable_1.BaseTable {
};
exports.VoiceCallLog = VoiceCallLog;
__decorate([
    (0, typeorm_1.Column)({ default: "default" }),
    __metadata("design:type", String)
], VoiceCallLog.prototype, "tenant_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "uuid", nullable: true }),
    __metadata("design:type", String)
], VoiceCallLog.prototype, "agent_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 100, nullable: true }),
    __metadata("design:type", String)
], VoiceCallLog.prototype, "agent_name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 30, default: "vapi" }),
    __metadata("design:type", String)
], VoiceCallLog.prototype, "provider", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 150, nullable: true }),
    __metadata("design:type", String)
], VoiceCallLog.prototype, "provider_call_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 40 }),
    __metadata("design:type", String)
], VoiceCallLog.prototype, "customer_phone", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 150, nullable: true }),
    __metadata("design:type", String)
], VoiceCallLog.prototype, "customer_name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "uuid", nullable: true }),
    __metadata("design:type", String)
], VoiceCallLog.prototype, "lead_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 20, default: "outbound" }),
    __metadata("design:type", String)
], VoiceCallLog.prototype, "direction", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 30, default: "initiated" }),
    __metadata("design:type", String)
], VoiceCallLog.prototype, "call_status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "int", default: 0 }),
    __metadata("design:type", Number)
], VoiceCallLog.prototype, "duration_seconds", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], VoiceCallLog.prototype, "transcript", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], VoiceCallLog.prototype, "recording_url", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], VoiceCallLog.prototype, "summary", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 100, nullable: true }),
    __metadata("design:type", String)
], VoiceCallLog.prototype, "call_outcome", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "jsonb", nullable: true }),
    __metadata("design:type", Object)
], VoiceCallLog.prototype, "extracted_slots", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "jsonb", nullable: true }),
    __metadata("design:type", Object)
], VoiceCallLog.prototype, "raw_webhook_payload", void 0);
exports.VoiceCallLog = VoiceCallLog = __decorate([
    (0, typeorm_1.Entity)("voice_call_log")
], VoiceCallLog);
//# sourceMappingURL=VoiceCallLog.entity.js.map