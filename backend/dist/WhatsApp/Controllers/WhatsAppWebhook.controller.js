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
exports.WhatsAppWebhookController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const WhatsAppWebhook_service_1 = require("../Services/WhatsAppWebhook.service");
let WhatsAppWebhookController = class WhatsAppWebhookController {
    constructor(webhookService) {
        this.webhookService = webhookService;
        this.logger = new common_1.Logger("WhatsAppWebhook");
    }
    async verifyWebhook(mode, token, challenge, res) {
        this.logger.log(`[HANDSHAKE] Meta Webhook verification requested: mode=${mode}, token=${token}`);
        const verified = await this.webhookService.verifyHandshake(mode, token, challenge);
        if (verified) {
            this.logger.log(`✅ [HANDSHAKE] Meta Webhook successfully verified!`);
            return res.status(common_1.HttpStatus.OK).send(verified);
        }
        this.logger.warn(`❌ [HANDSHAKE] Meta Webhook verification failed. Expected token mismatch.`);
        return res.status(common_1.HttpStatus.FORBIDDEN).send("Verification failed");
    }
    async handleIncomingMessage(body) {
        this.logger.log(`📥 [WEBHOOK HIT] Incoming event from Meta received!`);
        this.webhookService.processIncomingWebhook(body);
        return "EVENT_RECEIVED";
    }
};
exports.WhatsAppWebhookController = WhatsAppWebhookController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)("hub.mode")),
    __param(1, (0, common_1.Query)("hub.verify_token")),
    __param(2, (0, common_1.Query)("hub.challenge")),
    __param(3, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", Promise)
], WhatsAppWebhookController.prototype, "verifyWebhook", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], WhatsAppWebhookController.prototype, "handleIncomingMessage", null);
exports.WhatsAppWebhookController = WhatsAppWebhookController = __decorate([
    (0, common_1.Controller)({
        path: [
            "WhatsApp/Webhook",
            "webhook/whatsapp",
            "api/webhook/whatsapp",
            "api/whatsapp/webhook",
            "webhook",
        ],
        version: ["1", common_1.VERSION_NEUTRAL],
    }),
    (0, swagger_1.ApiTags)("WhatsApp Webhook"),
    __metadata("design:paramtypes", [WhatsAppWebhook_service_1.WhatsAppWebhookService])
], WhatsAppWebhookController);
//# sourceMappingURL=WhatsAppWebhook.controller.js.map