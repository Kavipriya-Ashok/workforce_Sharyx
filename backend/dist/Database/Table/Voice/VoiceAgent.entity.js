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
exports.VoiceAgent = void 0;
const typeorm_1 = require("typeorm");
const BaseTable_1 = require("../BaseTable");
let VoiceAgent = class VoiceAgent extends BaseTable_1.BaseTable {
};
exports.VoiceAgent = VoiceAgent;
__decorate([
    (0, typeorm_1.Column)({ default: "default" }),
    __metadata("design:type", String)
], VoiceAgent.prototype, "tenant_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 100 }),
    __metadata("design:type", String)
], VoiceAgent.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 30, default: "vapi" }),
    __metadata("design:type", String)
], VoiceAgent.prototype, "provider", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 150, nullable: true }),
    __metadata("design:type", String)
], VoiceAgent.prototype, "remote_agent_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text" }),
    __metadata("design:type", String)
], VoiceAgent.prototype, "system_prompt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], VoiceAgent.prototype, "first_message", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 100, default: "jennifer" }),
    __metadata("design:type", String)
], VoiceAgent.prototype, "voice_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 50, default: "elevenlabs" }),
    __metadata("design:type", String)
], VoiceAgent.prototype, "voice_provider", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 50, default: "gpt-4o-mini" }),
    __metadata("design:type", String)
], VoiceAgent.prototype, "llm_model", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "float", default: 0.4 }),
    __metadata("design:type", Number)
], VoiceAgent.prototype, "temperature", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 10, default: "en" }),
    __metadata("design:type", String)
], VoiceAgent.prototype, "language", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "jsonb", nullable: true }),
    __metadata("design:type", Array)
], VoiceAgent.prototype, "allowed_tools", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 150, nullable: true }),
    __metadata("design:type", String)
], VoiceAgent.prototype, "transfer_agent_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 50, nullable: true }),
    __metadata("design:type", String)
], VoiceAgent.prototype, "transfer_phone_number", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "jsonb", nullable: true }),
    __metadata("design:type", Object)
], VoiceAgent.prototype, "raw_provider_response", void 0);
exports.VoiceAgent = VoiceAgent = __decorate([
    (0, typeorm_1.Entity)("voice_agent")
], VoiceAgent);
//# sourceMappingURL=VoiceAgent.entity.js.map