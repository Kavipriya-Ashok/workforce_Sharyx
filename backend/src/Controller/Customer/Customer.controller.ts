import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  VERSION_NEUTRAL,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { CustomerService } from "@Service/Customer/Customer.service";
import { JwtAuthGuard } from "@Service/Auth/JwtAuthGuard.service";
import { CurrentUser, CurrentTenant } from "@Helper/Common.helper";

@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller({
  path: ["Customer", "api/Customer", "api/v1/Customer"],
  version: ["1", VERSION_NEUTRAL],
})
@ApiTags("Customer 360")
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Get("List")
  async list(@Query() query: any, @CurrentTenant() tenantId: string | null) {
    return await this.customerService.list(query, tenantId);
  }

  @Get("Deals")
  async listDeals(@CurrentTenant() tenantId: string | null) {
    return await this.customerService.listDeals(tenantId);
  }

  @Get(":id")
  async getById(@Param("id") id: string, @CurrentTenant() tenantId: string | null) {
    return await this.customerService.getById(id, tenantId);
  }

  @Post("Insert")
  async insert(@Body() body: any, @CurrentUser() userId: string, @CurrentTenant() tenantId: string | null) {
    return await this.customerService.insert(body, userId, tenantId);
  }

  @Put("Update/:id")
  async update(@Param("id") id: string, @Body() body: any, @CurrentUser() userId: string, @CurrentTenant() tenantId: string | null) {
    return await this.customerService.update(id, body, userId, tenantId);
  }

  @Delete("Delete/:id")
  async delete(@Param("id") id: string, @CurrentTenant() tenantId: string | null) {
    return await this.customerService.delete(id, tenantId);
  }
}
