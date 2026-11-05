import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

/**
 * Pins every request to the tenant in the verified JWT.
 *
 * Many controllers historically read the tenant from client-controlled places
 * (`x-tenant-id` header, `?tenantId=` / `?tenant_id=` query, `tenantId` / `tenant_id` in the body).
 * This guard (it must run AFTER JwtAuthGuard) overwrites all of them with the trusted value, so
 * those controllers can no longer be pointed at another tenant.
 *
 * Only a Super Admin (role is inside the signed token) may choose a tenant via `x-tenant-id`
 * (or `all`). Everyone else is always forced to their own tenant.
 */
@Injectable()
export class TenantContextGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const user = req.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }

    const isSuperAdmin =
      user.is_super_admin === true ||
      (typeof user.user_role_name === 'string' && user.user_role_name.toLowerCase().includes('super'));

    let tenant: string | undefined = user.tenant_id || user.company_id;
    if (isSuperAdmin) {
      const requested = req.headers?.['x-tenant-id'];
      if (typeof requested === 'string' && requested.trim()) tenant = requested.trim();
      else if (!tenant) tenant = 'all';
    }
    if (!tenant) {
      throw new UnauthorizedException('No tenant is associated with this account');
    }

    req.headers['x-tenant-id'] = tenant;

    // Express 5 exposes req.query as a getter, so replace it with an own property.
    const query = { ...(req.query || {}) };
    query.tenantId = tenant;
    query.tenant_id = tenant;
    Object.defineProperty(req, 'query', { value: query, writable: true, configurable: true, enumerable: true });

    if (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) {
      for (const key of ['tenantId', 'tenant_id', 'active_tenant_id']) {
        if (key in req.body) req.body[key] = tenant;
      }
    }
    return true;
  }
}
