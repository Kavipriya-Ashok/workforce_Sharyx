import {
  Controller, Get, Post, Put, Patch, Delete,
  Body, Param, Query
} from "@nestjs/common";
import { AuthBaseController } from "@Controller/AuthBase.controller";
import { CurrentUser } from "@Helper/Common.helper";
import { LeadService } from "@Service/Lead/Lead.service";
import { ApiTags } from "@nestjs/swagger";

@Controller({ path: "Lead", version: "1" })
@ApiTags("Lead CRM")
export class LeadController extends AuthBaseController {
  constructor(private readonly leadService: LeadService) {
    super();
  }

  @Get("List")
  async list(@Query() filter: any, @CurrentUser() userId: string) {
    const res = await this.leadService.getAll(filter, { userId });
    return this.SendResponseData(res);
  }

  @Get("Stats")
  async stats(@Query("is_candidate") isCandidate: any, @CurrentUser() userId: string) {
    const isCandBool = isCandidate === "true" ? true : isCandidate === "false" ? false : undefined;
    const stats = await this.leadService.getStats({ userId }, isCandBool);
    return this.SendResponseData(stats);
  }

  @Get("ById/:id")
  async getById(@Param("id") id: string, @CurrentUser() userId: string) {
    const lead = await this.leadService.getById(id, { userId });
    return this.SendResponseData(lead);
  }

  @Get("CheckDuplicate")
  async checkDuplicate(
    @Query("phone") phone: string,
    @Query("exclude_id") excludeId: string,
    @CurrentUser() userId: string
  ) {
    const res = await this.leadService.checkDuplicatePhone(phone, excludeId, { userId });
    return this.SendResponseData(res);
  }

  @Post("Insert")
  async insert(@Body() data: any, @CurrentUser() userId: string) {
    const saved = await this.leadService.insert(data, userId, { userId });
    return this.SendResponseData(saved);
  }

  @Put("Update/:id")
  async update(@Param("id") id: string, @Body() data: any, @CurrentUser() userId: string) {
    const updated = await this.leadService.update(id, data, userId);
    return this.SendResponseData(updated);
  }

  @Patch("UpdateStatus/:id")
  async updateStatus(@Param("id") id: string, @Body("lead_status") newStatus: string, @CurrentUser() userId: string) {
    const updated = await this.leadService.updateStatus(id, newStatus, userId);
    return this.SendResponseData(updated);
  }

  @Delete("Delete/:id")
  async delete(@Param("id") id: string) {
    const res = await this.leadService.delete(id);
    return this.SendResponseData(res);
  }

  @Post("BulkDelete")
  async bulkDelete(@Body("ids") ids: string[]) {
    const res = await this.leadService.bulkDelete(ids);
    return this.SendResponseData(res);
  }

  @Post("BulkUpdateStatus")
  async bulkUpdateStatus(@Body() body: { ids: string[]; lead_status: string }, @CurrentUser() userId: string) {
    const res = await this.leadService.bulkUpdateStatus(body.ids, body.lead_status, userId);
    return this.SendResponseData(res);
  }

  @Post("Activity")
  async addActivity(@Body() body: any, @CurrentUser() userId: string) {
    const act = await this.leadService.addActivity(body, userId);
    return this.SendResponseData(act);
  }

  @Post("Import")
  async importLeads(@Body() model: any, @CurrentUser() userId: string) {
    const res = await this.leadService.importLeads(model, userId, { userId });
    return this.SendResponseData(res);
  }

  @Post("ApproveInterview/:id")
  async approveInterview(@Param("id") id: string, @Body() body: any, @CurrentUser() userId: string) {
    const res = await this.leadService.approveCandidateInterview(id, body, { userId });
    return this.SendResponseData(res);
  }
}
