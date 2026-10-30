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
  Req,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CustomerService } from "@Service/Customer/Customer.service";

@Controller({
  path: ["Customer", "api/Customer", "api/v1/Customer"],
  version: ["1", VERSION_NEUTRAL],
})
@ApiTags("Customer 360")
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Get("List")
  async list(@Query() query: any, @Req() req: any) {
    return await this.customerService.list(query, req.user);
  }

  @Get("Deals")
  async listDeals(@Query("tenant_id") tenantId?: string) {
    return await this.customerService.listDeals(tenantId || "default");
  }

  @Get(":id")
  async getById(@Param("id") id: string) {
    return await this.customerService.getById(id);
  }

  @Post("Insert")
  async insert(@Body() body: any, @Req() req: any) {
    const userId = req.user?.id || "system";
    return await this.customerService.insert(body, userId);
  }

  @Put("Update/:id")
  async update(@Param("id") id: string, @Body() body: any, @Req() req: any) {
    const userId = req.user?.id || "system";
    return await this.customerService.update(id, body, userId);
  }

  @Delete("Delete/:id")
  async delete(@Param("id") id: string) {
    return await this.customerService.delete(id);
  }
}
