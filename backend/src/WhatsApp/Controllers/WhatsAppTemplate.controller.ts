import { Body, Controller, Delete, Get, Param, Patch, Post, Put } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { JWTAuthController } from "@Controller/JWTAuth.controller";
import { CurrentTenant } from "@Helper/Common.helper";
import { ResponseEnum } from "@Helper/Enum/ResponseEnum";
import { WhatsAppTemplateService } from "../Services/WhatsAppTemplate.service";

@Controller({ path: "WhatsApp/Templates", version: "1" })
@ApiTags("WhatsApp Templates")
export class WhatsAppTemplateController extends JWTAuthController {
  constructor(private readonly templateService: WhatsAppTemplateService) {
    super();
  }

  @Get()
  async getTemplates(@CurrentTenant() tenantId: string) {
    const templates = await this.templateService.getTemplates(tenantId);
    return this.SendResponseData(templates);
  }

  @Post("SyncMeta")
  async syncMetaTemplates(@CurrentTenant() tenantId: string) {
    const synced = await this.templateService.syncMetaTemplates(tenantId);
    return this.SendResponse(ResponseEnum.Success, "Templates synced from Meta Graph API", synced);
  }

  @Post("Create")
  async createTemplate(@Body() body: any, @CurrentTenant() tenantId: string) {
    const template = await this.templateService.createTemplate(body, tenantId);
    return this.SendResponse(ResponseEnum.Success, ResponseEnum.Created, template);
  }

  @Put("Update/:id")
  async updateTemplate(@Param("id") id: string, @Body() body: any, @CurrentTenant() tenantId: string) {
    const updated = await this.templateService.updateTemplate(id, body, tenantId);
    return this.SendResponse(ResponseEnum.Success, ResponseEnum.Updated, updated);
  }

  @Delete("Delete/:id")
  async deleteTemplate(@Param("id") id: string, @CurrentTenant() tenantId: string) {
    await this.templateService.deleteTemplate(id, tenantId);
    return this.SendResponse(ResponseEnum.Success, ResponseEnum.Deleted, { id });
  }
}
