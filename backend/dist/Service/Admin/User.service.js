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
var UserService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
const common_1 = require("@nestjs/common");
const user_1 = require("../../Database/Table/Admin/user");
const user_role_1 = require("../../Database/Table/Admin/user_role");
const SessionVersion_1 = require("../Auth/SessionVersion");
const crypto_1 = require("crypto");
const common_2 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
const Email_service_1 = require("../Email.service");
const Encryption_service_1 = require("../Encryption.service");
const AuditLog_service_1 = require("./AuditLog.service");
const AuditLogEnum_1 = require("../../Helper/Enum/AuditLogEnum");
const MAX_RESET_OTP_FAILURES = 5;
const RESET_OTP_TTL_MS = 10 * 60 * 1000;
const RESET_COOLDOWN_MS = 30 * 1000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
let UserService = UserService_1 = class UserService {
    constructor(_EmailService, _EncryptionService, _AuditLogService) {
        this._EmailService = _EmailService;
        this._EncryptionService = _EncryptionService;
        this._AuditLogService = _AuditLogService;
        this.logger = new common_2.Logger(UserService_1.name);
        this.memAttempts = new Map();
    }
    scope(tenantId) {
        return tenantId ? { company_id: tenantId } : {};
    }
    async assertRoleAllowed(roleId, tenantId) {
        if (!tenantId || !roleId)
            return;
        const role = await user_role_1.user_role.findOne({ where: { id: roleId } });
        if (!role)
            throw new common_1.BadRequestException('Invalid role');
        if (`${role.name} ${role.code}`.toLowerCase().includes('super')) {
            throw new common_1.ForbiddenException('You cannot assign this role');
        }
    }
    async GetAllExpectSuperAdmin(tenantId = null) {
        return await user_1.user.find({ where: Object.assign({ id: (0, typeorm_1.Not)('0') }, this.scope(tenantId)), relations: ['user_role'] });
    }
    async GetIdsByTenant(tenantId) {
        if (!tenantId)
            return null;
        const rows = await user_1.user.find({ where: { company_id: tenantId }, select: ['id'] });
        return rows.map((r) => r.id);
    }
    async GetById(UserId, tenantId = null) {
        return user_1.user.findOne({ where: Object.assign({ id: UserId }, this.scope(tenantId)) });
    }
    async Insert(UserData, UserId, tenantId = null) {
        await this.assertRoleAllowed(UserData.user_role_id, tenantId);
        const _UserData = new user_1.user();
        const targetCompany = tenantId || UserData.company_id;
        if (!targetCompany)
            throw new common_1.BadRequestException('A tenant is required to create a user');
        _UserData.company_id = targetCompany;
        _UserData.user_role_id = UserData.user_role_id;
        _UserData.first_name = UserData.first_name;
        _UserData.last_name = UserData.last_name;
        _UserData.email = UserData.email;
        _UserData.password = UserData.password;
        _UserData.mobile = UserData.mobile;
        _UserData.created_by_id = UserId;
        _UserData.created_on = new Date();
        _UserData.password = await this._EncryptionService.HashPassword(UserData.password);
        await user_1.user.insert(_UserData);
        this._AuditLogService.AuditEmitEvent({ PerformedType: user_1.user.name, ActionType: AuditLogEnum_1.LogActionEnum.Insert, PrimaryId: [_UserData.id] });
        return _UserData;
    }
    async Update(Id, UserData, UserId, tenantId = null) {
        const UserUpdateData = await user_1.user.findOne({ where: Object.assign({ id: Id }, this.scope(tenantId)) });
        if (!UserUpdateData) {
            throw new common_1.NotFoundException('Record not found');
        }
        await this.assertRoleAllowed(UserData.user_role_id, tenantId);
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
    async SuspendOrActivate(Id, UserId, tenantId = null) {
        const UserData = await user_1.user.findOne({ where: Object.assign({ id: Id }, this.scope(tenantId)) });
        if (!UserData) {
            throw new common_1.NotFoundException('User not found');
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
        const generic = { status: true, message: 'If an account exists for this email, a reset code has been sent.' };
        const UserData = await user_1.user.findOne({ where: { email: (EmailId || '').toLowerCase().trim() } });
        if (!UserData || UserData.status === false)
            return generic;
        const issuedAt = UserData.reset_otp_expires_at ? new Date(UserData.reset_otp_expires_at).getTime() - RESET_OTP_TTL_MS : 0;
        if (UserData.reset_otp && Date.now() - issuedAt < RESET_COOLDOWN_MS)
            return generic;
        UserData.reset_otp = (0, crypto_1.randomInt)(100000, 1000000);
        UserData.reset_otp_expires_at = new Date(Date.now() + RESET_OTP_TTL_MS);
        await UserData.save();
        await this.clearResetAttempts(UserData.id);
        const EncryptedUserId = this._EncryptionService.Encrypt(String(UserData.id));
        this._EmailService
            .ForgotPassword(UserData.email, UserData.reset_otp, EncryptedUserId)
            .catch((e) => this.logger.error(`Reset e-mail to ${UserData.email} failed: ${e === null || e === void 0 ? void 0 : e.message}`));
        return generic;
    }
    async ResetPassword(dto) {
        const viaLink = !!dto.user_id;
        const invalid = () => new common_1.BadRequestException(viaLink ? 'Invalid or expired reset link' : 'Invalid or expired reset code');
        let UserData = null;
        if (dto.user_id) {
            let decryptedId = '';
            try {
                decryptedId = this._EncryptionService.Decrypt(dto.user_id);
            }
            catch (_a) {
                decryptedId = '';
            }
            if (!decryptedId || !UUID_RE.test(decryptedId))
                throw invalid();
            UserData = await user_1.user.findOne({ where: { id: decryptedId } });
        }
        else if (dto.email) {
            UserData = await user_1.user.findOne({ where: { email: dto.email.toLowerCase().trim() } });
        }
        else {
            throw invalid();
        }
        if (!UserData || UserData.status === false || !UserData.reset_otp)
            throw invalid();
        if (Number(UserData.reset_otp) !== Number(dto.reset_otp)) {
            const attempts = await this.bumpResetAttempts(UserData.id);
            if (attempts >= MAX_RESET_OTP_FAILURES) {
                await user_1.user.query(`UPDATE "user" SET reset_otp = NULL, reset_otp_expires_at = NULL WHERE id = $1`, [UserData.id]);
                throw new common_1.HttpException('Too many incorrect codes. Please request a new reset code.', common_1.HttpStatus.TOO_MANY_REQUESTS);
            }
            throw invalid();
        }
        if ((await this.readResetAttempts(UserData.id)) >= MAX_RESET_OTP_FAILURES) {
            throw new common_1.HttpException('Too many incorrect codes. Please request a new reset code.', common_1.HttpStatus.TOO_MANY_REQUESTS);
        }
        const hash = await this._EncryptionService.HashPassword(dto.password);
        const params = [hash, UserData.id, Number(dto.reset_otp)];
        const where = `WHERE id = $2::uuid AND reset_otp = $3 AND reset_otp_expires_at > now() AND status = true RETURNING id`;
        let updated;
        try {
            updated = (0, SessionVersion_1.rowsOf)(await user_1.user.query(`UPDATE "user" SET password = $1, reset_otp = NULL, reset_otp_expires_at = NULL, reset_otp_attempts = 0,
                token_version = token_version + 1, updated_by_id = $2::text, updated_on = now() ${where}`, params));
        }
        catch (e) {
            if (!(0, SessionVersion_1.isUndefinedColumn)(e))
                throw e;
            updated = (0, SessionVersion_1.rowsOf)(await user_1.user.query(`UPDATE "user" SET password = $1, reset_otp = NULL, reset_otp_expires_at = NULL,
                updated_by_id = $2::text, updated_on = now() ${where}`, params));
        }
        if (!updated.length)
            throw invalid();
        this.memAttempts.delete(UserData.id);
        return true;
    }
    async bumpResetAttempts(id) {
        try {
            const [r] = (0, SessionVersion_1.rowsOf)(await user_1.user.query(`UPDATE "user" SET reset_otp_attempts = reset_otp_attempts + 1 WHERE id = $1 RETURNING reset_otp_attempts`, [id]));
            return r ? Number(r.reset_otp_attempts) : 0;
        }
        catch (e) {
            if (!(0, SessionVersion_1.isUndefinedColumn)(e))
                throw e;
            const n = (this.memAttempts.get(id) || 0) + 1;
            this.memAttempts.set(id, n);
            return n;
        }
    }
    async readResetAttempts(id) {
        var _a;
        try {
            const rows = (0, SessionVersion_1.rowsOf)(await user_1.user.query(`SELECT reset_otp_attempts FROM "user" WHERE id = $1`, [id]));
            return Number((_a = rows[0]) === null || _a === void 0 ? void 0 : _a.reset_otp_attempts) || 0;
        }
        catch (e) {
            if (!(0, SessionVersion_1.isUndefinedColumn)(e))
                throw e;
            return this.memAttempts.get(id) || 0;
        }
    }
    async clearResetAttempts(id) {
        this.memAttempts.delete(id);
        try {
            await user_1.user.query(`UPDATE "user" SET reset_otp_attempts = 0 WHERE id = $1`, [id]);
        }
        catch (e) {
            if (!(0, SessionVersion_1.isUndefinedColumn)(e))
                throw e;
        }
    }
    async ChangePassword(UserId, ChangePasswordData) {
        const UserData = await user_1.user.findOne({ where: { id: UserId } });
        if (!UserData) {
            throw new common_1.NotFoundException("User not found");
        }
        const { valid } = await this._EncryptionService.VerifyPassword(ChangePasswordData.old_password, UserData.password);
        if (!valid) {
            throw new common_1.UnauthorizedException("Old password not matched");
        }
        UserData.password = await this._EncryptionService.HashPassword(ChangePasswordData.password);
        UserData.updated_by_id = UserId;
        UserData.updated_on = new Date();
        await UserData.save();
        await (0, SessionVersion_1.bumpTokenVersion)(UserData.id);
        return true;
    }
    async UserResetPassword(Id, UserData, UserId, tenantId = null) {
        const target = await user_1.user.findOne({ where: Object.assign({ id: Id }, this.scope(tenantId)) });
        if (!target)
            throw new common_1.NotFoundException('User not found');
        const hashed = await this._EncryptionService.HashPassword(UserData.password);
        await user_1.user.update(Id, { password: hashed, updated_by_id: UserId, updated_on: new Date() });
        await (0, SessionVersion_1.bumpTokenVersion)(Id);
        this._AuditLogService.AuditEmitEvent({ PerformedType: user_1.user.name, ActionType: AuditLogEnum_1.LogActionEnum.ResetPassword, PrimaryId: [Id] });
        return target;
    }
};
exports.UserService = UserService;
exports.UserService = UserService = UserService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [Email_service_1.EmailService,
        Encryption_service_1.EncryptionService,
        AuditLog_service_1.AuditLogService])
], UserService);
//# sourceMappingURL=User.service.js.map