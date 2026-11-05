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
exports.WhatsAppConfigModel = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const trim = ({ value }) => (typeof value === "string" ? value.trim() : value);
const Base_model_1 = require("../../Model/Base.model");
class WhatsAppConfigModel extends Base_model_1.BaseModel {
}
exports.WhatsAppConfigModel = WhatsAppConfigModel;
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], WhatsAppConfigModel.prototype, "tenant_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: "+15551234567" }),
    (0, class_transformer_1.Transform)(trim),
    (0, class_validator_1.IsNotEmpty)({ message: "Phone number is required" }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^\+?[0-9 ()-]{5,30}$/, { message: "Phone number may contain only digits, spaces, + ( ) -" }),
    __metadata("design:type", String)
], WhatsAppConfigModel.prototype, "phone_number", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: "100234567890123" }),
    (0, class_transformer_1.Transform)(trim),
    (0, class_validator_1.IsNotEmpty)({ message: "Phone Number ID is required" }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100, { message: "Phone Number ID must be at most 100 characters" }),
    __metadata("design:type", String)
], WhatsAppConfigModel.prototype, "phone_number_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: "987654321012345", required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(trim),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100, { message: "WABA ID must be at most 100 characters" }),
    __metadata("design:type", String)
], WhatsAppConfigModel.prototype, "waba_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: "EAAG...", required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(1024, { message: "Access token is too long" }),
    __metadata("design:type", String)
], WhatsAppConfigModel.prototype, "access_token", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false, description: "Meta App Secret (webhook signature verification). Write-only." }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(256, { message: "App secret is too long" }),
    __metadata("design:type", String)
], WhatsAppConfigModel.prototype, "app_secret", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: "sharyx_verify_token_secure" }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100, { message: "Verify token must be at most 100 characters" }),
    __metadata("design:type", String)
], WhatsAppConfigModel.prototype, "verify_token", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: "meta_cloud", enum: ["meta_cloud", "qr_gateway", "custom_gateway", "twilio"], required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(["meta_cloud", "qr_gateway", "custom_gateway", "twilio"], { message: "Unknown WhatsApp provider" }),
    __metadata("design:type", String)
], WhatsAppConfigModel.prototype, "provider", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: "https://api.custom-wa-gateway.com/v1", required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(trim),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(500, { message: "API URL is too long" }),
    __metadata("design:type", String)
], WhatsAppConfigModel.prototype, "api_url", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: "custom_api_key_secret", required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(512, { message: "API key is too long" }),
    __metadata("design:type", String)
], WhatsAppConfigModel.prototype, "api_key", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], WhatsAppConfigModel.prototype, "is_connected", void 0);
//# sourceMappingURL=WhatsAppConfig.model.js.map