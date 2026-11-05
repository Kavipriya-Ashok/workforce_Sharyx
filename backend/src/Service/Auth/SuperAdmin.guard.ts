import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { isSuperAdminUser } from '@Helper/Common.helper';

/**
 * For system-wide resources that are shared by every tenant (error logs, platform email config,
 * the role catalogue). Must run AFTER JwtAuthGuard. Only a Super Admin (role is inside the signed
 * JWT) may use the endpoint.
 */
@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const user = context.switchToHttp().getRequest().user;
    if (!isSuperAdminUser(user)) {
      throw new ForbiddenException('Only a Super Admin can perform this action');
    }
    return true;
  }
}
