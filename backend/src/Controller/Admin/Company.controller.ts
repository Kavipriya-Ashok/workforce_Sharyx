import { Body, Controller, Get, Patch } from '@nestjs/common';
import { CompanyModel } from '@Model/Admin/Company.model';
import { CurrentUser } from '@Helper/Common.helper';
import { ApiTags } from '@nestjs/swagger';
import { CompanyService } from '@Service/Admin/Company.service';
import { ResponseEnum } from '@Helper/Enum/ResponseEnum';
import { JWTAuthController } from '@Controller/JWTAuth.controller';

@Controller({ path: "Company", version: '1' })
@ApiTags("Company")
export class CompanyController extends JWTAuthController {

  constructor(private _CompanyService: CompanyService) {
    super()
  }

  @Get('Get')
  async Get() {
    const EmailData = await this._CompanyService.Get();
    return EmailData;
  }

  @Patch('Update')
  async Update(@Body() CompanyData: CompanyModel, @CurrentUser() UserId: string) {
    if (CompanyData.id > "0") {
      await this._CompanyService.Update(CompanyData.id, CompanyData, UserId);
    }
    else {
      await this._CompanyService.Insert(CompanyData, UserId);
    }
    return this.SendResponse(ResponseEnum.Success, ResponseEnum.Updated);
  }

}
