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
exports.WhatsAppCampaignModel = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const Base_model_1 = require("../../Model/Base.model");
class WhatsAppCampaignModel extends Base_model_1.BaseModel {
}
exports.WhatsAppCampaignModel = WhatsAppCampaignModel;
__decorate([
    (0, swagger_1.ApiProperty)({ example: "Summer Promo 2026" }),
    (0, class_validator_1.IsNotEmpty)({ message: "Campaign name is required" }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], WhatsAppCampaignModel.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: "summer_offer_v1" }),
    (0, class_validator_1.IsNotEmpty)({ message: "Template name is required" }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], WhatsAppCampaignModel.prototype, "template_name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: "Triggered after call ends", required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], WhatsAppCampaignModel.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: "round_1_cleared", required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], WhatsAppCampaignModel.prototype, "trigger_event", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 0, required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], WhatsAppCampaignModel.prototype, "delay_minutes", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: true, required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], WhatsAppCampaignModel.prototype, "is_active", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: ["+919876543210", "+919876543211"], type: [String], required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    __metadata("design:type", Array)
], WhatsAppCampaignModel.prototype, "recipients", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Date)
], WhatsAppCampaignModel.prototype, "scheduled_at", void 0);
//# sourceMappingURL=WhatsAppCampaign.model.js.map