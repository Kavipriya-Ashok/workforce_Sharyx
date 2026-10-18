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
exports.CountryController = void 0;
const common_1 = require("@nestjs/common");
const Common_helper_1 = require("../../Helper/Common.helper");
const swagger_1 = require("@nestjs/swagger");
const Country_service_1 = require("../../Service/Admin/Country.service");
const ResponseEnum_1 = require("../../Helper/Enum/ResponseEnum");
const Country_model_1 = require("../../Model/Admin/Country.model");
const JWTAuth_controller_1 = require("../JWTAuth.controller");
let CountryController = class CountryController extends JWTAuth_controller_1.JWTAuthController {
    constructor(_CountryService) {
        super();
        this._CountryService = _CountryService;
    }
    async List() {
        const CountryListData = await this._CountryService.GetAll();
        return this.SendResponseData(CountryListData);
    }
    async ById(Id) {
        const CountryData = await this._CountryService.GetById(Id);
        return this.SendResponseData(CountryData);
    }
    async Insert(CountryData, UserId) {
        await this._CountryService.Insert(CountryData, UserId);
        return this.SendResponse(ResponseEnum_1.ResponseEnum.Success, ResponseEnum_1.ResponseEnum.Created);
    }
    async Update(Id, CountryData, UserId) {
        await this._CountryService.Update(Id, CountryData, UserId);
        return this.SendResponse(ResponseEnum_1.ResponseEnum.Success, ResponseEnum_1.ResponseEnum.Updated);
    }
    async Delete(Id) {
        await this._CountryService.Delete(Id);
        return this.SendResponse(ResponseEnum_1.ResponseEnum.Success, ResponseEnum_1.ResponseEnum.Deleted);
    }
};
exports.CountryController = CountryController;
__decorate([
    (0, common_1.Get)('List'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CountryController.prototype, "List", null);
__decorate([
    (0, common_1.Get)('ById/:Id'),
    __param(0, (0, common_1.Param)('Id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CountryController.prototype, "ById", null);
__decorate([
    (0, common_1.Post)('Insert'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, Common_helper_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Country_model_1.CountryModel, String]),
    __metadata("design:returntype", Promise)
], CountryController.prototype, "Insert", null);
__decorate([
    (0, common_1.Put)('Update/:Id'),
    __param(0, (0, common_1.Param)('Id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, Common_helper_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Country_model_1.CountryModel, String]),
    __metadata("design:returntype", Promise)
], CountryController.prototype, "Update", null);
__decorate([
    (0, common_1.Delete)('Delete/:Id'),
    __param(0, (0, common_1.Param)('Id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CountryController.prototype, "Delete", null);
exports.CountryController = CountryController = __decorate([
    (0, common_1.Controller)({ path: "Country", version: '1' }),
    (0, swagger_1.ApiTags)("Country"),
    __metadata("design:paramtypes", [Country_service_1.CountryService])
], CountryController);
//# sourceMappingURL=Country.controller.js.map