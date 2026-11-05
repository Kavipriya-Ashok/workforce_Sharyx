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
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const Base_model_1 = require("../../Model/Base.model");
const trimStr = ({ value }) => (typeof value === "string" ? value.trim() : value);
class WhatsAppAIConfigModel extends Base_model_1.BaseModel {
}
exports.WhatsAppAIConfigModel = WhatsAppAIConfigModel;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(64),
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
    (0, class_validator_1.IsIn)(["fully_automated", "hybrid", "manual"], { message: "AI mode must be fully_automated, hybrid or manual" }),
    __metadata("design:type", String)
], WhatsAppAIConfigModel.prototype, "ai_mode", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(8000, { message: "The AI instructions can be at most 8000 characters" }),
    __metadata("design:type", String)
], WhatsAppAIConfigModel.prototype, "system_prompt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false, example: "Hi {name}, welcome to {company}! How can we help you today?" }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(trimStr),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(1000, { message: "The first message can be at most 1000 characters" }),
    __metadata("design:type", String)
], WhatsAppAIConfigModel.prototype, "welcome_message", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(trimStr),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(1000, { message: "The fallback message can be at most 1000 characters" }),
    __metadata("design:type", String)
], WhatsAppAIConfigModel.prototype, "fallback_message", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: "gemini", required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(["gemini", "openai"], { message: "AI provider must be gemini or openai" }),
    __metadata("design:type", String)
], WhatsAppAIConfigModel.prototype, "llm_provider", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], WhatsAppAIConfigModel.prototype, "llm_model", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(512, { message: "API key is too long" }),
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
    (0, class_validator_1.IsInt)({ message: "Follow-up delay must be a whole number of minutes" }),
    (0, class_validator_1.Min)(1, { message: "Follow-up delay must be at least 1 minute" }),
    (0, class_validator_1.Max)(1380, { message: "Follow-up delay must be under 23 hours (WhatsApp only allows free text inside 24 hours)" }),
    __metadata("design:type", Number)
], WhatsAppAIConfigModel.prototype, "followup_delay_minutes", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false, example: "Hi {name}, just checking if you still need help." }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(trimStr),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(1000, { message: "The follow-up message can be at most 1000 characters" }),
    __metadata("design:type", String)
], WhatsAppAIConfigModel.prototype, "followup_message", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: ["STOP", "UNSUBSCRIBE"], type: [String], required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMaxSize)(10, { message: "At most 10 opt-out words" }),
    (0, class_validator_1.IsString)({ each: true }),
    (0, class_validator_1.MaxLength)(30, { each: true, message: "An opt-out word can be at most 30 characters" }),
    __metadata("design:type", Array)
], WhatsAppAIConfigModel.prototype, "stop_words", void 0);
//# sourceMappingURL=WhatsAppAIConfig.model.js.map