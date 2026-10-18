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
exports.WhatsAppMessage = void 0;
const typeorm_1 = require("typeorm");
const BaseTable_1 = require("../BaseTable");
const WhatsAppConversation_entity_1 = require("./WhatsAppConversation.entity");
let WhatsAppMessage = class WhatsAppMessage extends BaseTable_1.BaseTable {
};
exports.WhatsAppMessage = WhatsAppMessage;
__decorate([
    (0, typeorm_1.Column)({ type: "uuid", nullable: true }),
    __metadata("design:type", String)
], WhatsAppMessage.prototype, "conversation_id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => WhatsAppConversation_entity_1.WhatsAppConversation, (conv) => conv.messages, { onDelete: "CASCADE", nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: "conversation_id" }),
    __metadata("design:type", WhatsAppConversation_entity_1.WhatsAppConversation)
], WhatsAppMessage.prototype, "conversation", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: "default" }),
    __metadata("design:type", String)
], WhatsAppMessage.prototype, "tenant_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 30 }),
    __metadata("design:type", String)
], WhatsAppMessage.prototype, "sender_phone", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 30 }),
    __metadata("design:type", String)
], WhatsAppMessage.prototype, "recipient_phone", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 15, default: "outbound" }),
    __metadata("design:type", String)
], WhatsAppMessage.prototype, "direction", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 20, default: "text" }),
    __metadata("design:type", String)
], WhatsAppMessage.prototype, "message_type", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], WhatsAppMessage.prototype, "message_text", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 100, nullable: true }),
    __metadata("design:type", String)
], WhatsAppMessage.prototype, "template_name", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 150, nullable: true }),
    __metadata("design:type", String)
], WhatsAppMessage.prototype, "meta_message_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 20, default: "sent" }),
    __metadata("design:type", String)
], WhatsAppMessage.prototype, "delivery_status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "boolean", default: false }),
    __metadata("design:type", Boolean)
], WhatsAppMessage.prototype, "is_ai_generated", void 0);
exports.WhatsAppMessage = WhatsAppMessage = __decorate([
    (0, typeorm_1.Entity)("wa_message")
], WhatsAppMessage);
//# sourceMappingURL=WhatsAppMessage.entity.js.map