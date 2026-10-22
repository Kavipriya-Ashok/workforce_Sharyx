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
exports.VoiceProviderConfig = void 0;
const typeorm_1 = require("typeorm");
const BaseTable_1 = require("../BaseTable");
let VoiceProviderConfig = class VoiceProviderConfig extends BaseTable_1.BaseTable {
};
exports.VoiceProviderConfig = VoiceProviderConfig;
__decorate([
    (0, typeorm_1.Column)({ default: "default" }),
    __metadata("design:type", String)
], VoiceProviderConfig.prototype, "tenant_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 30, default: "vapi" }),
    __metadata("design:type", String)
], VoiceProviderConfig.prototype, "provider", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], VoiceProviderConfig.prototype, "api_key", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 100, nullable: true }),
    __metadata("design:type", String)
], VoiceProviderConfig.prototype, "phone_number_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 40, nullable: true }),
    __metadata("design:type", String)
], VoiceProviderConfig.prototype, "caller_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 255, nullable: true }),
    __metadata("design:type", String)
], VoiceProviderConfig.prototype, "base_url", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "jsonb", nullable: true }),
    __metadata("design:type", Object)
], VoiceProviderConfig.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "boolean", default: true }),
    __metadata("design:type", Boolean)
], VoiceProviderConfig.prototype, "is_active", void 0);
exports.VoiceProviderConfig = VoiceProviderConfig = __decorate([
    (0, typeorm_1.Entity)("voice_provider_config")
], VoiceProviderConfig);
//# sourceMappingURL=VoiceProviderConfig.entity.js.map