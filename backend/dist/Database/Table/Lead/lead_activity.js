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
exports.lead_activity = void 0;
const typeorm_1 = require("typeorm");
const BaseTable_1 = require("../BaseTable");
let lead_activity = class lead_activity extends BaseTable_1.BaseTable {
};
exports.lead_activity = lead_activity;
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ type: "uuid" }),
    __metadata("design:type", String)
], lead_activity.prototype, "lead_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 50, default: "NOTE" }),
    __metadata("design:type", String)
], lead_activity.prototype, "activity_type", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 255 }),
    __metadata("design:type", String)
], lead_activity.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], lead_activity.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "jsonb", nullable: true }),
    __metadata("design:type", Object)
], lead_activity.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 150, nullable: true }),
    __metadata("design:type", String)
], lead_activity.prototype, "performer_name", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ type: "varchar", length: 100, default: "default" }),
    __metadata("design:type", String)
], lead_activity.prototype, "tenant_id", void 0);
exports.lead_activity = lead_activity = __decorate([
    (0, typeorm_1.Entity)({ name: "lead_activity" })
], lead_activity);
//# sourceMappingURL=lead_activity.js.map