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
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
const common_1 = require("@nestjs/common");
const user_1 = require("../../Database/Table/Admin/user");
const Common_helper_1 = require("../../Helper/Common.helper");
const typeorm_1 = require("typeorm");
const Email_service_1 = require("../Email.service");
const Encryption_service_1 = require("../Encryption.service");
const AuditLog_service_1 = require("./AuditLog.service");
const AuditLogEnum_1 = require("../../Helper/Enum/AuditLogEnum");
let UserService = class UserService {
    constructor(_EmailService, _EncryptionService, _AuditLogService) {
        this._EmailService = _EmailService;
        this._EncryptionService = _EncryptionService;
        this._AuditLogService = _AuditLogService;
    }
    async GetAllExpectSuperAdmin() {
        return await user_1.user.find({ where: { id: (0, typeorm_1.Not)('0') }, relations: ['user_role'] });
    }
    async GetById(UserId) {
        return user_1.user.findOne({ where: { id: UserId } });
    }
    async Insert(UserData, UserId) {
        const _UserData = new user_1.user();
        _UserData.user_role_id = UserData.user_role_id;
        _UserData.first_name = UserData.first_name;
        _UserData.last_name = UserData.last_name;
        _UserData.email = UserData.email;
        _UserData.password = UserData.password;
        _UserData.mobile = UserData.mobile;
        _UserData.created_by_id = UserId;
        _UserData.created_on = new Date();
        _UserData.password = this._EncryptionService.Encrypt(UserData.password);
        await user_1.user.insert(_UserData);
        this._AuditLogService.AuditEmitEvent({ PerformedType: user_1.user.name, ActionType: AuditLogEnum_1.LogActionEnum.Insert, PrimaryId: [_UserData.id] });
        return _UserData;
    }
    async Update(Id, UserData, UserId) {
        const UserUpdateData = await user_1.user.findOne({ where: { id: Id } });
        if (!UserUpdateData) {
            throw new Error('Record not found');
        }
        UserUpdateData.user_role_id = UserData.user_role_id;
        UserUpdateData.first_name = UserData.first_name;
        UserUpdateData.last_name = UserData.last_name;
        UserUpdateData.email = UserData.email;
        UserUpdateData.password = UserData.password;
        UserUpdateData.mobile = UserData.mobile;
        UserUpdateData.updated_by_id = UserId;
        UserUpdateData.updated_on = new Date();
        delete UserUpdateData.password;
        delete UserUpdateData.email;
        await user_1.user.update(Id, UserUpdateData);
        this._AuditLogService.AuditEmitEvent({ PerformedType: user_1.user.name, ActionType: AuditLogEnum_1.LogActionEnum.Update, PrimaryId: [UserUpdateData.id] });
        return UserUpdateData;
    }
    async SuspendOrActivate(Id, UserId) {
        const UserData = await user_1.user.findOne({ where: { id: Id } });
        if (!UserData) {
            throw new Error('User not found');
        }
        UserData.updated_by_id = UserId;
        UserData.updated_on = new Date();
        UserData.status = !UserData.status;
        await UserData.save();
        if (UserData.status == true) {
            this._AuditLogService.AuditEmitEvent({ PerformedType: user_1.user.name, ActionType: AuditLogEnum_1.LogActionEnum.Active, PrimaryId: [UserData.id] });
        }
        else {
            this._AuditLogService.AuditEmitEvent({ PerformedType: user_1.user.name, ActionType: AuditLogEnum_1.LogActionEnum.Suspend, PrimaryId: [UserData.id] });
        }
        return UserData;
    }
    async ForgotPassword(EmailId) {
        const UserData = await user_1.user.findOne({ where: { email: EmailId } });
        if (!UserData) {
            throw new Error("User not found");
        }
        UserData.reset_otp = (0, Common_helper_1.RandomValue)(100000, 999999);
        await UserData.save();
        let EncryptedUserId = this._EncryptionService.Encrypt(String(UserData.id));
        return await this._EmailService.ForgotPassword(EmailId, UserData.reset_otp, EncryptedUserId);
    }
    async ResetPassword(ResetPasswordData) {
        const UserData = await user_1.user.findOne({ where: { id: this._EncryptionService.Decrypt(ResetPasswordData.user_id) } });
        if (!UserData) {
            throw new Error("User not found");
        }
        if (UserData.reset_otp != ResetPasswordData.reset_otp) {
            throw new Error("Invalid Reset OTP");
        }
        UserData.password = this._EncryptionService.Encrypt(ResetPasswordData.password);
        UserData.reset_otp = null;
        UserData.updated_by_id = UserData.id;
        UserData.updated_on = new Date();
        await UserData.save();
        return true;
    }
    async ChangePassword(UserId, ChangePasswordData) {
        const UserData = await user_1.user.findOne({ where: { id: UserId } });
        if (!UserData) {
            throw new Error("User not found");
        }
        if (this._EncryptionService.Decrypt(UserData.password) != ChangePasswordData.old_password) {
            throw new Error("Old password not matched");
        }
        UserData.password = this._EncryptionService.Encrypt(ChangePasswordData.password);
        UserData.updated_by_id = UserId;
        UserData.updated_on = new Date();
        await UserData.save();
        return true;
    }
    async UserResetPassword(Id, UserData, UserId) {
        UserData.updated_by_id = UserId;
        UserData.updated_on = new Date();
        UserData.password = this._EncryptionService.Encrypt(UserData.password);
        await user_1.user.update(Id, UserData);
        this._AuditLogService.AuditEmitEvent({ PerformedType: user_1.user.name, ActionType: AuditLogEnum_1.LogActionEnum.ResetPassword, PrimaryId: [UserData.id] });
        return UserData;
    }
};
exports.UserService = UserService;
exports.UserService = UserService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [Email_service_1.EmailService,
        Encryption_service_1.EncryptionService,
        AuditLog_service_1.AuditLogService])
], UserService);
//# sourceMappingURL=User.service.js.map