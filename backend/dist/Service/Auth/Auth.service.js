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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var AuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const typeorm_1 = require("typeorm");
const company_1 = require("../../Database/Table/Admin/company");
const user_1 = require("../../Database/Table/Admin/user");
const EmailAccountConfig_entity_1 = require("../../Database/Table/Email/EmailAccountConfig.entity");
const email_config_1 = require("../../Database/Table/Admin/email_config");
const Encryption_service_1 = require("../Encryption.service");
const nodemailer_1 = __importDefault(require("nodemailer"));
const googleapis_1 = require("googleapis");
const TenantBootstrap_1 = require("./TenantBootstrap");
const AuthOtp_service_1 = require("./AuthOtp.service");
const SessionVersion_1 = require("./SessionVersion");
const MAX_LOGIN_FAILURES = 5;
const LOGIN_LOCKOUT_MS = 10 * 60 * 1000;
const MAX_TRACKED_LOGINS = 10000;
const GENERIC_SENT = 'If this email can be registered, a verification code has been sent. Please check your inbox (and spam folder).';
const INVALID_CODE = 'Invalid or expired verification code. Please request a new code.';
const escapeHtml = (v) => v.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let AuthService = AuthService_1 = class AuthService {
    constructor(_JwtService, _EncryptionService, _DataSource, _AuthOtp) {
        this._JwtService = _JwtService;
        this._EncryptionService = _EncryptionService;
        this._DataSource = _DataSource;
        this._AuthOtp = _AuthOtp;
        this.logger = new common_1.Logger(AuthService_1.name);
        this.loginAttempts = new Map();
        this.dummyHash = this._EncryptionService.HashPassword(`timing-equaliser-${Math.random()}-${Date.now()}`);
    }
    assertNotLockedOut(key) {
        const rec = this.loginAttempts.get(key);
        if ((rec === null || rec === void 0 ? void 0 : rec.lockedUntil) && rec.lockedUntil > Date.now()) {
            const waitMin = Math.ceil((rec.lockedUntil - Date.now()) / 60000);
            throw new common_1.HttpException(`Too many failed attempts. Please try again in ${waitMin} minute(s).`, common_1.HttpStatus.TOO_MANY_REQUESTS);
        }
    }
    recordLoginFailure(key) {
        if (this.loginAttempts.size >= MAX_TRACKED_LOGINS)
            this.pruneLoginAttempts();
        const rec = this.loginAttempts.get(key) || { failures: 0, touched: Date.now() };
        rec.failures += 1;
        rec.touched = Date.now();
        if (rec.failures >= MAX_LOGIN_FAILURES) {
            rec.lockedUntil = Date.now() + LOGIN_LOCKOUT_MS;
            rec.failures = 0;
        }
        this.loginAttempts.set(key, rec);
    }
    pruneLoginAttempts() {
        const now = Date.now();
        for (const [k, r] of this.loginAttempts) {
            if ((r.lockedUntil || 0) < now && now - r.touched > LOGIN_LOCKOUT_MS)
                this.loginAttempts.delete(k);
        }
        while (this.loginAttempts.size >= MAX_TRACKED_LOGINS) {
            const first = this.loginAttempts.keys().next().value;
            if (first === undefined)
                break;
            this.loginAttempts.delete(first);
        }
    }
    clearLoginFailures(key) {
        this.loginAttempts.delete(key);
    }
    async ValidateUser(username, password) {
        var _a;
        const cleanEmail = (username || '').toLowerCase().trim();
        this.assertNotLockedOut(cleanEmail);
        const UserData = await user_1.user.findOne({ where: { email: cleanEmail }, relations: ['user_role', 'company'] });
        if (!UserData) {
            await this._EncryptionService.VerifyPassword(password, await this.dummyHash);
            this.recordLoginFailure(cleanEmail);
            throw new common_1.UnauthorizedException('Invalid email or password');
        }
        const { valid, needsRehash } = await this._EncryptionService.VerifyPassword(password, UserData.password);
        if (!valid) {
            this.recordLoginFailure(cleanEmail);
            throw new common_1.UnauthorizedException('Invalid email or password');
        }
        if (UserData.status == false) {
            throw new common_1.UnauthorizedException('User suspended, contact administration');
        }
        this.clearLoginFailures(cleanEmail);
        if (needsRehash) {
            UserData.password = await this._EncryptionService.HashPassword(password);
            await UserData.save();
        }
        let tenantCompany = UserData.company || (UserData.company_id ? await company_1.company.findOne({ where: { id: UserData.company_id } }) : null);
        if (!tenantCompany && !UserData.company_id && process.env.LEGACY_USER_AUTOLINK !== 'false') {
            const [oldest] = await company_1.company.find({ order: { created_on: 'ASC' }, take: 1 });
            if (oldest) {
                UserData.company_id = oldest.id;
                await UserData.save();
                if (!oldest.onboarding_completed && !oldest.onboarding_data) {
                    oldest.onboarding_completed = true;
                    await oldest.save();
                }
                tenantCompany = oldest;
                this.logger.warn(`Legacy user ${cleanEmail} had no company; linked to oldest company ${oldest.id}`);
            }
        }
        if (!tenantCompany) {
            throw new common_1.UnauthorizedException('Account is not linked to a tenant. Please contact support.');
        }
        const roleName = ((_a = UserData.user_role) === null || _a === void 0 ? void 0 : _a.name) || 'Admin';
        const payload = {
            email: UserData.email,
            user_id: UserData.id,
            user_role_id: UserData.user_role_id,
            user_role_name: roleName,
            is_super_admin: roleName.toLowerCase().includes("super"),
            company_id: tenantCompany.id,
            tenant_id: tenantCompany.id,
            token_version: await (0, SessionVersion_1.getTokenVersion)(UserData.id),
        };
        const api_token = this._JwtService.sign(payload);
        return {
            api_token,
            user: {
                id: UserData.id,
                email: UserData.email,
                first_name: UserData.first_name || 'Admin',
                last_name: UserData.last_name || 'User',
                mobile: UserData.mobile,
                role: roleName,
                company_name: tenantCompany.name,
                tenant_id: tenantCompany.id,
                tenantId: tenantCompany.id,
                onboarding_completed: roleName.toLowerCase().includes('super') ? true : !!tenantCompany.onboarding_completed,
                onboarding_step: tenantCompany.onboarding_step || 1,
            },
        };
    }
    async logout(userId) {
        if (!userId)
            return;
        await (0, SessionVersion_1.bumpTokenVersion)(userId);
    }
    debugOtpEnabled() {
        return process.env.AUTH_DEBUG_OTP === 'true' && process.env.NODE_ENV !== 'production';
    }
    async sendSignupOtp(email, name) {
        const cleanEmail = (email || '').toLowerCase().trim();
        const existing = await user_1.user.findOne({ where: { email: cleanEmail }, select: ['id'] });
        if (existing) {
            await this._AuthOtp.issue(cleanEmail, null);
            this.deliver(cleanEmail, 'Your Sharyx AI account', this.accountExistsHtml(name));
        }
        else {
            const otp = this._AuthOtp.generate();
            await this._AuthOtp.issue(cleanEmail, otp, name);
            if (this.debugOtpEnabled()) {
                this.logger.log(`🔑 [SIGNUP OTP GENERATED] Email: ${cleanEmail} | OTP Code: ${otp}`);
            }
            else {
                this.deliver(cleanEmail, 'Your Sharyx AI Verification Code', this.otpHtml(otp, name));
            }
        }
        return { ok: true, message: GENERIC_SENT };
    }
    async resendSignupOtp(email) {
        return this.sendSignupOtp(email);
    }
    async verifySignupOtp(dto) {
        const cleanEmail = dto.email.toLowerCase().trim();
        const passwordHash = await this._EncryptionService.HashPassword(dto.password);
        let failure = null;
        let created = null;
        try {
            created = await this._DataSource.transaction(async (em) => {
                const row = await this._AuthOtp.lock(em, cleanEmail);
                if (!row) {
                    failure = { status: common_1.HttpStatus.BAD_REQUEST, message: INVALID_CODE };
                    return null;
                }
                if (row.failed_attempts >= AuthOtp_service_1.OTP_MAX_FAILED) {
                    failure = { status: common_1.HttpStatus.TOO_MANY_REQUESTS, message: 'Too many incorrect attempts. Please request a new verification code later.' };
                    return null;
                }
                if (row.expired) {
                    await this._AuthOtp.consume(em, cleanEmail);
                    failure = { status: common_1.HttpStatus.BAD_REQUEST, message: INVALID_CODE };
                    return null;
                }
                if (!this._AuthOtp.matches(row, cleanEmail, dto.otp)) {
                    const lockedNow = await this._AuthOtp.recordFailure(em, cleanEmail);
                    failure = lockedNow
                        ? { status: common_1.HttpStatus.TOO_MANY_REQUESTS, message: 'Too many incorrect attempts. Please request a new verification code later.' }
                        : { status: common_1.HttpStatus.BAD_REQUEST, message: 'Invalid verification code. Please check and try again.' };
                    return null;
                }
                await this._AuthOtp.consume(em, cleanEmail);
                const alreadyThere = await em.getRepository(user_1.user).findOne({ where: { email: cleanEmail }, select: ['id'] });
                if (alreadyThere) {
                    failure = { status: common_1.HttpStatus.BAD_REQUEST, message: INVALID_CODE };
                    return null;
                }
                const role = await (0, TenantBootstrap_1.ensureAdminRole)(em);
                const firstName = dto.first_name || row.name || cleanEmail.split('@')[0];
                const tenant = await (0, TenantBootstrap_1.createTenant)(dto.company_name || `${firstName}'s Company`, cleanEmail, em);
                const userRecord = new user_1.user();
                userRecord.email = cleanEmail;
                userRecord.first_name = firstName;
                userRecord.last_name = dto.last_name || '';
                userRecord.password = passwordHash;
                userRecord.mobile = dto.mobile || '';
                userRecord.user_role_id = role.id;
                userRecord.company_id = tenant.id;
                userRecord.status = true;
                const saved = await em.getRepository(user_1.user).save(userRecord);
                return { userRecord: saved, tenant, role };
            });
        }
        catch (e) {
            if ((e === null || e === void 0 ? void 0 : e.code) === '23505') {
                throw new common_1.BadRequestException(INVALID_CODE);
            }
            throw e;
        }
        if (failure)
            throw new common_1.HttpException(failure.message, failure.status);
        const { userRecord, tenant, role } = created;
        const payload = {
            email: userRecord.email,
            user_id: userRecord.id,
            user_role_id: userRecord.user_role_id,
            user_role_name: role.name,
            is_super_admin: false,
            company_id: tenant.id,
            tenant_id: tenant.id,
            token_version: 0,
        };
        const api_token = this._JwtService.sign(payload);
        this.logger.log(`✅ [SIGNUP COMPLETED] User ${cleanEmail} verified and registered successfully! tenant=${tenant.id}`);
        return {
            api_token,
            user: {
                id: userRecord.id,
                email: userRecord.email,
                first_name: userRecord.first_name,
                last_name: userRecord.last_name,
                username: dto.username || cleanEmail.split('@')[0],
                mobile: userRecord.mobile,
                company_name: tenant.name,
                role: role.name,
                email_verified: true,
                tenant_id: tenant.id,
                tenantId: tenant.id,
                onboarding_completed: false,
            },
        };
    }
    otpHtml(otp, userName) {
        return `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 36px 24px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 20px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="display: inline-block; background: linear-gradient(135deg, #2563eb, #4f46e5); color: #ffffff; font-weight: 900; font-size: 20px; padding: 12px 24px; border-radius: 12px;">Sharyx AI</div>
        </div>
        <h2 style="color: #0f172a; font-size: 22px; font-weight: 800; text-align: center; margin: 0 0 10px 0;">Verify Your Email Address</h2>
        <p style="color: #475569; font-size: 14px; text-align: center; margin: 0 0 24px 0; line-height: 1.5;">
          Hello ${escapeHtml(userName || 'there')}! Use the following 6-digit verification code to complete your registration on Sharyx Workforce AI.
        </p>
        <div style="background: #f8fafc; border: 2px dashed #94a3b8; border-radius: 16px; padding: 24px; text-align: center; margin-bottom: 24px;">
          <span style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 900; letter-spacing: 10px; color: #1e293b; display: inline-block;">${otp}</span>
        </div>
        <p style="color: #64748b; font-size: 13px; text-align: center; margin: 0 0 16px 0;">
          This verification code expires in <strong>10 minutes</strong>. If you did not request this verification, please disregard this email.
        </p>
        <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; text-align: center;">
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">© 2026 Sharyx Autonomous Workforce Inc. All rights reserved.</p>
        </div>
      </div>`;
    }
    accountExistsHtml(userName) {
        const base = (process.env.FRONTEND_URL || process.env.DOMAIN_NAME || '').replace(/\/+$/, '');
        return `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 36px 24px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 20px;">
        <h2 style="color: #0f172a; font-size: 20px; text-align: center; margin: 0 0 12px 0;">You already have a Sharyx AI account</h2>
        <p style="color: #475569; font-size: 14px; text-align: center; line-height: 1.5;">
          Hello ${escapeHtml(userName || 'there')}, someone (hopefully you) tried to sign up with this email address, but it is already registered.
          Please <a href="${base}/login">sign in</a>, or use “Forgot password?” on the sign-in page if you cannot remember your password.
          If this was not you, you can safely ignore this message.
        </p>
      </div>`;
    }
    deliver(to, subject, html) {
        this.dispatchEmail(to, subject, html)
            .then((r) => {
            if (!r.success)
                this.logger.error(`Email delivery to ${to} failed: ${r.error}`);
        })
            .catch((e) => this.logger.error(`Email delivery to ${to} crashed: ${e === null || e === void 0 ? void 0 : e.message}`));
    }
    async dispatchEmail(toEmail, subject, html) {
        try {
            const emailConfig = await EmailAccountConfig_entity_1.EmailAccountConfig.findOne({ where: { is_active: true, tenant_id: 'default' }, order: { updated_on: 'DESC' } });
            if (emailConfig) {
                if (emailConfig.provider === 'google-email' && emailConfig.refresh_token) {
                    let refreshToken = emailConfig.refresh_token;
                    try {
                        refreshToken = this._EncryptionService.Decrypt(emailConfig.refresh_token);
                    }
                    catch (_a) { }
                    const oauth2Client = new googleapis_1.google.auth.OAuth2(emailConfig.client_id || process.env.GOOGLE_CLIENT_ID, emailConfig.client_secret || process.env.GOOGLE_CLIENT_SECRET, process.env.GOOGLE_REDIRECT_URI);
                    oauth2Client.setCredentials({ refresh_token: refreshToken });
                    const gmail = googleapis_1.google.gmail({ version: 'v1', auth: oauth2Client });
                    const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
                    const emailLines = [
                        `From: "Sharyx AI" <${emailConfig.email_address}>`,
                        `To: ${toEmail}`,
                        'Content-Type: text/html; charset=utf-8',
                        'MIME-Version: 1.0',
                        `Subject: ${utf8Subject}`,
                        '',
                        html,
                    ];
                    const rawEmail = Buffer.from(emailLines.join('\r\n')).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
                    await gmail.users.messages.send({ userId: 'me', requestBody: { raw: rawEmail } });
                    this.logger.log(`📧 [EMAILED via GMAIL API] Successfully sent to ${toEmail}`);
                    return { success: true };
                }
                else if (emailConfig.smtp_host && (emailConfig.smtp_user || emailConfig.email_address)) {
                    let pass = emailConfig.smtp_password;
                    try {
                        pass = this._EncryptionService.Decrypt(emailConfig.smtp_password);
                    }
                    catch (_b) { }
                    const transporter = nodemailer_1.default.createTransport({
                        host: emailConfig.smtp_host,
                        port: Number(emailConfig.smtp_port) || 587,
                        secure: Number(emailConfig.smtp_port) === 465,
                        auth: {
                            user: emailConfig.smtp_user || emailConfig.email_address,
                            pass: pass,
                        },
                        tls: { rejectUnauthorized: false },
                    });
                    await transporter.sendMail({
                        from: `"Sharyx AI" <${emailConfig.email_address || emailConfig.smtp_user}>`,
                        to: toEmail,
                        subject,
                        html,
                    });
                    this.logger.log(`📧 [EMAILED via SMTP Config] Successfully sent to ${toEmail}`);
                    return { success: true };
                }
            }
        }
        catch (e) {
            this.logger.warn(`EmailAccountConfig delivery failed: ${e.message}. Trying environment/fallback transporter...`);
        }
        if (process.env.SMTP_HOST && (process.env.SMTP_USER || process.env.SMTP_PASS)) {
            try {
                const cleanPass = (process.env.SMTP_PASS || process.env.SMTP_PASSWORD || '').replace(/\s+/g, '');
                const cleanUser = (process.env.SMTP_USER || '').trim();
                const rawFrom = (process.env.SMTP_FROM || '').trim();
                const fromHeader = rawFrom.includes('<') && rawFrom.includes('>')
                    ? rawFrom
                    : `"Sharyx Workforce AI" <${cleanUser}>`;
                const transporter = nodemailer_1.default.createTransport({
                    host: process.env.SMTP_HOST || 'smtp.gmail.com',
                    port: Number(process.env.SMTP_PORT) || 587,
                    secure: process.env.SMTP_SECURE === 'true' || Number(process.env.SMTP_PORT) === 465,
                    auth: {
                        user: cleanUser,
                        pass: cleanPass,
                    },
                    tls: { rejectUnauthorized: false },
                });
                await transporter.sendMail({ from: fromHeader, to: toEmail, subject, html });
                this.logger.log(`📧 [EMAILED via ENV SMTP] Successfully sent to ${toEmail}`);
                return { success: true };
            }
            catch (e) {
                this.logger.warn(`ENV SMTP delivery failed: ${e.message}`);
            }
        }
        try {
            const legacy = await email_config_1.email_config.find();
            if (legacy.length > 0 && legacy[0].host && legacy[0].email_id) {
                let pass = legacy[0].password;
                try {
                    pass = this._EncryptionService.Decrypt(legacy[0].password);
                }
                catch (_c) { }
                const transporter = nodemailer_1.default.createTransport({
                    host: legacy[0].host,
                    auth: {
                        user: legacy[0].email_id,
                        pass: pass,
                    },
                    tls: { rejectUnauthorized: false },
                });
                await transporter.sendMail({
                    from: `"${legacy[0].mailer_name || 'Sharyx AI'}" <${legacy[0].email_id}>`,
                    to: toEmail,
                    subject,
                    html,
                });
                this.logger.log(`📧 [EMAILED via legacy config] Successfully sent to ${toEmail}`);
                return { success: true };
            }
        }
        catch (e) {
            this.logger.warn(`Legacy email_config delivery failed: ${e.message}`);
        }
        if (process.env.NODE_ENV === 'production') {
            return { success: false, error: 'No email transport is configured' };
        }
        try {
            const testAccount = await nodemailer_1.default.createTestAccount();
            const transporter = nodemailer_1.default.createTransport({
                host: 'smtp.ethereal.email',
                port: 587,
                secure: false,
                auth: {
                    user: testAccount.user,
                    pass: testAccount.pass,
                },
            });
            const info = await transporter.sendMail({
                from: '"Sharyx AI System" <noreply@sharyx.ai>',
                to: toEmail,
                subject,
                html,
            });
            const previewUrl = nodemailer_1.default.getTestMessageUrl(info) || undefined;
            this.logger.log(`📧 [DEV EMAIL DISPATCHED TO ETHEREAL] Preview URL: ${previewUrl}`);
            return { success: true, previewUrl };
        }
        catch (e) {
            this.logger.error(`Ethereal fallback dispatch failed: ${e.message}`);
            return { success: false, error: e.message };
        }
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [jwt_1.JwtService,
        Encryption_service_1.EncryptionService,
        typeorm_1.DataSource,
        AuthOtp_service_1.AuthOtpService])
], AuthService);
//# sourceMappingURL=Auth.service.js.map