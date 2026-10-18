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
exports.LoginController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const ResponseEnum_1 = require("../../Helper/Enum/ResponseEnum");
const User_model_1 = require("../../Model/Admin/User.model");
const UserLogin_model_1 = require("../../Model/Admin/UserLogin.model");
const User_service_1 = require("../../Service/Admin/User.service");
const Auth_service_1 = require("../../Service/Auth/Auth.service");
const AuthBase_controller_1 = require("../AuthBase.controller");
let LoginController = class LoginController extends AuthBase_controller_1.AuthBaseController {
    constructor(_AuthService, _UserService) {
        super();
        this._AuthService = _AuthService;
        this._UserService = _UserService;
    }
    async UserLogin(UserLogin) {
        const result = await this._AuthService.ValidateUser(UserLogin.email, UserLogin.password);
        return { Type: ResponseEnum_1.ResponseEnum.Success, Message: 'Login Successfully', result };
    }
    async ForgotPassword(ForgotPasswordData) {
        const Result = await this._UserService.ForgotPassword(ForgotPasswordData.email);
        if (Result.status) {
            return this.SendResponse(ResponseEnum_1.ResponseEnum.Success, "Forgot password request accepted, please check mail");
        }
        else {
            return this.SendResponse(ResponseEnum_1.ResponseEnum.Error, Result.message);
        }
    }
    async ResetPassword(ResetPasswordData) {
        await this._UserService.ResetPassword(ResetPasswordData);
        return this.SendResponse(ResponseEnum_1.ResponseEnum.Success, "Password reseted successfully");
    }
};
exports.LoginController = LoginController;
__decorate([
    (0, common_1.Post)('Login'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [UserLogin_model_1.UserLoginModel]),
    __metadata("design:returntype", Promise)
], LoginController.prototype, "UserLogin", null);
__decorate([
    (0, common_1.Post)('ForgotPassword'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [User_model_1.ForgotPasswordModel]),
    __metadata("design:returntype", Promise)
], LoginController.prototype, "ForgotPassword", null);
__decorate([
    (0, common_1.Post)('ResetPassword'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [User_model_1.ResetPasswordModel]),
    __metadata("design:returntype", Promise)
], LoginController.prototype, "ResetPassword", null);
exports.LoginController = LoginController = __decorate([
    (0, common_1.Controller)({ path: "Auth", version: '1' }),
    (0, swagger_1.ApiTags)("Auth"),
    __metadata("design:paramtypes", [Auth_service_1.AuthService,
        User_service_1.UserService])
], LoginController);
//# sourceMappingURL=Login.controller.js.map