import { createParamDecorator, UnauthorizedException } from "@nestjs/common";
import { format, differenceInDays } from "date-fns";
import "reflect-metadata";

export const CurrentUser = createParamDecorator((data, req) => {
  const request = req.getArgs()[0];
  if (request?.user?.user_id) {
    return request.user.user_id;
  } else {
    return 0;
  }
});

/** True only for a genuine Super Admin (role/flag come from the signed JWT, never from the client). */
export const isSuperAdminUser = (user: any): boolean =>
  !!user &&
  (user.is_super_admin === true ||
    (typeof user.user_role_name === "string" && user.user_role_name.toLowerCase().includes("super")));

/**
 * Resolves the tenant (company) for the current request.
 *
 * SECURITY: the tenant comes ONLY from the verified JWT (populated by
 * JwtAuthGuard). A client-supplied header/query/body value is never trusted,
 * except for a genuine Super Admin (flag comes from the signed token) who may
 * impersonate a tenant via `x-tenant-id`, or pass `all` => null (cross-tenant).
 * Anyone else without a tenant claim is rejected.
 */
export const CurrentTenant = createParamDecorator((data, req) => {
  const request = req.getArgs()[0];
  const user = request?.user;
  if (!user) {
    throw new UnauthorizedException("Authentication required");
  }
  const isSuperAdmin =
    user.is_super_admin === true ||
    (typeof user.user_role_name === "string" && user.user_role_name.toLowerCase().includes("super"));
  if (isSuperAdmin) {
    const requested = request?.headers?.['x-tenant-id'];
    if (requested === 'all') return null;
    if (requested && typeof requested === 'string') return requested;
  }
  const tenantId = user.tenant_id || user.company_id;
  if (!tenantId) {
    throw new UnauthorizedException("No tenant is associated with this account");
  }
  return tenantId;
});

export const RandomValue = (min: any, max: any) => {
  return Math.floor(Math.random() * (max - min) + min);
};

export const DateFormatForDB = (SourceDate: Date | null) => {
  if (SourceDate) {
    SourceDate = new Date(SourceDate);
    let FormattedDate = "";
    if (SourceDate?.getDate()) {
      FormattedDate = format(SourceDate, "yyyy-MM-dd");
    }
    return FormattedDate;
  } else {
    return null;
  }
};

export const DBDateTimeStart = (SourceDate: Date | null) => {
  if (SourceDate) {
    let FormattedDate;
    if (SourceDate?.getDate()) {
      SourceDate.setHours(0);
      SourceDate.setMinutes(0);
      SourceDate.setSeconds(0);
      SourceDate.setMilliseconds(0);
      FormattedDate = format(SourceDate, "yyyy-MM-dd HH:mm");
    }
    return FormattedDate;
  } else {
    return null;
  }
};

export const DBDateTimeEnd = (SourceDate: Date | null) => {
  if (SourceDate) {
    let FormattedDate;
    if (SourceDate?.getDate()) {
      SourceDate.setHours(23);
      SourceDate.setMinutes(59);
      SourceDate.setSeconds(59);
      SourceDate.setMilliseconds(0);
      FormattedDate = format(SourceDate, "yyyy-MM-dd HH:mm");
    }
    return FormattedDate;
  } else {
    return null;
  }
};

export const DateFormatForReport = (SourceDate: Date | null) => {
  if (SourceDate) {
    let FormattedDate = "";
    if (SourceDate?.getDate()) {
      FormattedDate = format(SourceDate, "dd-MMM-yyyy");
    }
    return FormattedDate;
  } else {
    return null;
  }
};

export const DateComparison = (StartDate: Date, EndDate: Date) => {
  if (StartDate && EndDate) {
    if (differenceInDays(EndDate, StartDate) < 0) {
      return false;
    } else {
      return true;
    }
  } else {
    return true;
  }
};

export const SetLastDateOfMonth = (StartDate: Date) => {
  StartDate = new Date(StartDate);
  StartDate.setMonth(StartDate.getMonth() + 1);
  StartDate.setDate(StartDate.getDate() - 1);
  return DateFormatForDB(StartDate);
};

export const EmptyUuid = "00000000-0000-0000-0000-00000000000";
