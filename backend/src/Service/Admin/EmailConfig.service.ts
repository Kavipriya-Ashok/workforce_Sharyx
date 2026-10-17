import { Injectable } from '@nestjs/common';
import { email_config } from '@Database/Table/Admin/email_config';
import { EmailConfigModel } from '@Model/Admin/EmailConfig.model';
import { EncryptionService } from '../Encryption.service';
import { CacheService } from '@Service/Cache.service';
import { CacheEnum } from '@Helper/Enum/CacheEnum';
@Injectable()
export class EmailConfigService {
  constructor(
    private readonly _EncryptionService: EncryptionService,
    private _CacheService: CacheService
  ) {
  }

  // #region GetWithoutPasswordById
  async GetWithoutPasswordById() {

    const ResultData = await this._CacheService.Get(`${CacheEnum.EmailConfig}:*`);
    if (ResultData.length > 0) {
      return ResultData[0];
    }
    else {
      const EmailConfigData = await email_config.find();
      if (EmailConfigData.length == 1) {
        delete EmailConfigData[0].password;
      }
      await this._CacheService.Store(`${CacheEnum.EmailConfig}`, EmailConfigData);
      return EmailConfigData[0];
    }
  }

  async Update(Id: string, EmailConfigData: EmailConfigModel, UserId: string) {
    const EmailConfigUpdateData = await email_config.findOne({ where: { id: Id } });
    if (!EmailConfigUpdateData) {
      throw new Error('Record not found')
    }
    EmailConfigUpdateData.email_id = EmailConfigData.email_id;
    EmailConfigUpdateData.password = EmailConfigData.password;
    EmailConfigUpdateData.mailer_name = EmailConfigData.mailer_name;
    EmailConfigUpdateData.host = EmailConfigData.host;
    EmailConfigUpdateData.password = this._EncryptionService.Encrypt(EmailConfigData.password);
    EmailConfigUpdateData.updated_by_id = UserId;
    EmailConfigUpdateData.updated_on = new Date();
    await email_config.update(Id, EmailConfigUpdateData);
    await this._CacheService.Store(`${CacheEnum.EmailConfig}`, [{ ...EmailConfigUpdateData, id: Id }]);
    return EmailConfigUpdateData;
  }

  async Insert(EmailConfigData: EmailConfigModel, UserId: string) {
    const _EmailConfigData = new email_config();
    _EmailConfigData.email_id = EmailConfigData.email_id;
    _EmailConfigData.password = EmailConfigData.password;
    _EmailConfigData.mailer_name = EmailConfigData.mailer_name;
    _EmailConfigData.host = EmailConfigData.host;
    _EmailConfigData.password = this._EncryptionService.Encrypt(EmailConfigData.password);
    _EmailConfigData.created_by_id = UserId;
    _EmailConfigData.created_on = new Date();
    await email_config.insert(_EmailConfigData);
    await this._CacheService.Store(`${CacheEnum.EmailConfig}`, [_EmailConfigData]);
    return _EmailConfigData;
  }

}

