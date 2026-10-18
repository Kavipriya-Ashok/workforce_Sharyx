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
exports.audit_log = void 0;
const typeorm_1 = require("typeorm");
const BaseTable_1 = require("../BaseTable");
let audit_log = class audit_log extends BaseTable_1.BaseTable {
};
exports.audit_log = audit_log;
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], audit_log.prototype, "performed_action", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], audit_log.prototype, "performed_by", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], audit_log.prototype, "performed_by_id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], audit_log.prototype, "performed_module_name", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], audit_log.prototype, "performed_module_header_name", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], audit_log.prototype, "performed_module_id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], audit_log.prototype, "performed_on", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], audit_log.prototype, "performed_type", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], audit_log.prototype, "performed_ipaddress", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json' }),
    __metadata("design:type", Object)
], audit_log.prototype, "performed_parameter", void 0);
exports.audit_log = audit_log = __decorate([
    (0, typeorm_1.Entity)()
], audit_log);
//# sourceMappingURL=audit_log.js.map