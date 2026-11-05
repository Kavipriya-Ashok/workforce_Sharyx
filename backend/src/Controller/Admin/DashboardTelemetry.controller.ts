import { Controller, Get, Query, Headers, UseGuards } from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { DashboardTelemetryService } from "@Service/Admin/DashboardTelemetry.service";
import { JwtAuthGuard } from "@Service/Auth/JwtAuthGuard.service";

import { TenantContextGuard } from "@Service/Auth/TenantContext.guard";
@UseGuards(JwtAuthGuard, TenantContextGuard)
@ApiBearerAuth()
@Controller({ path: "Admin/Dashboard", version: "1" })
@ApiTags("Dashboard Telemetry")
export class DashboardTelemetryController {
  constructor(private readonly telemetryService: DashboardTelemetryService) {}

  @Get("telemetry")
  async getTelemetry(
    @Query("range") range?: string,
    @Query("tenantId") tenantId?: string,
    @Headers("x-tenant-id") headerTenantId?: string
  ) {
    const effectiveTenant = (headerTenantId && headerTenantId !== "all") ? headerTenantId : (tenantId || "default");
    const data = await this.telemetryService.getTelemetry(
      range || "7d",
      effectiveTenant
    );
    return {
      Type: "Success",
      Message: "Telemetry loaded successfully",
      AddtionalData: data,
      data,
    };
  }

  @Get("sync")
  async syncNow(
    @Query("tenantId") tenantId?: string,
    @Headers("x-tenant-id") headerTenantId?: string
  ) {
    const effectiveTenant = (headerTenantId && headerTenantId !== "all") ? headerTenantId : (tenantId || "default");
    const data = await this.telemetryService.getTelemetry("today", effectiveTenant);
    return {
      Type: "Success",
      Message: "Telemetry synchronized successfully",
      AddtionalData: data,
      data,
    };
  }
}
