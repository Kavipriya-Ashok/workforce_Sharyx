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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VoiceWebhookController = void 0;
const common_1 = require("@nestjs/common");
const VoiceCall_service_1 = require("../Services/VoiceCall.service");
let VoiceWebhookController = class VoiceWebhookController {
    constructor(callService) {
        this.callService = callService;
    }
    async handleWebhook(provider, body) {
        const result = await this.callService.handleWebhook(provider, body);
        return { ok: true, received: true, callId: result.providerCallId };
    }
};
exports.VoiceWebhookController = VoiceWebhookController;
__decorate([
    (0, common_1.Post)(":provider"),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)("provider")),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], VoiceWebhookController.prototype, "handleWebhook", null);
exports.VoiceWebhookController = VoiceWebhookController = __decorate([
    (0, common_1.Controller)({ path: "Voice/Webhook", version: "1" }),
    __metadata("design:paramtypes", [VoiceCall_service_1.VoiceCallService])
], VoiceWebhookController);
//# sourceMappingURL=VoiceWebhook.controller.js.map