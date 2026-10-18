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
exports.AuditLogController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const AuditLog_service_1 = require("../../Service/Admin/AuditLog.service");
const JWTAuth_controller_1 = require("../JWTAuth.controller");
const AuditLog_model_1 = require("../../Model/Admin/AuditLog.model");
let AuditLogController = class AuditLogController extends JWTAuth_controller_1.JWTAuthController {
    constructor(_AuditLogService) {
        super();
        this._AuditLogService = _AuditLogService;
    }
    async LazyLoadList(AuditLogLazyLoadData) {
        const AuditLogListData = await this._AuditLogService.LazyLoadList(AuditLogLazyLoadData);
        return this.SendResponseData({ data: AuditLogListData.data, total: AuditLogListData.total_record });
    }
    async DetailList(EventLog) {
        const AuditLogListData = await this._AuditLogService.DetailList(EventLog);
        return this.SendResponseData(AuditLogListData);
    }
};
exports.AuditLogController = AuditLogController;
__decorate([
    (0, common_1.Get)('LazyLoadList'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [AuditLog_model_1.AuditLogLazyLoadModel]),
    __metadata("design:returntype", Promise)
], AuditLogController.prototype, "LazyLoadList", null);
__decorate([
    (0, common_1.Post)('DetailList'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuditLogController.prototype, "DetailList", null);
exports.AuditLogController = AuditLogController = __decorate([
    (0, common_1.Controller)({ path: "AuditLog", version: '1' }),
    (0, swagger_1.ApiTags)("Audit Log"),
    __metadata("design:paramtypes", [AuditLog_service_1.AuditLogService])
], AuditLogController);
//# sourceMappingURL=AuditLog.controller.js.map