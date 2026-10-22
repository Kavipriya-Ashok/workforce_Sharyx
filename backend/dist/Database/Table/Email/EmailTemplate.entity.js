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
exports.EmailTemplate = void 0;
const typeorm_1 = require("typeorm");
const BaseTable_1 = require("../BaseTable");
let EmailTemplate = class EmailTemplate extends BaseTable_1.BaseTable {
};
exports.EmailTemplate = EmailTemplate;
__decorate([
    (0, typeorm_1.Column)({ default: "default" }),
    __metadata("design:type", String)
], EmailTemplate.prototype, "tenant_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 120 }),
    __metadata("design:type", String)
], EmailTemplate.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 80, default: "General" }),
    __metadata("design:type", String)
], EmailTemplate.prototype, "category", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 255 }),
    __metadata("design:type", String)
], EmailTemplate.prototype, "subject", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text" }),
    __metadata("design:type", String)
], EmailTemplate.prototype, "body_html", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], EmailTemplate.prototype, "body_text", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], EmailTemplate.prototype, "preview_text", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "jsonb", nullable: true }),
    __metadata("design:type", Array)
], EmailTemplate.prototype, "variables", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "boolean", default: true }),
    __metadata("design:type", Boolean)
], EmailTemplate.prototype, "is_active", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "boolean", default: false }),
    __metadata("design:type", Boolean)
], EmailTemplate.prototype, "attach_pdf", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 100, nullable: true }),
    __metadata("design:type", String)
], EmailTemplate.prototype, "pdf_template_type", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 255, nullable: true }),
    __metadata("design:type", String)
], EmailTemplate.prototype, "pdf_title", void 0);
exports.EmailTemplate = EmailTemplate = __decorate([
    (0, typeorm_1.Entity)("email_template")
], EmailTemplate);
//# sourceMappingURL=EmailTemplate.entity.js.map