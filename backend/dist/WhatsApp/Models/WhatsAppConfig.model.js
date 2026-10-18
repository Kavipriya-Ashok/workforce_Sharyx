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
const class_validator_1 = require("class-validator");
const Base_model_1 = require("../../Model/Base.model");
class WhatsAppConfigModel extends Base_model_1.BaseModel {
}
exports.WhatsAppConfigModel = WhatsAppConfigModel;
__decorate([
    (0, swagger_1.ApiProperty)({ example: "default" }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], WhatsAppConfigModel.prototype, "tenant_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: "+15551234567" }),
    (0, class_validator_1.IsNotEmpty)({ message: "Phone number is required" }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], WhatsAppConfigModel.prototype, "phone_number", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: "100234567890123" }),
    (0, class_validator_1.IsNotEmpty)({ message: "Phone Number ID is required" }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], WhatsAppConfigModel.prototype, "phone_number_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: "987654321012345", required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], WhatsAppConfigModel.prototype, "waba_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: "EAAG..." }),
    (0, class_validator_1.IsNotEmpty)({ message: "Meta Access Token is required" }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], WhatsAppConfigModel.prototype, "access_token", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: "sharyx_verify_token_secure" }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], WhatsAppConfigModel.prototype, "verify_token", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: "meta_cloud", enum: ["meta_cloud", "qr_gateway", "custom_gateway", "twilio"], required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], WhatsAppConfigModel.prototype, "provider", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: "https://api.custom-wa-gateway.com/v1", required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], WhatsAppConfigModel.prototype, "api_url", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: "custom_api_key_secret", required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], WhatsAppConfigModel.prototype, "api_key", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], WhatsAppConfigModel.prototype, "is_connected", void 0);
//# sourceMappingURL=WhatsAppConfig.model.js.map