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
exports.CurrencyController = void 0;
const common_1 = require("@nestjs/common");
const Common_helper_1 = require("../../Helper/Common.helper");
const swagger_1 = require("@nestjs/swagger");
const Currency_service_1 = require("../../Service/Admin/Currency.service");
const ResponseEnum_1 = require("../../Helper/Enum/ResponseEnum");
const Currency_model_1 = require("../../Model/Admin/Currency.model");
const JWTAuth_controller_1 = require("../JWTAuth.controller");
let CurrencyController = class CurrencyController extends JWTAuth_controller_1.JWTAuthController {
    constructor(_CurrencyService) {
        super();
        this._CurrencyService = _CurrencyService;
    }
    async List() {
        const CurrencyListData = await this._CurrencyService.GetAll();
        return this.SendResponseData(CurrencyListData);
    }
    async ById(Id) {
        const CurrencyData = await this._CurrencyService.GetById(Id);
        return this.SendResponseData(CurrencyData);
    }
    async Insert(CurrencyData, UserId) {
        await this._CurrencyService.Insert(CurrencyData, UserId);
        return this.SendResponse(ResponseEnum_1.ResponseEnum.Success, ResponseEnum_1.ResponseEnum.Created);
    }
    async Update(Id, CurrencyData, UserId) {
        await this._CurrencyService.Update(Id, CurrencyData, UserId);
        return this.SendResponse(ResponseEnum_1.ResponseEnum.Success, ResponseEnum_1.ResponseEnum.Updated);
    }
    async Delete(Id) {
        await this._CurrencyService.Delete(Id);
        return this.SendResponse(ResponseEnum_1.ResponseEnum.Success, ResponseEnum_1.ResponseEnum.Deleted);
    }
};
exports.CurrencyController = CurrencyController;
__decorate([
    (0, common_1.Get)('List'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CurrencyController.prototype, "List", null);
__decorate([
    (0, common_1.Get)('ById/:Id'),
    __param(0, (0, common_1.Param)('Id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CurrencyController.prototype, "ById", null);
__decorate([
    (0, common_1.Post)('Insert'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, Common_helper_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Currency_model_1.CurrencyModel, String]),
    __metadata("design:returntype", Promise)
], CurrencyController.prototype, "Insert", null);
__decorate([
    (0, common_1.Put)('Update/:Id'),
    __param(0, (0, common_1.Param)('Id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, Common_helper_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Currency_model_1.CurrencyModel, String]),
    __metadata("design:returntype", Promise)
], CurrencyController.prototype, "Update", null);
__decorate([
    (0, common_1.Delete)('Delete/:Id'),
    __param(0, (0, common_1.Param)('Id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CurrencyController.prototype, "Delete", null);
exports.CurrencyController = CurrencyController = __decorate([
    (0, common_1.Controller)({ path: "Currency", version: '1' }),
    (0, swagger_1.ApiTags)("Currency"),
    __metadata("design:paramtypes", [Currency_service_1.CurrencyService])
], CurrencyController);
//# sourceMappingURL=Currency.controller.js.map