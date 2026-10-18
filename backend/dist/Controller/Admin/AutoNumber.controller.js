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
exports.AutoNumberController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const JWTAuth_controller_1 = require("../JWTAuth.controller");
const Common_service_1 = require("../../Service/Common.service");
const ModuleTypeEnum_1 = require("../../Helper/Enum/ModuleTypeEnum");
let AutoNumberController = class AutoNumberController extends JWTAuth_controller_1.JWTAuthController {
    constructor(_CommonService) {
        super();
        this._CommonService = _CommonService;
    }
    async Generate(Type) {
        const ResultData = await this._CommonService.TransactionRunningNumber(Type);
        return this.SendResponseData({ number: ResultData });
    }
};
exports.AutoNumberController = AutoNumberController;
__decorate([
    (0, common_1.Get)('Generate/:Type'),
    __param(0, (0, common_1.Param)('Type')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], AutoNumberController.prototype, "Generate", null);
exports.AutoNumberController = AutoNumberController = __decorate([
    (0, common_1.Controller)({ path: "AutoNumber", version: '1' }),
    (0, swagger_1.ApiTags)("AutoNumber"),
    __metadata("design:paramtypes", [Common_service_1.CommonService])
], AutoNumberController);
//# sourceMappingURL=AutoNumber.controller.js.map