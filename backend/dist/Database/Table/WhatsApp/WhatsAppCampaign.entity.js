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
exports.WhatsAppCampaign = void 0;
const typeorm_1 = require("typeorm");
const BaseTable_1 = require("../BaseTable");
let WhatsAppCampaign = class WhatsAppCampaign extends BaseTable_1.BaseTable {
};
exports.WhatsAppCampaign = WhatsAppCampaign;
__decorate([
    (0, typeorm_1.Column)({ default: "default" }),
    __metadata("design:type", String)
], WhatsAppCampaign.prototype, "tenant_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 150 }),
    __metadata("design:type", String)
], WhatsAppCampaign.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], WhatsAppCampaign.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 100, default: "after_call_ends" }),
    __metadata("design:type", String)
], WhatsAppCampaign.prototype, "trigger_event", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 100 }),
    __metadata("design:type", String)
], WhatsAppCampaign.prototype, "template_name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "int", default: 0 }),
    __metadata("design:type", Number)
], WhatsAppCampaign.prototype, "delay_minutes", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "boolean", default: true }),
    __metadata("design:type", Boolean)
], WhatsAppCampaign.prototype, "is_active", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "int", default: 0 }),
    __metadata("design:type", Number)
], WhatsAppCampaign.prototype, "total_recipients", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "int", default: 0 }),
    __metadata("design:type", Number)
], WhatsAppCampaign.prototype, "sent_count", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "int", default: 0 }),
    __metadata("design:type", Number)
], WhatsAppCampaign.prototype, "delivered_count", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "int", default: 0 }),
    __metadata("design:type", Number)
], WhatsAppCampaign.prototype, "read_count", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 20, default: "active" }),
    __metadata("design:type", String)
], WhatsAppCampaign.prototype, "campaign_status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "timestamp with time zone", nullable: true }),
    __metadata("design:type", Date)
], WhatsAppCampaign.prototype, "scheduled_at", void 0);
exports.WhatsAppCampaign = WhatsAppCampaign = __decorate([
    (0, typeorm_1.Entity)("wa_campaign")
], WhatsAppCampaign);
//# sourceMappingURL=WhatsAppCampaign.entity.js.map