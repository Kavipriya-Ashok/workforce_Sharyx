import { Body, Controller, ForbiddenException, Get, Patch, Req } from '@nestjs/common';
import { CompanyModel } from '@Model/Admin/Company.model';
import { CurrentUser, isSuperAdminUser } from '@Helper/Common.helper';
import { ApiTags } from '@nestjs/swagger';
import { CompanyService } from '@Service/Admin/Company.service';
import { ResponseEnum } from '@Helper/Enum/ResponseEnum';
import { JWTAuthController } from '@Controller/JWTAuth.controller';
import { company } from '@Database/Table/Admin/company';

@Controller({ path: "Company", version: '1' })
@ApiTags("Company")
export class CompanyController extends JWTAuthController {

  constructor(private _CompanyService: CompanyService) {
    super()
  }

  /** The caller's own company (tenant from the JWT). */
  @Get('Get')
  async Get(@Req() req: any) {
    const tenantId = req.user?.tenant_id || req.user?.company_id;
    if (!tenantId) throw new ForbiddenException('No tenant is associated with this account');
    return await company.findOne({ where: { id: tenantId }, relations: ['currency', 'country'] });
  }

  /** Super Admin: every tenant. Everyone else: only their own company. */
  @Get('List')
  async List(@Req() req: any) {
    if (isSuperAdminUser(req.user)) {
      return this.SendResponseData(await this._CompanyService.GetAll());
    }
    const tenantId = req.user?.tenant_id || req.user?.company_id;
    if (!tenantId) throw new ForbiddenException('No tenant is associated with this account');
    const own = await company.findOne({ where: { id: tenantId }, relations: ['currency', 'country'] });
    return this.SendResponseData(own ? [own] : []);
  }

  @Patch('Update')
  async Update(@Body() CompanyData: CompanyModel, @CurrentUser() UserId: string, @Req() req: any) {
    const isSuper = isSuperAdminUser(req.user);
    if (!isSuper) {
      // A normal tenant admin may only edit their OWN company, and may not create new tenants.
      const tenantId = req.user?.tenant_id || req.user?.company_id;
      if (!tenantId) throw new ForbiddenException('No tenant is associated with this account');
      CompanyData.id = tenantId;
    }
    if (CompanyData.id > "0") {
      await this._CompanyService.Update(CompanyData.id, CompanyData, UserId);
    }
    else {
      await this._CompanyService.Insert(CompanyData, UserId);
    }
    return this.SendResponse(ResponseEnum.Success, ResponseEnum.Updated);
  }

}
