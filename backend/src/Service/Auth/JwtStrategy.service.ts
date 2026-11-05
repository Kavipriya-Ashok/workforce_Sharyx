import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { readSession } from './SessionVersion';
import { ConfigService } from '@nestjs/config';
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private _ConfigService: ConfigService) {
    const secret = _ConfigService.get("JWT.SecertToken");
    if (!secret) {
      // Never fall back to a secret that is committed in source control.
      throw new Error("TOKEN_SECRET is not configured. Refusing to start without a JWT signing secret.");
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  /**
   * Runs for EVERY authenticated request (all controllers, not only those with TenantContextGuard).
   * A correctly-signed token is still rejected when the account was deleted or suspended, or when its
   * token_version is older than the user's current one (logout, password reset/change, admin reset).
   * Tokens issued before this feature carry no claim and count as version 0.
   */
  async validate(payload: any) {
    if (!payload?.user_id) throw new UnauthorizedException('Unauthorized');
    const row = await readSession(payload.user_id);
    if (!row || row.status === false || row.tokenVersion !== (Number(payload.token_version) || 0)) {
      throw new UnauthorizedException('Session expired. Please sign in again.');
    }
    return payload;
  }
}
