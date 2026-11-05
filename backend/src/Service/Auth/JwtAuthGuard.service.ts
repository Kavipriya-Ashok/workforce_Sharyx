import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Browsers cannot attach an Authorization header to <audio src> or EventSource requests.
 * For exactly these two read-only GET endpoints a bearer token may be passed as `?access_token=`.
 * Every other route requires the normal `Authorization: Bearer <jwt>` header.
 */
const QUERY_TOKEN_PATHS = [/\/voice\/calls\/audio$/i, /\/omnichannel\/stream$/i];

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    const token = req.query?.access_token;
    if (
      !req.headers?.authorization &&
      req.method === 'GET' &&
      typeof token === 'string' &&
      token &&
      QUERY_TOKEN_PATHS.some((re) => re.test((req.path || req.url || '').split('?')[0]))
    ) {
      req.headers.authorization = `Bearer ${token}`;
    }
    return super.canActivate(context);
  }
}
