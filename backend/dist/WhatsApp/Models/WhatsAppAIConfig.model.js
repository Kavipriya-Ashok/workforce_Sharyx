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
exports.WhatsAppAIConfigModel = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const Base_model_1 = require("../../Model/Base.model");
class WhatsAppAIConfigModel extends Base_model_1.BaseModel {
}
exports.WhatsAppAIConfigModel = WhatsAppAIConfigModel;
__decorate([
    (0, swagger_1.ApiProperty)({ example: "default" }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], WhatsAppAIConfigModel.prototype, "tenant_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], WhatsAppAIConfigModel.prototype, "is_ai_enabled", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: "hybrid", enum: ["fully_automated", "hybrid", "manual"] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], WhatsAppAIConfigModel.prototype, "ai_mode", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: "You are a professional customer support assistant for Sharyx." }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], WhatsAppAIConfigModel.prototype, "system_prompt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: "Hello! Thank you for reaching out to us. How can we help you?" }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], WhatsAppAIConfigModel.prototype, "welcome_message", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: "One of our team members will connect with you shortly." }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], WhatsAppAIConfigModel.prototype, "fallback_message", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: "openai", default: "openai" }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], WhatsAppAIConfigModel.prototype, "llm_provider", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: "gpt-4o-mini", default: "gpt-4o-mini" }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], WhatsAppAIConfigModel.prototype, "llm_model", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: "sk-... or AIzaSy...", required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], WhatsAppAIConfigModel.prototype, "api_key", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], WhatsAppAIConfigModel.prototype, "auto_followup_enabled", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 60 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], WhatsAppAIConfigModel.prototype, "followup_delay_minutes", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: "Hi! Just checking if you received our response and need further assistance." }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], WhatsAppAIConfigModel.prototype, "followup_message", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: ["STOP", "UNSUBSCRIBE"], type: [String], required: false }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Array)
], WhatsAppAIConfigModel.prototype, "stop_words", void 0);
//# sourceMappingURL=WhatsAppAIConfig.model.js.map