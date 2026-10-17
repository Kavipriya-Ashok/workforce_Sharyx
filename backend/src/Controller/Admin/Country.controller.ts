import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { CurrentUser } from '@Helper/Common.helper';
import { ApiTags } from '@nestjs/swagger';
import { CountryService } from '@Service/Admin/Country.service';
import { ResponseEnum } from '@Helper/Enum/ResponseEnum';
import { CountryModel } from '@Model/Admin/Country.model';
import { JWTAuthController } from '@Controller/JWTAuth.controller';


@Controller({ path: "Country", version: '1' })
@ApiTags("Country")
export class CountryController extends JWTAuthController {

  constructor(private _CountryService: CountryService) {
    super()
  }

  @Get('List')
  async List() {
    const CountryListData = await this._CountryService.GetAll();
    return this.SendResponseData(CountryListData);
  }

  @Get('ById/:Id')
  async ById(@Param('Id') Id: string) {
    const CountryData = await this._CountryService.GetById(Id);
    return this.SendResponseData(CountryData);
  }

  @Post('Insert')
  async Insert(@Body() CountryData: CountryModel, @CurrentUser() UserId: string) {
    await this._CountryService.Insert(CountryData, UserId);
    return this.SendResponse(ResponseEnum.Success, ResponseEnum.Created);
  }

  @Put('Update/:Id')
  async Update(@Param('Id') Id: string, @Body() CountryData: CountryModel, @CurrentUser() UserId: string) {
    await this._CountryService.Update(Id, CountryData, UserId);
    return this.SendResponse(ResponseEnum.Success, ResponseEnum.Updated);
  }

  @Delete('Delete/:Id')
  async Delete(@Param('Id') Id: string) {
    await this._CountryService.Delete(Id);
    return this.SendResponse(ResponseEnum.Success, ResponseEnum.Deleted);
  }
}
