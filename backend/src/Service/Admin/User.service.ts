import { BadRequestException, ForbiddenException, HttpException, HttpStatus, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { user } from '@Database/Table/Admin/user';
import { user_role } from '@Database/Table/Admin/user_role';
import { ChangePasswordModel, UserModel } from '@Model/Admin/User.model';
import { ResetPasswordDto } from '@Model/Auth/Auth.model';
import { bumpTokenVersion, isUndefinedColumn, rowsOf } from '@Service/Auth/SessionVersion';
import { randomInt } from 'crypto';
import { Logger } from '@nestjs/common';
import { Not } from 'typeorm';
import { EmailService } from '../Email.service';
import { EncryptionService } from '../Encryption.service';
import { AuditLogService } from './AuditLog.service';
import { LogActionEnum } from '@Helper/Enum/AuditLogEnum';
const MAX_RESET_OTP_FAILURES = 5;
const RESET_OTP_TTL_MS = 10 * 60 * 1000;
const RESET_COOLDOWN_MS = 30 * 1000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);
  /** Fallback wrong-code counter used only while user.reset_otp_attempts does not exist (migration pending). */
  private memAttempts = new Map<string, number>();
  constructor(
    private _EmailService: EmailService,
    private _EncryptionService: EncryptionService,
    private _AuditLogService: AuditLogService
  ) {
  }

  /** tenantId === null means Super Admin / cross-tenant; otherwise every query is pinned to that company. */
  private scope(tenantId: string | null) {
    return tenantId ? { company_id: tenantId } : {};
  }

  /** A tenant (non Super Admin) must never hand out a Super Admin role. */
  private async assertRoleAllowed(roleId: string, tenantId: string | null) {
    if (!tenantId || !roleId) return;
    const role = await user_role.findOne({ where: { id: roleId } });
    if (!role) throw new BadRequestException('Invalid role');
    if (`${role.name} ${role.code}`.toLowerCase().includes('super')) {
      throw new ForbiddenException('You cannot assign this role');
    }
  }

  async GetAllExpectSuperAdmin(tenantId: string | null = null) {
    return await user.find({ where: { id: Not('0'), ...this.scope(tenantId) }, relations: ['user_role'] });
  }

  async GetIdsByTenant(tenantId: string | null): Promise<string[] | null> {
    if (!tenantId) return null;
    const rows = await user.find({ where: { company_id: tenantId }, select: ['id'] as any });
    return rows.map((r) => r.id);
  }

  async GetById(UserId: string, tenantId: string | null = null) {
    return user.findOne({ where: { id: UserId, ...this.scope(tenantId) } });
  }

  async Insert(UserData: UserModel, UserId: string, tenantId: string | null = null) {
    await this.assertRoleAllowed(UserData.user_role_id, tenantId);
    const _UserData = new user();
    const targetCompany = tenantId || (UserData as any).company_id;
    if (!targetCompany) throw new BadRequestException('A tenant is required to create a user');
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
    await user.insert(_UserData);
    this._AuditLogService.AuditEmitEvent({ PerformedType: user.name, ActionType: LogActionEnum.Insert, PrimaryId: [_UserData.id] });
    return _UserData;
  }

  async Update(Id: string, UserData: UserModel, UserId: string, tenantId: string | null = null) {
    const UserUpdateData = await user.findOne({ where: { id: Id, ...this.scope(tenantId) } });
    if (!UserUpdateData) {
      throw new NotFoundException('Record not found')
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
    await user.update(Id, UserUpdateData);
    this._AuditLogService.AuditEmitEvent({ PerformedType: user.name, ActionType: LogActionEnum.Update, PrimaryId: [UserUpdateData.id] });
    return UserUpdateData;
  }

  async SuspendOrActivate(Id: string, UserId: string, tenantId: string | null = null) {
    const UserData = await user.findOne({ where: { id: Id, ...this.scope(tenantId) } });
    if (!UserData) {
      throw new NotFoundException('User not found');
    }
    UserData.updated_by_id = UserId;
    UserData.updated_on = new Date();
    UserData.status = !UserData.status;
    await UserData.save();
    if (UserData.status == true) {
      this._AuditLogService.AuditEmitEvent({ PerformedType: user.name, ActionType: LogActionEnum.Active, PrimaryId: [UserData.id] });
    }
    else {
      this._AuditLogService.AuditEmitEvent({ PerformedType: user.name, ActionType: LogActionEnum.Suspend, PrimaryId: [UserData.id] });
    }
    return UserData;
  }

  /**
   * Always resolves with the same generic result, whether or not the e-mail is registered, active,
   * throttled or the mail transport is down - so the endpoint cannot be used to find valid accounts.
   * The e-mail is sent in the background for the same reason.
   */
  async ForgotPassword(EmailId: string) {
    const generic = { status: true, message: 'If an account exists for this email, a reset code has been sent.' };
    const UserData = await user.findOne({ where: { email: (EmailId || '').toLowerCase().trim() } });
    if (!UserData || UserData.status === false) return generic;

    // 30s cooldown per account (the code's expiry minus its lifetime = when it was issued)
    const issuedAt = UserData.reset_otp_expires_at ? new Date(UserData.reset_otp_expires_at).getTime() - RESET_OTP_TTL_MS : 0;
    if (UserData.reset_otp && Date.now() - issuedAt < RESET_COOLDOWN_MS) return generic;

    UserData.reset_otp = randomInt(100000, 1000000);
    UserData.reset_otp_expires_at = new Date(Date.now() + RESET_OTP_TTL_MS);
    await UserData.save();
    await this.clearResetAttempts(UserData.id);
    const EncryptedUserId = this._EncryptionService.Encrypt(String(UserData.id));
    this._EmailService
      .ForgotPassword(UserData.email, UserData.reset_otp, EncryptedUserId)
      .catch((e: any) => this.logger.error(`Reset e-mail to ${UserData.email} failed: ${e?.message}`));
    return generic;
  }

  /**
   * Resets the password from a 6-digit code. The account is identified either by the encrypted
   * `user_id` from the e-mail link or by `email` (what the sign-in screen sends).
   * Every "who/what is wrong" case returns the same 400 so nothing about accounts or codes leaks.
   */
  async ResetPassword(dto: ResetPasswordDto) {
    const viaLink = !!dto.user_id;
    const invalid = () => new BadRequestException(viaLink ? 'Invalid or expired reset link' : 'Invalid or expired reset code');

    let UserData: user | null = null;
    if (dto.user_id) {
      let decryptedId = '';
      try {
        decryptedId = this._EncryptionService.Decrypt(dto.user_id);
      } catch {
        decryptedId = '';
      }
      // validate BEFORE any query: a non-UUID would otherwise reach Postgres and come back as a 500
      if (!decryptedId || !UUID_RE.test(decryptedId)) throw invalid();
      UserData = await user.findOne({ where: { id: decryptedId } });
    } else if (dto.email) {
      UserData = await user.findOne({ where: { email: dto.email.toLowerCase().trim() } });
    } else {
      throw invalid();
    }
    if (!UserData || UserData.status === false || !UserData.reset_otp) throw invalid();

    if (Number(UserData.reset_otp) !== Number(dto.reset_otp)) {
      // atomic counter in the DB (shared by all instances); destroy the code at the limit
      const attempts = await this.bumpResetAttempts(UserData.id);
      if (attempts >= MAX_RESET_OTP_FAILURES) {
        await user.query(`UPDATE "user" SET reset_otp = NULL, reset_otp_expires_at = NULL WHERE id = $1`, [UserData.id]);
        throw new HttpException('Too many incorrect codes. Please request a new reset code.', HttpStatus.TOO_MANY_REQUESTS);
      }
      throw invalid();
    }
    if ((await this.readResetAttempts(UserData.id)) >= MAX_RESET_OTP_FAILURES) {
      throw new HttpException('Too many incorrect codes. Please request a new reset code.', HttpStatus.TOO_MANY_REQUESTS);
    }

    // Single-use + atomic: the WHERE re-checks the code and expiry, so two parallel requests can not both win.
    // token_version + 1 kills every JWT issued before the reset.
    const hash = await this._EncryptionService.HashPassword(dto.password);
    const params = [hash, UserData.id, Number(dto.reset_otp)];
    const where = `WHERE id = $2::uuid AND reset_otp = $3 AND reset_otp_expires_at > now() AND status = true RETURNING id`;
    let updated: any[];
    try {
      updated = rowsOf(await user.query(
        `UPDATE "user" SET password = $1, reset_otp = NULL, reset_otp_expires_at = NULL, reset_otp_attempts = 0,
                token_version = token_version + 1, updated_by_id = $2::text, updated_on = now() ${where}`,
        params
      ));
    } catch (e) {
      if (!isUndefinedColumn(e)) throw e; // migration pending: reset still works, old sessions just are not revoked
      updated = rowsOf(await user.query(
        `UPDATE "user" SET password = $1, reset_otp = NULL, reset_otp_expires_at = NULL,
                updated_by_id = $2::text, updated_on = now() ${where}`,
        params
      ));
    }
    if (!updated.length) throw invalid();
    this.memAttempts.delete(UserData.id);
    return true;
  }

  // -- wrong-code counter: DB column once migrated, in-memory before ------------------------------------------
  private async bumpResetAttempts(id: string): Promise<number> {
    try {
      const [r] = rowsOf(await user.query(`UPDATE "user" SET reset_otp_attempts = reset_otp_attempts + 1 WHERE id = $1 RETURNING reset_otp_attempts`, [id]));
      return r ? Number(r.reset_otp_attempts) : 0;
    } catch (e) {
      if (!isUndefinedColumn(e)) throw e;
      const n = (this.memAttempts.get(id) || 0) + 1;
      this.memAttempts.set(id, n);
      return n;
    }
  }

  private async readResetAttempts(id: string): Promise<number> {
    try {
      const rows = rowsOf(await user.query(`SELECT reset_otp_attempts FROM "user" WHERE id = $1`, [id]));
      return Number(rows[0]?.reset_otp_attempts) || 0;
    } catch (e) {
      if (!isUndefinedColumn(e)) throw e;
      return this.memAttempts.get(id) || 0;
    }
  }

  private async clearResetAttempts(id: string): Promise<void> {
    this.memAttempts.delete(id);
    try {
      await user.query(`UPDATE "user" SET reset_otp_attempts = 0 WHERE id = $1`, [id]);
    } catch (e) {
      if (!isUndefinedColumn(e)) throw e;
    }
  }

  async ChangePassword(UserId: string, ChangePasswordData: ChangePasswordModel) {
    const UserData = await user.findOne({ where: { id: UserId } });
    if (!UserData) {
      throw new NotFoundException("User not found");
    }
    const { valid } = await this._EncryptionService.VerifyPassword(ChangePasswordData.old_password, UserData.password);
    if (!valid) {
      throw new UnauthorizedException("Old password not matched");
    }
    UserData.password = await this._EncryptionService.HashPassword(ChangePasswordData.password);
    UserData.updated_by_id = UserId;
    UserData.updated_on = new Date();
    await UserData.save();
    await bumpTokenVersion(UserData.id); // sign out every session that used the old password
    return true;
  }

  async UserResetPassword(Id: string, UserData: UserModel, UserId: string, tenantId: string | null = null) {
    const target = await user.findOne({ where: { id: Id, ...this.scope(tenantId) } });
    if (!target) throw new NotFoundException('User not found');
    // Only the password is changed here; never let the body overwrite role/company/etc.
    const hashed = await this._EncryptionService.HashPassword(UserData.password);
    await user.update(Id, { password: hashed, updated_by_id: UserId, updated_on: new Date() } as any);
    await bumpTokenVersion(Id); // the old password's sessions must not survive an admin reset
    this._AuditLogService.AuditEmitEvent({ PerformedType: user.name, ActionType: LogActionEnum.ResetPassword, PrimaryId: [Id] });
    return target;
  }
}
