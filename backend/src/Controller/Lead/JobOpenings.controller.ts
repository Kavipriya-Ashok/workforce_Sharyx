import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  VERSION_NEUTRAL,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { JobOpeningsService } from "@Service/Lead/JobOpenings.service";
import { JwtAuthGuard } from "@Service/Auth/JwtAuthGuard.service";

import { TenantContextGuard } from "@Service/Auth/TenantContext.guard";
@UseGuards(JwtAuthGuard, TenantContextGuard)
@ApiBearerAuth()
@Controller({
  path: ["openings", "Lead/Openings"],
  version: ["1", VERSION_NEUTRAL],
})
@ApiTags("Job Openings")
export class JobOpeningsController {
  constructor(private readonly openingsService: JobOpeningsService) {}

  @Get()
  async listOpenings(
    @Query("tenant_id") tenantId?: string,
    @Query("only_open") onlyOpen?: string
  ) {
    const tId = tenantId || "default";
    if (onlyOpen === "true") {
      return await this.openingsService.getOpenRoles(tId);
    }
    return await this.openingsService.listOpenings(tId);
  }

  @Get("slots")
  async getAvailableSlots(
    @Query("tenant_id") tenantId?: string,
    @Query("count") count?: string
  ) {
    return await this.openingsService.getAvailableSlots(
      tenantId || "default",
      count ? parseInt(count, 10) : 4
    );
  }

  @Post()
  async createOpening(@Body() body: any) {
    return await this.openingsService.createOpening(
      body,
      body?.updated_by || "hr_admin",
      body?.tenant_id || "default"
    );
  }

  @Put(":id")
  async updateOpening(@Param("id") id: string, @Body() body: any) {
    return await this.openingsService.updateOpening(
      id,
      body,
      body?.updated_by || "hr_admin"
    );
  }

  @Patch(":id")
  async patchOpening(@Param("id") id: string, @Body() body: any) {
    return await this.openingsService.updateOpening(
      id,
      body,
      body?.updated_by || "hr_admin"
    );
  }

  @Patch(":id/status")
  async updateStatus(
    @Param("id") id: string,
    @Body("status") status: string,
    @Body("updated_by") updatedBy?: string
  ) {
    return await this.openingsService.updateOpening(
      id,
      { status },
      updatedBy || "hr_admin"
    );
  }

  @Delete(":id")
  async deleteOpening(@Param("id") id: string) {
    return await this.openingsService.deleteOpening(id);
  }
}

