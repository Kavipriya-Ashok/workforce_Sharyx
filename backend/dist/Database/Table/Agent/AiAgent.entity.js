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
exports.AiAgent = void 0;
const typeorm_1 = require("typeorm");
const BaseTable_1 = require("../BaseTable");
let AiAgent = class AiAgent extends BaseTable_1.BaseTable {
};
exports.AiAgent = AiAgent;
__decorate([
    (0, typeorm_1.Column)({ default: "default" }),
    __metadata("design:type", String)
], AiAgent.prototype, "tenant_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 40 }),
    __metadata("design:type", String)
], AiAgent.prototype, "agent_key", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 100 }),
    __metadata("design:type", String)
], AiAgent.prototype, "display_name", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 10, nullable: true }),
    __metadata("design:type", String)
], AiAgent.prototype, "emoji", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], AiAgent.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text" }),
    __metadata("design:type", String)
], AiAgent.prototype, "persona_prompt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], AiAgent.prototype, "knowledge", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "jsonb", default: () => "'[]'" }),
    __metadata("design:type", Array)
], AiAgent.prototype, "allowed_tools", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "jsonb", default: () => "'[]'" }),
    __metadata("design:type", Array)
], AiAgent.prototype, "handoff_targets", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "jsonb", default: () => `'["whatsapp","email"]'` }),
    __metadata("design:type", Array)
], AiAgent.prototype, "channels", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "boolean", default: true }),
    __metadata("design:type", Boolean)
], AiAgent.prototype, "announce_handoff", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], AiAgent.prototype, "handoff_message", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], AiAgent.prototype, "fallback_message", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 40, nullable: true, default: "openai" }),
    __metadata("design:type", String)
], AiAgent.prototype, "llm_provider", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 60, nullable: true }),
    __metadata("design:type", String)
], AiAgent.prototype, "llm_model", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "float", default: 0.4 }),
    __metadata("design:type", Number)
], AiAgent.prototype, "temperature", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "int", default: 0 }),
    __metadata("design:type", Number)
], AiAgent.prototype, "sort_order", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "boolean", default: true }),
    __metadata("design:type", Boolean)
], AiAgent.prototype, "is_active", void 0);
exports.AiAgent = AiAgent = __decorate([
    (0, typeorm_1.Entity)("ai_agent")
], AiAgent);
//# sourceMappingURL=AiAgent.entity.js.map