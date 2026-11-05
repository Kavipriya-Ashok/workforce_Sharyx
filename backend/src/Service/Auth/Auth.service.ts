import { BadRequestException, HttpException, HttpStatus, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DataSource } from 'typeorm';
import { company } from '@Database/Table/Admin/company';
import { user } from '@Database/Table/Admin/user';
import { EmailAccountConfig } from '@Database/Table/Email/EmailAccountConfig.entity';
import { email_config } from '@Database/Table/Admin/email_config';
import { VerifySignupOtpDto } from '@Model/Auth/Auth.model';
import { EncryptionService } from '../Encryption.service';
import nodemailer from 'nodemailer';
import { google } from 'googleapis';
import { createTenant, ensureAdminRole } from './TenantBootstrap';
import { AuthOtpService, OTP_MAX_FAILED } from './AuthOtp.service';
import { bumpTokenVersion, getTokenVersion } from './SessionVersion';

interface LoginAttemptRecord {
  failures: number;
  lockedUntil?: number;
  touched: number;
}

const MAX_LOGIN_FAILURES = 5;
const LOGIN_LOCKOUT_MS = 10 * 60 * 1000; // 10 minutes
const MAX_TRACKED_LOGINS = 10000; // cap so unknown e-mails cannot grow the map without bound

/** Same text whether the address is new, already registered, or locked out of requesting codes. */
const GENERIC_SENT = 'If this email can be registered, a verification code has been sent. Please check your inbox (and spam folder).';
const INVALID_CODE = 'Invalid or expired verification code. Please request a new code.';

const escapeHtml = (v: string) =>
  v.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  /** per-e-mail wrong-password lockout (in addition to the per-IP throttler on the controller) */
  private loginAttempts = new Map<string, LoginAttemptRecord>();
  /** A real scrypt hash of a throwaway password, so an unknown user costs the same CPU time as a known one. */
  private dummyHash: Promise<string>;

  constructor(
    private _JwtService: JwtService,
    private _EncryptionService: EncryptionService,
    private _DataSource: DataSource,
    private _AuthOtp: AuthOtpService
  ) {
    this.dummyHash = this._EncryptionService.HashPassword(`timing-equaliser-${Math.random()}-${Date.now()}`);
  }

  // ------------------------------------------------------------------ login lockout
  private assertNotLockedOut(key: string) {
    const rec = this.loginAttempts.get(key);
    if (rec?.lockedUntil && rec.lockedUntil > Date.now()) {
      const waitMin = Math.ceil((rec.lockedUntil - Date.now()) / 60000);
      throw new HttpException(`Too many failed attempts. Please try again in ${waitMin} minute(s).`, HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  private recordLoginFailure(key: string) {
    if (this.loginAttempts.size >= MAX_TRACKED_LOGINS) this.pruneLoginAttempts();
    const rec = this.loginAttempts.get(key) || { failures: 0, touched: Date.now() };
    rec.failures += 1;
    rec.touched = Date.now();
    if (rec.failures >= MAX_LOGIN_FAILURES) {
      rec.lockedUntil = Date.now() + LOGIN_LOCKOUT_MS;
      rec.failures = 0;
    }
    this.loginAttempts.set(key, rec);
  }

  private pruneLoginAttempts() {
    const now = Date.now();
    for (const [k, r] of this.loginAttempts) {
      if ((r.lockedUntil || 0) < now && now - r.touched > LOGIN_LOCKOUT_MS) this.loginAttempts.delete(k);
    }
    // still full of live entries -> drop the oldest so memory stays bounded
    while (this.loginAttempts.size >= MAX_TRACKED_LOGINS) {
      const first = this.loginAttempts.keys().next().value;
      if (first === undefined) break;
      this.loginAttempts.delete(first);
    }
  }

  private clearLoginFailures(key: string) {
    this.loginAttempts.delete(key);
  }

  // ------------------------------------------------------------------ login / logout
  async ValidateUser(username: string, password: string): Promise<any> {
    const cleanEmail = (username || '').toLowerCase().trim();
    this.assertNotLockedOut(cleanEmail);
    const UserData = await user.findOne({ where: { email: cleanEmail }, relations: ['user_role', 'company'] });

    if (!UserData) {
      // Burn the same scrypt time as a real check so response latency does not reveal whether the e-mail exists.
      await this._EncryptionService.VerifyPassword(password, await this.dummyHash);
      this.recordLoginFailure(cleanEmail);
      throw new UnauthorizedException('Invalid email or password');
    }
    const { valid, needsRehash } = await this._EncryptionService.VerifyPassword(password, UserData.password);
    if (!valid) {
      this.recordLoginFailure(cleanEmail);
      throw new UnauthorizedException('Invalid email or password');
    }
    // Only reveal "suspended" after the password is proven correct (no account-state enumeration).
    if (UserData.status == false) {
      throw new UnauthorizedException('User suspended, contact administration');
    }
    this.clearLoginFailures(cleanEmail);
    if (needsRehash) {
      // Transparently upgrade legacy reversible-AES passwords to one-way scrypt hashes on a
      // successful login, without ever requiring the user to reset anything.
      UserData.password = await this._EncryptionService.HashPassword(password);
      await UserData.save();
    }

    // Tenant is resolved strictly from the user's own linked company row — never from a
    // hardcoded id, a name match, or "the first company in the table".
    let tenantCompany = UserData.company || (UserData.company_id ? await company.findOne({ where: { id: UserData.company_id } }) : null);

    // Legacy accounts created before multi-tenancy have no company. Before that change every user
    // shared one tenant (the original company), so attach them to the OLDEST company, exactly as the
    // backfill migration does. Only after a successful password check. Disable with LEGACY_USER_AUTOLINK=false.
    if (!tenantCompany && !UserData.company_id && process.env.LEGACY_USER_AUTOLINK !== 'false') {
      const [oldest] = await company.find({ order: { created_on: 'ASC' }, take: 1 });
      if (oldest) {
        UserData.company_id = oldest.id;
        await UserData.save();
        if (!oldest.onboarding_completed && !oldest.onboarding_data) {
          oldest.onboarding_completed = true; // the original company predates the onboarding wizard
          await oldest.save();
        }
        tenantCompany = oldest;
        this.logger.warn(`Legacy user ${cleanEmail} had no company; linked to oldest company ${oldest.id}`);
      }
    }
    if (!tenantCompany) {
      throw new UnauthorizedException('Account is not linked to a tenant. Please contact support.');
    }

    const roleName = UserData.user_role?.name || 'Admin';

    const payload = {
      email: UserData.email,
      user_id: UserData.id,
      user_role_id: UserData.user_role_id,
      user_role_name: roleName,
      is_super_admin: roleName.toLowerCase().includes("super"),
      company_id: tenantCompany.id,
      tenant_id: tenantCompany.id,
      token_version: await getTokenVersion(UserData.id),
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

  /**
   * Server-side logout: bumps the user's token_version, which invalidates EVERY JWT issued so far
   * (this device and any other). The JwtStrategy compares the claim with the row on each request.
   */
  async logout(userId: string): Promise<void> {
    if (!userId) return;
    await bumpTokenVersion(userId);
  }

  // ------------------------------------------------------------------ signup OTP
  private debugOtpEnabled(): boolean {
    return process.env.AUTH_DEBUG_OTP === 'true' && process.env.NODE_ENV !== 'production';
  }

  /**
   * Step 1 of signup. ALWAYS answers the same way for a new address and an already-registered one
   * (no "account exists" error, same cooldown, same wrong-code lockout): the address owner is told
   * by e-mail instead. Delivery is fire-and-forget so response time does not leak existence either.
   */
  async sendSignupOtp(email: string, name?: string): Promise<{ ok: boolean; message: string }> {
    const cleanEmail = (email || '').toLowerCase().trim();
    const existing = await user.findOne({ where: { email: cleanEmail }, select: ['id'] as any });

    if (existing) {
      await this._AuthOtp.issue(cleanEmail, null); // decoy row: enforces the same cooldown
      this.deliver(cleanEmail, 'Your Sharyx AI account', this.accountExistsHtml(name));
    } else {
      const otp = this._AuthOtp.generate();
      await this._AuthOtp.issue(cleanEmail, otp, name);
      if (this.debugOtpEnabled()) {
        // Non-production test hook only (AUTH_DEBUG_OTP=true): the code is logged, never returned over HTTP.
        this.logger.log(`🔑 [SIGNUP OTP GENERATED] Email: ${cleanEmail} | OTP Code: ${otp}`);
      } else {
        this.deliver(cleanEmail, 'Your Sharyx AI Verification Code', this.otpHtml(otp, name));
      }
    }
    return { ok: true, message: GENERIC_SENT };
  }

  async resendSignupOtp(email: string): Promise<{ ok: boolean; message: string }> {
    return this.sendSignupOtp(email);
  }

  /**
   * Step 2 of signup. The code check, company, default role and user are ONE database transaction:
   * if anything fails, nothing is left behind (no orphan company) and the code is not consumed.
   * The code row is locked FOR UPDATE, so a double-click / parallel submit creates exactly one tenant.
   */
  async verifySignupOtp(dto: VerifySignupOtpDto): Promise<any> {
    const cleanEmail = dto.email.toLowerCase().trim();
    const passwordHash = await this._EncryptionService.HashPassword(dto.password); // CPU work outside the DB transaction

    let failure: { status: HttpStatus; message: string } | null = null;
    let created: { userRecord: user; tenant: company; role: any } | null = null;

    try {
      created = await this._DataSource.transaction(async (em) => {
        const row = await this._AuthOtp.lock(em, cleanEmail);
        if (!row) {
          failure = { status: HttpStatus.BAD_REQUEST, message: INVALID_CODE };
          return null;
        }
        if (row.failed_attempts >= OTP_MAX_FAILED) {
          failure = { status: HttpStatus.TOO_MANY_REQUESTS, message: 'Too many incorrect attempts. Please request a new verification code later.' };
          return null;
        }
        if (row.expired) {
          await this._AuthOtp.consume(em, cleanEmail);
          failure = { status: HttpStatus.BAD_REQUEST, message: INVALID_CODE };
          return null;
        }
        if (!this._AuthOtp.matches(row, cleanEmail, dto.otp)) {
          const lockedNow = await this._AuthOtp.recordFailure(em, cleanEmail);
          failure = lockedNow
            ? { status: HttpStatus.TOO_MANY_REQUESTS, message: 'Too many incorrect attempts. Please request a new verification code later.' }
            : { status: HttpStatus.BAD_REQUEST, message: 'Invalid verification code. Please check and try again.' };
          return null; // commit the failure counter
        }

        // Code is correct: consume it inside the SAME transaction (rolled back with everything else on error).
        await this._AuthOtp.consume(em, cleanEmail);

        const alreadyThere = await em.getRepository(user).findOne({ where: { email: cleanEmail }, select: ['id'] as any });
        if (alreadyThere) {
          failure = { status: HttpStatus.BAD_REQUEST, message: INVALID_CODE };
          return null;
        }

        const role = await ensureAdminRole(em);
        const firstName = dto.first_name || row.name || cleanEmail.split('@')[0];
        const tenant = await createTenant(dto.company_name || `${firstName}'s Company`, cleanEmail, em);

        const userRecord = new user();
        userRecord.email = cleanEmail;
        userRecord.first_name = firstName;
        userRecord.last_name = dto.last_name || '';
        userRecord.password = passwordHash;
        userRecord.mobile = dto.mobile || '';
        userRecord.user_role_id = role.id;
        userRecord.company_id = tenant.id;
        userRecord.status = true;
        const saved = await em.getRepository(user).save(userRecord);
        return { userRecord: saved, tenant, role };
      });
    } catch (e: any) {
      if (e?.code === '23505') {
        // unique(user.email): a parallel signup won the race; the transaction already rolled back.
        throw new BadRequestException(INVALID_CODE);
      }
      throw e;
    }

    if (failure) throw new HttpException((failure as any).message, (failure as any).status);
    const { userRecord, tenant, role } = created!;

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
        onboarding_completed: false, // new signups proceed to the onboarding wizard
      },
    };
  }

  // ------------------------------------------------------------------ e-mail
  private otpHtml(otp: string, userName?: string): string {
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

  /** Sent instead of a code when someone starts a signup with an address that already has an account. */
  private accountExistsHtml(userName?: string): string {
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

  /** Fire-and-forget: delivery problems are logged, never returned (they would reveal whether the address exists). */
  private deliver(to: string, subject: string, html: string) {
    this.dispatchEmail(to, subject, html)
      .then((r) => {
        if (!r.success) this.logger.error(`Email delivery to ${to} failed: ${r.error}`);
      })
      .catch((e) => this.logger.error(`Email delivery to ${to} crashed: ${e?.message}`));
  }

  /** Dispatches an HTML e-mail across the configured channels (Gmail API, DB SMTP, env SMTP, legacy, Ethereal in dev). */
  private async dispatchEmail(toEmail: string, subject: string, html: string): Promise<{ success: boolean; previewUrl?: string; error?: string }> {
    // 1. Check for Active EmailAccountConfig in DB (SMTP or Google OAuth)
    try {
      const emailConfig = await EmailAccountConfig.findOne({ where: { is_active: true, tenant_id: 'default' }, order: { updated_on: 'DESC' } });
      if (emailConfig) {
        if (emailConfig.provider === 'google-email' && emailConfig.refresh_token) {
          let refreshToken = emailConfig.refresh_token;
          try {
            refreshToken = this._EncryptionService.Decrypt(emailConfig.refresh_token);
          } catch { }
          const oauth2Client = new google.auth.OAuth2(
            emailConfig.client_id || process.env.GOOGLE_CLIENT_ID,
            emailConfig.client_secret || process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URI
          );
          oauth2Client.setCredentials({ refresh_token: refreshToken });
          const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
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
        } else if (emailConfig.smtp_host && (emailConfig.smtp_user || emailConfig.email_address)) {
          let pass = emailConfig.smtp_password;
          try {
            pass = this._EncryptionService.Decrypt(emailConfig.smtp_password);
          } catch { }
          const transporter = nodemailer.createTransport({
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
    } catch (e: any) {
      this.logger.warn(`EmailAccountConfig delivery failed: ${e.message}. Trying environment/fallback transporter...`);
    }

    // 2. Check for Environment SMTP variables
    if (process.env.SMTP_HOST && (process.env.SMTP_USER || process.env.SMTP_PASS)) {
      try {
        const cleanPass = (process.env.SMTP_PASS || process.env.SMTP_PASSWORD || '').replace(/\s+/g, '');
        const cleanUser = (process.env.SMTP_USER || '').trim();
        const rawFrom = (process.env.SMTP_FROM || '').trim();
        const fromHeader = rawFrom.includes('<') && rawFrom.includes('>')
          ? rawFrom
          : `"Sharyx Workforce AI" <${cleanUser}>`;

        const transporter = nodemailer.createTransport({
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
      } catch (e: any) {
        this.logger.warn(`ENV SMTP delivery failed: ${e.message}`);
      }
    }

    // 3. Check legacy admin email_config table
    try {
      const legacy = await email_config.find();
      if (legacy.length > 0 && legacy[0].host && legacy[0].email_id) {
        let pass = legacy[0].password;
        try {
          pass = this._EncryptionService.Decrypt(legacy[0].password);
        } catch { }
        const transporter = nodemailer.createTransport({
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
    } catch (e: any) {
      this.logger.warn(`Legacy email_config delivery failed: ${e.message}`);
    }

    // 4. In development/testing only, dispatch via an Ethereal test account (viewable preview URL is logged)
    if (process.env.NODE_ENV === 'production') {
      return { success: false, error: 'No email transport is configured' };
    }
    try {
      const testAccount = await nodemailer.createTestAccount();
      const transporter = nodemailer.createTransport({
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
      const previewUrl = nodemailer.getTestMessageUrl(info) || undefined;
      this.logger.log(`📧 [DEV EMAIL DISPATCHED TO ETHEREAL] Preview URL: ${previewUrl}`);
      return { success: true, previewUrl };
    } catch (e: any) {
      this.logger.error(`Ethereal fallback dispatch failed: ${e.message}`);
      return { success: false, error: e.message };
    }
  }
}
