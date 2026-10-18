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
exports.ErrorLogController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const ErrorLog_service_1 = require("../../Service/Admin/ErrorLog.service");
const JWTAuth_controller_1 = require("../JWTAuth.controller");
const ErrorLog_model_1 = require("../../Model/Admin/ErrorLog.model");
const ResponseEnum_1 = require("../../Helper/Enum/ResponseEnum");
let ErrorLogController = class ErrorLogController extends JWTAuth_controller_1.JWTAuthController {
    constructor(_ErrorLogService) {
        super();
        this._ErrorLogService = _ErrorLogService;
    }
    async LazyLoadList(ErrorLogLazyLoadData) {
        var _a, _b;
        const ErrorLogListData = await this._ErrorLogService.LazyLoadList(ErrorLogLazyLoadData);
        return this.SendResponseData({ data: ErrorLogListData, total: (_b = (_a = ErrorLogListData[0]) === null || _a === void 0 ? void 0 : _a.total_count) !== null && _b !== void 0 ? _b : 0 });
    }
    async DeleteByAsOfDate(ErrorLogDeleteData) {
        await this._ErrorLogService.DeleteByAsOfDate(ErrorLogDeleteData);
        return this.SendResponse(ResponseEnum_1.ResponseEnum.Success, ResponseEnum_1.ResponseEnum.Deleted);
    }
};
exports.ErrorLogController = ErrorLogController;
__decorate([
    (0, common_1.Post)('LazyLoadList'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ErrorLog_model_1.ErrorLogLazyLoadModel]),
    __metadata("design:returntype", Promise)
], ErrorLogController.prototype, "LazyLoadList", null);
__decorate([
    (0, common_1.Post)('DeleteByAsOfDate'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ErrorLog_model_1.ErrorLogDeleteModel]),
    __metadata("design:returntype", Promise)
], ErrorLogController.prototype, "DeleteByAsOfDate", null);
exports.ErrorLogController = ErrorLogController = __decorate([
    (0, common_1.Controller)({ path: "ErrorLog", version: '1' }),
    (0, swagger_1.ApiTags)("Error Log"),
    __metadata("design:paramtypes", [ErrorLog_service_1.ErrorLogService])
], ErrorLogController);
//# sourceMappingURL=ErrorLog.controller.js.map