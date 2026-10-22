import { Body, Controller, Delete, Get, Param, Post, Put } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { AuthBaseController } from "@Controller/AuthBase.controller";
import { ResponseEnum } from "@Helper/Enum/ResponseEnum";
import { EmailTemplateService } from "../Services/EmailTemplate.service";

@Controller({ path: "Email/Templates", version: "1" })
@ApiTags("Email Templates")
export class EmailTemplateController extends AuthBaseController {
  constructor(private readonly templateService: EmailTemplateService) {
    super();
  }

  @Get()
  async getTemplates() {
    const templates = await this.templateService.getTemplates();
    return this.SendResponseData(templates);
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

  @Post("Preview/:id")
  async previewTemplate(@Param("id") id: string, @Body() variables: Record<string, string>) {
    const preview = await this.templateService.previewTemplate(id, variables);
    return this.SendResponseData(preview);
  }
}
