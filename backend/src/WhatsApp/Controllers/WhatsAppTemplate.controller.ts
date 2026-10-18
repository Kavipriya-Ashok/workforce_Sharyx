import { Body, Controller, Delete, Get, Param, Patch, Post, Put } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { AuthBaseController } from "@Controller/AuthBase.controller";
import { ResponseEnum } from "@Helper/Enum/ResponseEnum";
import { WhatsAppTemplateService } from "../Services/WhatsAppTemplate.service";

@Controller({ path: "WhatsApp/Templates", version: "1" })
@ApiTags("WhatsApp Templates")
export class WhatsAppTemplateController extends AuthBaseController {
  constructor(private readonly templateService: WhatsAppTemplateService) {
    super();
  }

  @Get()
  async getTemplates() {
    const templates = await this.templateService.getTemplates();
    return this.SendResponseData(templates);
  }

  @Post("SyncMeta")
  async syncMetaTemplates() {
    const synced = await this.templateService.syncMetaTemplates();
    return this.SendResponse(ResponseEnum.Success, "Templates synced from Meta Graph API", synced);
  }

  @Post("Create")
  async createTemplate(@Body() body: any) {
    const template = await this.templateService.createTemplate(body);
    return this.SendResponse(ResponseEnum.Success, ResponseEnum.Created, template);
  }

  @Put("Update/:id")
  async updateTemplate(@Param("id") id: string, @Body() body: any) {
    const updated = await this.templateService.updateTemplate(id, body);
    return this.SendResponse(ResponseEnum.Success, ResponseEnum.Updated, updated);
  }

  @Delete("Delete/:id")
  async deleteTemplate(@Param("id") id: string) {
    await this.templateService.deleteTemplate(id);
    return this.SendResponse(ResponseEnum.Success, ResponseEnum.Deleted, { id });
  }
}
