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
exports.SendWhatsAppMessageModel = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class SendWhatsAppMessageModel {
}
exports.SendWhatsAppMessageModel = SendWhatsAppMessageModel;
__decorate([
    (0, swagger_1.ApiProperty)({ example: "+919876543210" }),
    (0, class_validator_1.IsNotEmpty)({ message: "Recipient phone number is required" }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SendWhatsAppMessageModel.prototype, "to", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: "Hello! How can we assist you today?", required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SendWhatsAppMessageModel.prototype, "text", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: "text", required: false, default: "text" }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SendWhatsAppMessageModel.prototype, "message_type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SendWhatsAppMessageModel.prototype, "template_name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SendWhatsAppMessageModel.prototype, "conversation_id", void 0);
//# sourceMappingURL=SendWhatsAppMessage.model.js.map