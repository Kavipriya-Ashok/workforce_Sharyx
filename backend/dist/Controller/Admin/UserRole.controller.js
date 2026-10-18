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
exports.UserRoleController = void 0;
const common_1 = require("@nestjs/common");
const Common_helper_1 = require("../../Helper/Common.helper");
const swagger_1 = require("@nestjs/swagger");
const UserRole_service_1 = require("../../Service/Admin/UserRole.service");
const ResponseEnum_1 = require("../../Helper/Enum/ResponseEnum");
const UserRole_model_1 = require("../../Model/Admin/UserRole.model");
const JWTAuth_controller_1 = require("../JWTAuth.controller");
let UserRoleController = class UserRoleController extends JWTAuth_controller_1.JWTAuthController {
    constructor(_UserRoleService) {
        super();
        this._UserRoleService = _UserRoleService;
    }
    async List() {
        const UserRoleListData = await this._UserRoleService.GetAllExpectSuperAdmin();
        return this.SendResponseData(UserRoleListData);
    }
    async ById(Id) {
        const UserRoleData = await this._UserRoleService.GetById(Id);
        return this.SendResponseData(UserRoleData);
    }
    async Insert(UserRoleData, UserId) {
        await this._UserRoleService.Insert(UserRoleData, UserId);
        return this.SendResponse(ResponseEnum_1.ResponseEnum.Success, ResponseEnum_1.ResponseEnum.Created);
    }
    async Update(Id, UserRoleData, UserId) {
        await this._UserRoleService.Update(Id, UserRoleData, UserId);
        return this.SendResponse(ResponseEnum_1.ResponseEnum.Success, ResponseEnum_1.ResponseEnum.Updated);
    }
    async Delete(Id) {
        await this._UserRoleService.Delete(Id);
        return this.SendResponse(ResponseEnum_1.ResponseEnum.Success, ResponseEnum_1.ResponseEnum.Deleted);
    }
};
exports.UserRoleController = UserRoleController;
__decorate([
    (0, common_1.Get)('List'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], UserRoleController.prototype, "List", null);
__decorate([
    (0, common_1.Get)('ById/:Id'),
    __param(0, (0, common_1.Param)('Id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UserRoleController.prototype, "ById", null);
__decorate([
    (0, common_1.Post)('Insert'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, Common_helper_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [UserRole_model_1.UserRoleModel, String]),
    __metadata("design:returntype", Promise)
], UserRoleController.prototype, "Insert", null);
__decorate([
    (0, common_1.Put)('Update/:Id'),
    __param(0, (0, common_1.Param)('Id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, Common_helper_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, UserRole_model_1.UserRoleModel, String]),
    __metadata("design:returntype", Promise)
], UserRoleController.prototype, "Update", null);
__decorate([
    (0, common_1.Delete)('Delete/:Id'),
    __param(0, (0, common_1.Param)('Id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UserRoleController.prototype, "Delete", null);
exports.UserRoleController = UserRoleController = __decorate([
    (0, common_1.Controller)({ path: "UserRole", version: '1' }),
    (0, swagger_1.ApiTags)("User Role"),
    __metadata("design:paramtypes", [UserRole_service_1.UserRoleService])
], UserRoleController);
//# sourceMappingURL=UserRole.controller.js.map