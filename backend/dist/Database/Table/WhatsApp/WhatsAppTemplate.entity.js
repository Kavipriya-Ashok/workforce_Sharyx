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
exports.WhatsAppTemplate = void 0;
const typeorm_1 = require("typeorm");
const BaseTable_1 = require("../BaseTable");
let WhatsAppTemplate = class WhatsAppTemplate extends BaseTable_1.BaseTable {
};
exports.WhatsAppTemplate = WhatsAppTemplate;
__decorate([
    (0, typeorm_1.Column)({ default: "default" }),
    __metadata("design:type", String)
], WhatsAppTemplate.prototype, "tenant_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 100 }),
    __metadata("design:type", String)
], WhatsAppTemplate.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 50, default: "UTILITY" }),
    __metadata("design:type", String)
], WhatsAppTemplate.prototype, "category", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 20, default: "en_US" }),
    __metadata("design:type", String)
], WhatsAppTemplate.prototype, "language", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 255, nullable: true }),
    __metadata("design:type", String)
], WhatsAppTemplate.prototype, "header_text", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text" }),
    __metadata("design:type", String)
], WhatsAppTemplate.prototype, "body_text", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 255, nullable: true }),
    __metadata("design:type", String)
], WhatsAppTemplate.prototype, "footer_text", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "jsonb", nullable: true }),
    __metadata("design:type", Array)
], WhatsAppTemplate.prototype, "buttons", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 50, default: "APPROVED" }),
    __metadata("design:type", String)
], WhatsAppTemplate.prototype, "approval_status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "boolean", default: true }),
    __metadata("design:type", Boolean)
], WhatsAppTemplate.prototype, "is_active", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 200, default: "ALL" }),
    __metadata("design:type", String)
], WhatsAppTemplate.prototype, "outcome_filter", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "boolean", default: false }),
    __metadata("design:type", Boolean)
], WhatsAppTemplate.prototype, "attach_pdf", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 100, nullable: true }),
    __metadata("design:type", String)
], WhatsAppTemplate.prototype, "pdf_template_type", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 255, nullable: true }),
    __metadata("design:type", String)
], WhatsAppTemplate.prototype, "pdf_title", void 0);
exports.WhatsAppTemplate = WhatsAppTemplate = __decorate([
    (0, typeorm_1.Entity)("wa_template")
], WhatsAppTemplate);
//# sourceMappingURL=WhatsAppTemplate.entity.js.map