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
exports.WhatsAppConversation = void 0;
const typeorm_1 = require("typeorm");
const BaseTable_1 = require("../BaseTable");
const WhatsAppMessage_entity_1 = require("./WhatsAppMessage.entity");
let WhatsAppConversation = class WhatsAppConversation extends BaseTable_1.BaseTable {
};
exports.WhatsAppConversation = WhatsAppConversation;
__decorate([
    (0, typeorm_1.Column)({ default: "default" }),
    __metadata("design:type", String)
], WhatsAppConversation.prototype, "tenant_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 30 }),
    __metadata("design:type", String)
], WhatsAppConversation.prototype, "customer_phone", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 150, nullable: true }),
    __metadata("design:type", String)
], WhatsAppConversation.prototype, "customer_name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "uuid", nullable: true }),
    __metadata("design:type", String)
], WhatsAppConversation.prototype, "lead_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 30, default: "open" }),
    __metadata("design:type", String)
], WhatsAppConversation.prototype, "conversation_status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], WhatsAppConversation.prototype, "last_message_text", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "timestamp with time zone", default: () => "CURRENT_TIMESTAMP" }),
    __metadata("design:type", Date)
], WhatsAppConversation.prototype, "last_message_at", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "int", default: 0 }),
    __metadata("design:type", Number)
], WhatsAppConversation.prototype, "unread_count", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "jsonb", nullable: true }),
    __metadata("design:type", Object)
], WhatsAppConversation.prototype, "meeting_info", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => WhatsAppMessage_entity_1.WhatsAppMessage, (message) => message.conversation),
    __metadata("design:type", Array)
], WhatsAppConversation.prototype, "messages", void 0);
exports.WhatsAppConversation = WhatsAppConversation = __decorate([
    (0, typeorm_1.Entity)("wa_conversation")
], WhatsAppConversation);
//# sourceMappingURL=WhatsAppConversation.entity.js.map