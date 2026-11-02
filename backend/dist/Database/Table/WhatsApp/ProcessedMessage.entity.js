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
exports.ProcessedMessage = void 0;
const typeorm_1 = require("typeorm");
const typeorm_2 = require("typeorm");
let ProcessedMessage = class ProcessedMessage extends typeorm_2.BaseEntity {
};
exports.ProcessedMessage = ProcessedMessage;
__decorate([
    (0, typeorm_1.PrimaryColumn)({ type: "varchar", length: 191 }),
    __metadata("design:type", String)
], ProcessedMessage.prototype, "wamid", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ type: "varchar", length: 50, nullable: true }),
    __metadata("design:type", String)
], ProcessedMessage.prototype, "sender_phone", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ type: "timestamptz" }),
    __metadata("design:type", Date)
], ProcessedMessage.prototype, "created_at", void 0);
exports.ProcessedMessage = ProcessedMessage = __decorate([
    (0, typeorm_1.Entity)("processed_messages")
], ProcessedMessage);
//# sourceMappingURL=ProcessedMessage.entity.js.map