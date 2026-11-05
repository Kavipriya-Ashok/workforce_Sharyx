import { BadRequestException, HttpException, HttpStatus, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DataSource } from 'typeorm';
import { randomInt } from 'crypto';
import { google } from 'googleapis';
import { company } from '@Database/Table/Admin/company';
import { user } from '@Database/Table/Admin/user';
import { EmailAccountConfig } from '@Database/Table/Email/EmailAccountConfig.entity';
import { EncryptionService } from '../Encryption.service';
import { ensureAdminRole, ensureCountryAndCurrency } from './TenantBootstrap';
import { getTokenVersion } from './SessionVersion';

/**
 * Google sign-in / sign-up.
 *
 * SECURITY: identity is only ever taken from something Google itself vouches for:
 *   - `code`:       exchanged server-side with our client secret, then userinfo is fetched
 *   - `credential`: a Google ID token whose signature, audience, issuer and expiry are verified
 * A caller-supplied `email`/`name` is NEVER trusted, and the client id/secret come only
 * from the environment (no secrets in source).
 */
@Injectable()
export class GoogleAuthService {
  private readonly logger = new Logger(GoogleAuthService.name);

  constructor(
    private readonly _JwtService: JwtService,
    private readonly _EncryptionService: EncryptionService,
    private readonly _DataSource: DataSource
  ) {}

  async authenticate(dto: { code?: string; redirect_uri?: string; credential?: string }): Promise<any> {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!clientId) {
      throw new HttpException('Google sign-in is not configured on this server.', HttpStatus.SERVICE_UNAVAILABLE);
    }
    if (!dto?.code && !dto?.credential) {
      throw new BadRequestException('A Google authorization code or ID token is required.');
    }

    let googleEmail = '';
    let googleName = '';
    let googlePicture = '';
    let emailVerified = false;
    let linkTokens: any = null;

    try {
      if (dto.code) {
        if (!clientSecret) throw new Error('Google client secret is not configured');
        const redirectUri = dto.redirect_uri || process.env.GOOGLE_REDIRECT_URI;
        const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
        const { tokens } = await oauth2Client.getToken(dto.code);
        oauth2Client.setCredentials(tokens);
        linkTokens = tokens;
        const info = await google.oauth2({ version: 'v2', auth: oauth2Client }).userinfo.get();
        googleEmail = info.data.email || '';
        googleName = info.data.name || info.data.given_name || '';
        googlePicture = info.data.picture || '';
        emailVerified = info.data.verified_email === true;
      } else {
        const verifier = new google.auth.OAuth2(clientId);
        const ticket = await verifier.verifyIdToken({ idToken: dto.credential as string, audience: clientId });
        const p = ticket.getPayload();
        googleEmail = p?.email || '';
        googleName = p?.name || p?.given_name || '';
        googlePicture = p?.picture || '';
        emailVerified = p?.email_verified === true;
      }
    } catch (err: any) {
      this.logger.warn(`Google authentication rejected: ${err?.message}`);
      throw new UnauthorizedException('Google authentication failed.');
    }

    if (!googleEmail || !emailVerified) {
      throw new UnauthorizedException('Your Google account email is missing or not verified.');
    }

    const cleanEmail = googleEmail.toLowerCase().trim();
    let userRecord = await user.findOne({ where: { email: cleanEmail }, relations: ['user_role'] });
    let tenant: company | null = null;
    let isNewUser = false;

    if (!userRecord) {
      isNewUser = true;
      const created = await this.createUserWithTenant(cleanEmail, googleName);
      userRecord = created.user;
      tenant = created.tenant;
    } else {
      if (userRecord.status === false) {
        throw new UnauthorizedException('User suspended, contact administration');
      }
      tenant = userRecord.company_id ? await company.findOne({ where: { id: userRecord.company_id } }) : null;
      if (!tenant) {
        throw new UnauthorizedException('Account is not linked to a tenant. Please contact support.');
      }
    }

    // Link Gmail automation to THIS user's tenant only (never a hardcoded tenant).
    if (linkTokens && (linkTokens.refresh_token || linkTokens.access_token)) {
      try {
        let cfg = await EmailAccountConfig.findOne({ where: { email_address: cleanEmail, tenant_id: tenant.id } });
        if (!cfg) {
          cfg = new EmailAccountConfig();
          cfg.email_address = cleanEmail;
          cfg.tenant_id = tenant.id;
          cfg.created_on = new Date();
        }
        cfg.provider = 'google-email';
        cfg.display_name = googleName;
        cfg.client_id = clientId;
        cfg.client_secret = clientSecret as string;
        if (linkTokens.refresh_token) cfg.refresh_token = this._EncryptionService.Encrypt(linkTokens.refresh_token);
        if (linkTokens.access_token) cfg.access_token = linkTokens.access_token;
        if (linkTokens.expiry_date) cfg.token_expires_at = new Date(linkTokens.expiry_date);
        cfg.is_active = true;
        cfg.updated_on = new Date();
        await cfg.save();
      } catch (err: any) {
        this.logger.warn(`Could not auto-link EmailAccountConfig for Google user: ${err.message}`);
      }
    }

    const roleName = userRecord.user_role?.name || 'Admin';
    const isSuperAdmin = roleName.toLowerCase().includes('super');
    const api_token = this._JwtService.sign({
      email: userRecord.email,
      user_id: userRecord.id,
      user_role_id: userRecord.user_role_id,
      user_role_name: roleName,
      company_id: tenant.id,
      tenant_id: tenant.id,
      is_super_admin: isSuperAdmin,
      token_version: await getTokenVersion(userRecord.id),
    });
    this.logger.log(`Google sign-in OK: ${cleanEmail}${isNewUser ? ` (new tenant ${tenant.id})` : ''}`);

    return {
      api_token,
      user: {
        id: userRecord.id,
        email: userRecord.email,
        first_name: userRecord.first_name,
        last_name: userRecord.last_name,
        username: cleanEmail.split('@')[0],
        role: roleName,
        avatar: googlePicture,
        email_verified: true,
        company_name: tenant.name,
        tenant_id: tenant.id,
        tenantId: tenant.id,
        onboarding_completed: isSuperAdmin ? true : !!tenant.onboarding_completed,
        onboarding_step: tenant.onboarding_step || 1,
      },
    };
  }

  private async createUserWithTenant(email: string, displayName: string) {
    const { countryId, currencyId } = await ensureCountryAndCurrency();
    const role = await ensureAdminRole();
    const name = displayName || email.split('@')[0];
    const passwordHash = await this._EncryptionService.HashPassword(`${Date.now()}-${randomInt(1_000_000_000)}-${email}`);

    return this._DataSource.transaction(async (manager) => {
      const t = new company();
      t.name = `${name}'s Workspace`;
      t.address = '';
      t.postal_code = '';
      t.email = email;
      t.country_id = countryId;
      t.currency_id = currencyId;
      t.onboarding_completed = false;
      t.onboarding_step = 1;
      t.status = true;
      t.created_on = new Date();
      const tenant = await manager.save(t);

      const u = new user();
      u.email = email;
      u.first_name = name.split(' ')[0] || 'User';
      u.last_name = name.split(' ').slice(1).join(' ') || '';
      u.password = passwordHash; // random: Google users sign in via Google or use "forgot password"
      u.user_role_id = role.id;
      u.company_id = tenant.id;
      u.status = true;
      const saved = await manager.save(u);
      saved.user_role = role;
      return { user: saved, tenant };
    });
  }
}
