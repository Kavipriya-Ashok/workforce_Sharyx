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
exports.GenerateEmailAIDraftModel = exports.EmailAIConfigModel = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const Base_model_1 = require("../../Model/Base.model");
class EmailAIConfigModel extends Base_model_1.BaseModel {
}
exports.EmailAIConfigModel = EmailAIConfigModel;
__decorate([
    (0, swagger_1.ApiProperty)({ example: "default" }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], EmailAIConfigModel.prototype, "tenant_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], EmailAIConfigModel.prototype, "auto_reply_enabled", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: "You are an executive email assistant for Sharyx. Keep replies polished and helpful." }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], EmailAIConfigModel.prototype, "system_prompt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: "professional", enum: ["professional", "friendly", "persuasive"] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], EmailAIConfigModel.prototype, "tone", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: "openai", default: "openai" }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], EmailAIConfigModel.prototype, "llm_provider", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: "gpt-4o-mini", default: "gpt-4o-mini" }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], EmailAIConfigModel.prototype, "llm_model", void 0);
class GenerateEmailAIDraftModel {
}
exports.GenerateEmailAIDraftModel = GenerateEmailAIDraftModel;
__decorate([
    (0, swagger_1.ApiProperty)({ example: "client@example.com" }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GenerateEmailAIDraftModel.prototype, "from_email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: "Pricing inquiry for CRM module" }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GenerateEmailAIDraftModel.prototype, "subject", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: "Can you share the pricing plan for 50 users?" }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GenerateEmailAIDraftModel.prototype, "incoming_body", void 0);
//# sourceMappingURL=EmailAIConfig.model.js.map