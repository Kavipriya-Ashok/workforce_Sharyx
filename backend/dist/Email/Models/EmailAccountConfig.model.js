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
exports.EmailAccountConfigModel = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const Base_model_1 = require("../../Model/Base.model");
class EmailAccountConfigModel extends Base_model_1.BaseModel {
}
exports.EmailAccountConfigModel = EmailAccountConfigModel;
__decorate([
    (0, swagger_1.ApiProperty)({ example: "default" }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], EmailAccountConfigModel.prototype, "tenant_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: "smtp", default: "smtp" }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], EmailAccountConfigModel.prototype, "provider", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: "Support Team", required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], EmailAccountConfigModel.prototype, "display_name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: "support@sharyx.com" }),
    (0, class_validator_1.IsNotEmpty)({ message: "Email address is required" }),
    (0, class_validator_1.IsEmail)({}, { message: "Invalid email format" }),
    __metadata("design:type", String)
], EmailAccountConfigModel.prototype, "email_address", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: "your-client-id.apps.googleusercontent.com", required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], EmailAccountConfigModel.prototype, "client_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: "GOCSPX-...", required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], EmailAccountConfigModel.prototype, "client_secret", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: "smtp.gmail.com", required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], EmailAccountConfigModel.prototype, "smtp_host", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 587, default: 587, required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], EmailAccountConfigModel.prototype, "smtp_port", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: "support@sharyx.com", required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], EmailAccountConfigModel.prototype, "smtp_user", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: "app_password_here", required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], EmailAccountConfigModel.prototype, "smtp_password", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: "imap.gmail.com", required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], EmailAccountConfigModel.prototype, "imap_host", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 993, default: 993 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], EmailAccountConfigModel.prototype, "imap_port", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], EmailAccountConfigModel.prototype, "use_ssl", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], EmailAccountConfigModel.prototype, "is_active", void 0);
//# sourceMappingURL=EmailAccountConfig.model.js.map