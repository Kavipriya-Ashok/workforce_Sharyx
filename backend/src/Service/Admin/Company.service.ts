import { Injectable } from '@nestjs/common';
import { company } from '@Database/Table/Admin/company';
import { LogActionEnum } from '@Helper/Enum/AuditLogEnum';
import { CompanyModel } from '@Model/Admin/Company.model';
import { DataSource } from 'typeorm';
import { AuditLogService } from '@Service/Admin/AuditLog.service';
import { CacheService } from '@Service/Cache.service';
import { CacheEnum } from '@Helper/Enum/CacheEnum';

@Injectable()
export class CompanyService {
  constructor(
    private _AuditLogService: AuditLogService,
    private _DataSource: DataSource,
    private _CacheService: CacheService
  ) {
  }

  async Get() {
    const ResultData = await this._CacheService.Get(`${CacheEnum.Company}:*`);
    if (ResultData.length > 0) {
      return ResultData[0];
    }
    else {
      const CompanyData = await company.find();
      await this._CacheService.Store(`${CacheEnum.Company}`, CompanyData);
      return CompanyData[0];
    }
  }

  async Update(Id: string, CompanyData: CompanyModel, UserId: string) {
    const CompanyUpdateData = await company.findOne({ where: { id: Id } });
    if (!CompanyUpdateData) {
      throw new Error('Record not found')
    }
    CompanyUpdateData.name = CompanyData.name;
    CompanyUpdateData.address = CompanyData.address;
    CompanyUpdateData.country_id = CompanyData.country_id;
    CompanyUpdateData.currency_id = CompanyData.currency_id;
    CompanyUpdateData.postal_code = CompanyData.postal_code;
    CompanyUpdateData.email = CompanyData.email;
    CompanyUpdateData.website = CompanyData.website;
    CompanyUpdateData.uen_no = CompanyData.uen_no;
    CompanyUpdateData.bank_name = CompanyData.bank_name;
    CompanyUpdateData.bank_acct_no = CompanyData.bank_acct_no;
    CompanyUpdateData.telephone_no = CompanyData.telephone_no;
    CompanyUpdateData.fax_no = CompanyData.fax_no;
    CompanyUpdateData.invoice_footer = CompanyData.invoice_footer;
    CompanyUpdateData.updated_by_id = UserId;
    CompanyUpdateData.updated_on = new Date();
    await company.update(Id, CompanyUpdateData);
    this._AuditLogService.AuditEmitEvent({ PerformedType: company.name, ActionType: LogActionEnum.Update, PrimaryId: [CompanyUpdateData.id] });
    await this._CacheService.Store(`${CacheEnum.Company}`, [{ ...CompanyUpdateData, id: Id }]);
    return CompanyUpdateData;
  }

  async Insert(CompanyData: CompanyModel, UserId: string) {
    const _CompanyData = new company();
    _CompanyData.name = CompanyData.name;
    _CompanyData.address = CompanyData.address;
    _CompanyData.country_id = CompanyData.country_id;
    _CompanyData.currency_id = CompanyData.currency_id;
    _CompanyData.postal_code = CompanyData.postal_code;
    _CompanyData.email = CompanyData.email;
    _CompanyData.website = CompanyData.website;
    _CompanyData.uen_no = CompanyData.uen_no;
    _CompanyData.bank_name = CompanyData.bank_name;
    _CompanyData.bank_acct_no = CompanyData.bank_acct_no;
    _CompanyData.telephone_no = CompanyData.telephone_no;
    _CompanyData.fax_no = CompanyData.fax_no;
    _CompanyData.invoice_footer = CompanyData.invoice_footer;
    _CompanyData.created_by_id = UserId;
    _CompanyData.created_on = new Date();
    await company.insert(_CompanyData);
    this._AuditLogService.AuditEmitEvent({ PerformedType: company.name, ActionType: LogActionEnum.Insert, PrimaryId: [_CompanyData.id] });
    await this._CacheService.Store(`${CacheEnum.Company}`, [_CompanyData]);
    return _CompanyData;
  }

}

