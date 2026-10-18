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
exports.EmailCampaignModel = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const Base_model_1 = require("../../Model/Base.model");
class EmailCampaignModel extends Base_model_1.BaseModel {
}
exports.EmailCampaignModel = EmailCampaignModel;
__decorate([
    (0, swagger_1.ApiProperty)({ example: "Newsletter October 2026" }),
    (0, class_validator_1.IsNotEmpty)({ message: "Campaign name is required" }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], EmailCampaignModel.prototype, "campaign_name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: "Important Updates for Your Account" }),
    (0, class_validator_1.IsNotEmpty)({ message: "Subject is required" }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], EmailCampaignModel.prototype, "subject", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: "<h1>Hello!</h1><p>Here are your updates.</p>" }),
    (0, class_validator_1.IsNotEmpty)({ message: "HTML template is required" }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], EmailCampaignModel.prototype, "html_template", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: ["user1@example.com", "user2@example.com"], type: [String] }),
    (0, class_validator_1.IsArray)(),
    __metadata("design:type", Array)
], EmailCampaignModel.prototype, "recipients", void 0);
//# sourceMappingURL=EmailCampaign.model.js.map