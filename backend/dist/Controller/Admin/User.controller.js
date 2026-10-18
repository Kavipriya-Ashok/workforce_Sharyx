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
exports.UserController = void 0;
const common_1 = require("@nestjs/common");
const Common_helper_1 = require("../../Helper/Common.helper");
const swagger_1 = require("@nestjs/swagger");
const User_service_1 = require("../../Service/Admin/User.service");
const ResponseEnum_1 = require("../../Helper/Enum/ResponseEnum");
const User_model_1 = require("../../Model/Admin/User.model");
const JWTAuth_controller_1 = require("../JWTAuth.controller");
let UserController = class UserController extends JWTAuth_controller_1.JWTAuthController {
    constructor(_UserService) {
        super();
        this._UserService = _UserService;
    }
    async List() {
        const UserListData = await this._UserService.GetAllExpectSuperAdmin();
        return this.SendResponseData(UserListData);
    }
    async ById(Id) {
        const UserData = await this._UserService.GetById(Id);
        return this.SendResponseData(UserData);
    }
    async Insert(UserData, UserId) {
        const ResultData = await this._UserService.Insert(UserData, UserId);
        return this.SendResponse(ResponseEnum_1.ResponseEnum.Success, ResponseEnum_1.ResponseEnum.Created, ResultData.id);
    }
    async Update(Id, UserData, UserId) {
        await this._UserService.Update(Id, UserData, UserId);
        return this.SendResponse(ResponseEnum_1.ResponseEnum.Success, ResponseEnum_1.ResponseEnum.Updated);
    }
    async SuspendOrActivate(id, UserId) {
        const UserData = await this._UserService.SuspendOrActivate(id, UserId);
        if (UserData.status == true) {
            return this.SendResponse(ResponseEnum_1.ResponseEnum.Success, ResponseEnum_1.ResponseEnum.Activated);
        }
        else {
            return this.SendResponse(ResponseEnum_1.ResponseEnum.Success, ResponseEnum_1.ResponseEnum.Suspended);
        }
    }
    async ChangePassword(ChangePasswordData, UserId) {
        await this._UserService.ChangePassword(UserId, ChangePasswordData);
        return this.SendResponse(ResponseEnum_1.ResponseEnum.Success, "Password changed successfully");
    }
    async ResetPassword(Id, UserData, UserId) {
        await this._UserService.UserResetPassword(Id, UserData, UserId);
        return this.SendResponse(ResponseEnum_1.ResponseEnum.Success, ResponseEnum_1.ResponseEnum.Reset);
    }
};
exports.UserController = UserController;
__decorate([
    (0, common_1.Get)('List'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], UserController.prototype, "List", null);
__decorate([
    (0, common_1.Get)('ById/:Id'),
    __param(0, (0, common_1.Param)('Id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "ById", null);
__decorate([
    (0, common_1.Post)('Insert'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, Common_helper_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [User_model_1.UserModel, String]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "Insert", null);
__decorate([
    (0, common_1.Put)('Update/:Id'),
    __param(0, (0, common_1.Param)('Id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, Common_helper_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, User_model_1.UserModel, String]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "Update", null);
__decorate([
    (0, common_1.Patch)('SuspendOrActivate/:Id'),
    __param(0, (0, common_1.Param)('Id')),
    __param(1, (0, Common_helper_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "SuspendOrActivate", null);
__decorate([
    (0, common_1.Post)('ChangePassword'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, Common_helper_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [User_model_1.ChangePasswordModel, String]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "ChangePassword", null);
__decorate([
    (0, common_1.Put)('ResetPassword/:Id'),
    __param(0, (0, common_1.Param)('UserId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, Common_helper_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, User_model_1.UserModel, String]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "ResetPassword", null);
exports.UserController = UserController = __decorate([
    (0, common_1.Controller)({ path: "User", version: '1' }),
    (0, swagger_1.ApiTags)("User"),
    __metadata("design:paramtypes", [User_service_1.UserService])
], UserController);
//# sourceMappingURL=User.controller.js.map