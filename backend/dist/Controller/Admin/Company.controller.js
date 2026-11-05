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
exports.CompanyController = void 0;
const common_1 = require("@nestjs/common");
const Company_model_1 = require("../../Model/Admin/Company.model");
const Common_helper_1 = require("../../Helper/Common.helper");
const swagger_1 = require("@nestjs/swagger");
const Company_service_1 = require("../../Service/Admin/Company.service");
const ResponseEnum_1 = require("../../Helper/Enum/ResponseEnum");
const JWTAuth_controller_1 = require("../JWTAuth.controller");
const company_1 = require("../../Database/Table/Admin/company");
let CompanyController = class CompanyController extends JWTAuth_controller_1.JWTAuthController {
    constructor(_CompanyService) {
        super();
        this._CompanyService = _CompanyService;
    }
    async Get(req) {
        var _a, _b;
        const tenantId = ((_a = req.user) === null || _a === void 0 ? void 0 : _a.tenant_id) || ((_b = req.user) === null || _b === void 0 ? void 0 : _b.company_id);
        if (!tenantId)
            throw new common_1.ForbiddenException('No tenant is associated with this account');
        return await company_1.company.findOne({ where: { id: tenantId }, relations: ['currency', 'country'] });
    }
    async List(req) {
        var _a, _b;
        if ((0, Common_helper_1.isSuperAdminUser)(req.user)) {
            return this.SendResponseData(await this._CompanyService.GetAll());
        }
        const tenantId = ((_a = req.user) === null || _a === void 0 ? void 0 : _a.tenant_id) || ((_b = req.user) === null || _b === void 0 ? void 0 : _b.company_id);
        if (!tenantId)
            throw new common_1.ForbiddenException('No tenant is associated with this account');
        const own = await company_1.company.findOne({ where: { id: tenantId }, relations: ['currency', 'country'] });
        return this.SendResponseData(own ? [own] : []);
    }
    async Update(CompanyData, UserId, req) {
        var _a, _b;
        const isSuper = (0, Common_helper_1.isSuperAdminUser)(req.user);
        if (!isSuper) {
            const tenantId = ((_a = req.user) === null || _a === void 0 ? void 0 : _a.tenant_id) || ((_b = req.user) === null || _b === void 0 ? void 0 : _b.company_id);
            if (!tenantId)
                throw new common_1.ForbiddenException('No tenant is associated with this account');
            CompanyData.id = tenantId;
        }
        if (CompanyData.id > "0") {
            await this._CompanyService.Update(CompanyData.id, CompanyData, UserId);
        }
        else {
            await this._CompanyService.Insert(CompanyData, UserId);
        }
        return this.SendResponse(ResponseEnum_1.ResponseEnum.Success, ResponseEnum_1.ResponseEnum.Updated);
    }
};
exports.CompanyController = CompanyController;
__decorate([
    (0, common_1.Get)('Get'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CompanyController.prototype, "Get", null);
__decorate([
    (0, common_1.Get)('List'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CompanyController.prototype, "List", null);
__decorate([
    (0, common_1.Patch)('Update'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, Common_helper_1.CurrentUser)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Company_model_1.CompanyModel, String, Object]),
    __metadata("design:returntype", Promise)
], CompanyController.prototype, "Update", null);
exports.CompanyController = CompanyController = __decorate([
    (0, common_1.Controller)({ path: "Company", version: '1' }),
    (0, swagger_1.ApiTags)("Company"),
    __metadata("design:paramtypes", [Company_service_1.CompanyService])
], CompanyController);
//# sourceMappingURL=Company.controller.js.map