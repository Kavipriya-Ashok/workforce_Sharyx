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
exports.LeadConversionRule = exports.WorkflowTriggerEvent = void 0;
const typeorm_1 = require("typeorm");
const BaseTable_1 = require("../BaseTable");
var WorkflowTriggerEvent;
(function (WorkflowTriggerEvent) {
    WorkflowTriggerEvent["CALL_OUTCOME"] = "on_call_outcome";
    WorkflowTriggerEvent["STAGE_CHANGE"] = "on_stage_change";
})(WorkflowTriggerEvent || (exports.WorkflowTriggerEvent = WorkflowTriggerEvent = {}));
let LeadConversionRule = class LeadConversionRule extends BaseTable_1.BaseTable {
};
exports.LeadConversionRule = LeadConversionRule;
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ type: "varchar", length: 100, default: "default" }),
    __metadata("design:type", String)
], LeadConversionRule.prototype, "tenant_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 200 }),
    __metadata("design:type", String)
], LeadConversionRule.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], LeadConversionRule.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 50, default: "workflow" }),
    __metadata("design:type", String)
], LeadConversionRule.prototype, "rule_type", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 50, default: WorkflowTriggerEvent.CALL_OUTCOME }),
    __metadata("design:type", String)
], LeadConversionRule.prototype, "trigger_event", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 200, default: "Appointment Scheduled" }),
    __metadata("design:type", String)
], LeadConversionRule.prototype, "outcome_trigger", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 30, default: "contains" }),
    __metadata("design:type", String)
], LeadConversionRule.prototype, "match_type", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "int", default: 10 }),
    __metadata("design:type", Number)
], LeadConversionRule.prototype, "min_call_duration_seconds", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "boolean", default: false }),
    __metadata("design:type", Boolean)
], LeadConversionRule.prototype, "require_goal_achieved", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "int", default: 15 }),
    __metadata("design:type", Number)
], LeadConversionRule.prototype, "priority", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "boolean", default: true }),
    __metadata("design:type", Boolean)
], LeadConversionRule.prototype, "is_active", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 50, default: "WON" }),
    __metadata("design:type", String)
], LeadConversionRule.prototype, "action_move_lead_stage", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "boolean", default: true }),
    __metadata("design:type", Boolean)
], LeadConversionRule.prototype, "action_create_crm_deal", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 50, default: "Won" }),
    __metadata("design:type", String)
], LeadConversionRule.prototype, "action_crm_deal_stage", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "numeric", precision: 12, scale: 2, default: 5000.0 }),
    __metadata("design:type", Number)
], LeadConversionRule.prototype, "action_deal_value", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "boolean", default: true }),
    __metadata("design:type", Boolean)
], LeadConversionRule.prototype, "action_convert_to_customer", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 50, default: "ACTIVE" }),
    __metadata("design:type", String)
], LeadConversionRule.prototype, "target_customer_status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 50, default: "PROFESSIONAL" }),
    __metadata("design:type", String)
], LeadConversionRule.prototype, "target_customer_tier", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "boolean", default: true }),
    __metadata("design:type", Boolean)
], LeadConversionRule.prototype, "action_send_email", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 50, default: "lead_converted" }),
    __metadata("design:type", String)
], LeadConversionRule.prototype, "action_email_trigger_type", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "boolean", default: true }),
    __metadata("design:type", Boolean)
], LeadConversionRule.prototype, "action_send_whatsapp", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 50, default: "deal_won" }),
    __metadata("design:type", String)
], LeadConversionRule.prototype, "action_whatsapp_trigger", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "jsonb", nullable: true }),
    __metadata("design:type", Array)
], LeadConversionRule.prototype, "auto_tags", void 0);
exports.LeadConversionRule = LeadConversionRule = __decorate([
    (0, typeorm_1.Entity)({ name: "lead_conversion_rule" })
], LeadConversionRule);
//# sourceMappingURL=lead_conversion_rule.js.map