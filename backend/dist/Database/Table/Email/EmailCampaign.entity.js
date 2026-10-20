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
exports.EmailCampaign = void 0;
const typeorm_1 = require("typeorm");
const BaseTable_1 = require("../BaseTable");
let EmailCampaign = class EmailCampaign extends BaseTable_1.BaseTable {
};
exports.EmailCampaign = EmailCampaign;
__decorate([
    (0, typeorm_1.Column)({ default: "default" }),
    __metadata("design:type", String)
], EmailCampaign.prototype, "tenant_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 150 }),
    __metadata("design:type", String)
], EmailCampaign.prototype, "campaign_name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text" }),
    __metadata("design:type", String)
], EmailCampaign.prototype, "subject", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text" }),
    __metadata("design:type", String)
], EmailCampaign.prototype, "html_template", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "int", default: 0 }),
    __metadata("design:type", Number)
], EmailCampaign.prototype, "recipients_count", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "int", default: 0 }),
    __metadata("design:type", Number)
], EmailCampaign.prototype, "sent_count", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "int", default: 0 }),
    __metadata("design:type", Number)
], EmailCampaign.prototype, "opened_count", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 20, default: "draft" }),
    __metadata("design:type", String)
], EmailCampaign.prototype, "campaign_status", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 50, default: "after_reply" }),
    __metadata("design:type", String)
], EmailCampaign.prototype, "trigger_event", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "boolean", default: true }),
    __metadata("design:type", Boolean)
], EmailCampaign.prototype, "is_active", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "int", default: 0 }),
    __metadata("design:type", Number)
], EmailCampaign.prototype, "delay_seconds", void 0);
exports.EmailCampaign = EmailCampaign = __decorate([
    (0, typeorm_1.Entity)("email_campaign")
], EmailCampaign);
//# sourceMappingURL=EmailCampaign.entity.js.map