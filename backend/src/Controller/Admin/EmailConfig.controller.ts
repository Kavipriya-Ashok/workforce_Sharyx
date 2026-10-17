import { Body, Controller, Get, Patch } from '@nestjs/common';
import { EmailConfigModel } from '@Model/Admin/EmailConfig.model';
import { CurrentUser } from '@Helper/Common.helper';
import { ApiTags } from '@nestjs/swagger';
import { EmailConfigService } from '@Service/Admin/EmailConfig.service';
import { ResponseEnum } from '@Helper/Enum/ResponseEnum';
import { JWTAuthController } from '@Controller/JWTAuth.controller';

@Controller({ path: "EmailConfig", version: '1' })
@ApiTags("Email Config")
export class EmailConfigController extends JWTAuthController {

  constructor(private _EmailConfigService: EmailConfigService) {
    super()
  }

  @Get('')
  async EmailConfig() {
    const EmailData = await this._EmailConfigService.GetWithoutPasswordById();
    return EmailData;
  }

  @Patch('Update')
  async Update(@Body() EmailConfigData: EmailConfigModel, @CurrentUser() UserId: string) {
    if (EmailConfigData.id > "0") {
      await this._EmailConfigService.Update(EmailConfigData.id, EmailConfigData, UserId);
    }
    else {
      await this._EmailConfigService.Insert(EmailConfigData, UserId);
    }
    return this.SendResponse(ResponseEnum.Success, ResponseEnum.Updated);
  }

}
