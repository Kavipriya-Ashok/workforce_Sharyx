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
exports.ConversationAgentState = void 0;
const typeorm_1 = require("typeorm");
const BaseTable_1 = require("../BaseTable");
let ConversationAgentState = class ConversationAgentState extends BaseTable_1.BaseTable {
};
exports.ConversationAgentState = ConversationAgentState;
__decorate([
    (0, typeorm_1.Column)({ default: "default" }),
    __metadata("design:type", String)
], ConversationAgentState.prototype, "tenant_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 20 }),
    __metadata("design:type", String)
], ConversationAgentState.prototype, "channel", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 200 }),
    __metadata("design:type", String)
], ConversationAgentState.prototype, "conversation_ref", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 30, nullable: true }),
    __metadata("design:type", String)
], ConversationAgentState.prototype, "customer_phone", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 200, nullable: true }),
    __metadata("design:type", String)
], ConversationAgentState.prototype, "customer_email", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 150, nullable: true }),
    __metadata("design:type", String)
], ConversationAgentState.prototype, "customer_name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "uuid", nullable: true }),
    __metadata("design:type", String)
], ConversationAgentState.prototype, "lead_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 40, default: "receptionist" }),
    __metadata("design:type", String)
], ConversationAgentState.prototype, "active_agent", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 40, nullable: true }),
    __metadata("design:type", String)
], ConversationAgentState.prototype, "previous_agent", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "int", default: 0 }),
    __metadata("design:type", Number)
], ConversationAgentState.prototype, "handoff_count", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], ConversationAgentState.prototype, "handoff_brief", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "jsonb", default: () => "'{}'" }),
    __metadata("design:type", Object)
], ConversationAgentState.prototype, "collected_slots", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "boolean", default: false }),
    __metadata("design:type", Boolean)
], ConversationAgentState.prototype, "human_takeover", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "int", default: 0 }),
    __metadata("design:type", Number)
], ConversationAgentState.prototype, "turn_count", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "timestamp with time zone", nullable: true }),
    __metadata("design:type", Date)
], ConversationAgentState.prototype, "last_activity_at", void 0);
exports.ConversationAgentState = ConversationAgentState = __decorate([
    (0, typeorm_1.Entity)("conversation_agent_state"),
    (0, typeorm_1.Index)(["tenant_id", "channel", "conversation_ref"])
], ConversationAgentState);
//# sourceMappingURL=ConversationAgentState.entity.js.map