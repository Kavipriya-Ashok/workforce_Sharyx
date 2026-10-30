import { Controller, Get, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { DashboardTelemetryService } from "@Service/Admin/DashboardTelemetry.service";

@Controller({ path: "Admin/Dashboard", version: "1" })
@ApiTags("Dashboard Telemetry")
export class DashboardTelemetryController {
  constructor(private readonly telemetryService: DashboardTelemetryService) {}

  @Get("telemetry")
  async getTelemetry(
    @Query("range") range?: string,
    @Query("tenantId") tenantId?: string
  ) {
    const data = await this.telemetryService.getTelemetry(
      range || "7d",
      tenantId || "default"
    );
    return {
      Type: "Success",
      Message: "Telemetry loaded successfully",
      AddtionalData: data,
      data,
    };
  }

  @Get("sync")
  async syncNow(@Query("tenantId") tenantId?: string) {
    const data = await this.telemetryService.getTelemetry("today", tenantId || "default");
    return {
      Type: "Success",
      Message: "Telemetry synchronized successfully",
      AddtionalData: data,
      data,
    };
  }
}
