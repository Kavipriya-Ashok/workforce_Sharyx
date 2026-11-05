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
exports.LoginController = exports.AUTH_THROTTLE_LIMIT = exports.AUTH_THROTTLE_TTL_MS = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const throttler_1 = require("@nestjs/throttler");
const ResponseEnum_1 = require("../../Helper/Enum/ResponseEnum");
const SafeBody_pipe_1 = require("../../Helper/SafeBody.pipe");
const Auth_model_1 = require("../../Model/Auth/Auth.model");
const User_service_1 = require("../../Service/Admin/User.service");
const Auth_service_1 = require("../../Service/Auth/Auth.service");
const GoogleAuth_service_1 = require("../../Service/Auth/GoogleAuth.service");
const JwtAuthGuard_service_1 = require("../../Service/Auth/JwtAuthGuard.service");
const AuthBase_controller_1 = require("../AuthBase.controller");
const num = (v, d) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : d);
exports.AUTH_THROTTLE_TTL_MS = num(process.env.AUTH_THROTTLE_TTL_MS, 60000);
exports.AUTH_THROTTLE_LIMIT = num(process.env.AUTH_THROTTLE_LIMIT, 30);
const SENSITIVE = { default: { limit: num(process.env.AUTH_THROTTLE_SENSITIVE_LIMIT, 10), ttl: exports.AUTH_THROTTLE_TTL_MS } };
let LoginController = class LoginController extends AuthBase_controller_1.AuthBaseController {
    constructor(_AuthService, _UserService, _GoogleAuthService) {
        super();
        this._AuthService = _AuthService;
        this._UserService = _UserService;
        this._GoogleAuthService = _GoogleAuthService;
    }
    async UserLogin(UserLogin) {
        const result = await this._AuthService.ValidateUser(UserLogin.email, UserLogin.password);
        return { Type: ResponseEnum_1.ResponseEnum.Success, Message: 'Login Successfully', result };
    }
    async Logout(req) {
        var _a;
        await this._AuthService.logout((_a = req.user) === null || _a === void 0 ? void 0 : _a.user_id);
        return { Type: ResponseEnum_1.ResponseEnum.Success, Message: 'Logged out' };
    }
    async SendSignupOtp(body) {
        const result = await this._AuthService.sendSignupOtp(body.email, body.name);
        return { Type: ResponseEnum_1.ResponseEnum.Success, Message: result.message, result };
    }
    async ResendSignupOtp(body) {
        const result = await this._AuthService.resendSignupOtp(body.email);
        return { Type: ResponseEnum_1.ResponseEnum.Success, Message: result.message, result };
    }
    async VerifySignupOtp(body) {
        const result = await this._AuthService.verifySignupOtp(body);
        return { Type: ResponseEnum_1.ResponseEnum.Success, Message: 'Account verified and registered successfully!', result };
    }
    async GoogleAuth(body) {
        const result = await this._GoogleAuthService.authenticate({
            code: body.code,
            redirect_uri: body.redirect_uri,
            credential: body.credential,
        });
        return { Type: ResponseEnum_1.ResponseEnum.Success, Message: 'Google authentication successful', result };
    }
    async ForgotPassword(ForgotPasswordData) {
        await this._UserService.ForgotPassword(ForgotPasswordData.email);
        return this.SendResponse(ResponseEnum_1.ResponseEnum.Success, "Forgot password request accepted, please check mail");
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
    __metadata("design:paramtypes", [Auth_model_1.LoginDto]),
    __metadata("design:returntype", Promise)
], LoginController.prototype, "UserLogin", null);
__decorate([
    (0, common_1.Post)('Logout'),
    (0, common_1.UseGuards)(JwtAuthGuard_service_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], LoginController.prototype, "Logout", null);
__decorate([
    (0, common_1.Post)('SendSignupOtp'),
    (0, throttler_1.Throttle)(SENSITIVE),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Auth_model_1.SendSignupOtpDto]),
    __metadata("design:returntype", Promise)
], LoginController.prototype, "SendSignupOtp", null);
__decorate([
    (0, common_1.Post)('ResendSignupOtp'),
    (0, throttler_1.Throttle)(SENSITIVE),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Auth_model_1.ResendSignupOtpDto]),
    __metadata("design:returntype", Promise)
], LoginController.prototype, "ResendSignupOtp", null);
__decorate([
    (0, common_1.Post)('VerifySignupOtp'),
    (0, throttler_1.Throttle)(SENSITIVE),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Auth_model_1.VerifySignupOtpDto]),
    __metadata("design:returntype", Promise)
], LoginController.prototype, "VerifySignupOtp", null);
__decorate([
    (0, common_1.Post)('GoogleAuth'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Auth_model_1.GoogleAuthDto]),
    __metadata("design:returntype", Promise)
], LoginController.prototype, "GoogleAuth", null);
__decorate([
    (0, common_1.Post)('ForgotPassword'),
    (0, throttler_1.Throttle)(SENSITIVE),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Auth_model_1.ForgotPasswordDto]),
    __metadata("design:returntype", Promise)
], LoginController.prototype, "ForgotPassword", null);
__decorate([
    (0, common_1.Post)('ResetPassword'),
    (0, throttler_1.Throttle)(SENSITIVE),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Auth_model_1.ResetPasswordDto]),
    __metadata("design:returntype", Promise)
], LoginController.prototype, "ResetPassword", null);
exports.LoginController = LoginController = __decorate([
    (0, common_1.Controller)({ path: "Auth", version: '1' }),
    (0, swagger_1.ApiTags)("Auth"),
    (0, common_1.UseGuards)(throttler_1.ThrottlerGuard),
    (0, throttler_1.Throttle)({ default: { limit: exports.AUTH_THROTTLE_LIMIT, ttl: exports.AUTH_THROTTLE_TTL_MS } }),
    (0, common_1.UsePipes)(new SafeBody_pipe_1.SafeBodyPipe(), new common_1.ValidationPipe({
        whitelist: true,
        transform: true,
        stopAtFirstError: true,
        exceptionFactory: (errors) => new common_1.BadRequestException(errors.map((e) => Object.values(e.constraints || { x: 'Invalid value' })[0]).join('\n')),
    })),
    __metadata("design:paramtypes", [Auth_service_1.AuthService,
        User_service_1.UserService,
        GoogleAuth_service_1.GoogleAuthService])
], LoginController);
//# sourceMappingURL=Login.controller.js.map