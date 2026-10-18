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
exports.EmailAIConfig = void 0;
const typeorm_1 = require("typeorm");
const BaseTable_1 = require("../BaseTable");
let EmailAIConfig = class EmailAIConfig extends BaseTable_1.BaseTable {
};
exports.EmailAIConfig = EmailAIConfig;
__decorate([
    (0, typeorm_1.Column)({ default: "default" }),
    __metadata("design:type", String)
], EmailAIConfig.prototype, "tenant_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "boolean", default: true }),
    __metadata("design:type", Boolean)
], EmailAIConfig.prototype, "auto_reply_enabled", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], EmailAIConfig.prototype, "system_prompt", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 50, default: "professional" }),
    __metadata("design:type", String)
], EmailAIConfig.prototype, "tone", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 50, default: "openai" }),
    __metadata("design:type", String)
], EmailAIConfig.prototype, "llm_provider", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 50, default: "gpt-4o-mini" }),
    __metadata("design:type", String)
], EmailAIConfig.prototype, "llm_model", void 0);
exports.EmailAIConfig = EmailAIConfig = __decorate([
    (0, typeorm_1.Entity)("email_ai_config")
], EmailAIConfig);
//# sourceMappingURL=EmailAIConfig.entity.js.map