import { Injectable } from '@nestjs/common';
import { currency } from '@Database/Table/Admin/currency';
import { ResponseEnum } from '@Helper/Enum/ResponseEnum';
import { CurrencyModel } from '@Model/Admin/Currency.model';
import { AuditLogService } from './AuditLog.service';
import { LogActionEnum } from '@Helper/Enum/AuditLogEnum';
import { CacheService } from '@Service/Cache.service';
import { CacheEnum } from '@Helper/Enum/CacheEnum';

@Injectable()
export class CurrencyService {
  constructor(private _AuditLogService: AuditLogService,
    private _CacheService: CacheService) {
  }

  async GetAll() {
    const ResultData = await this._CacheService.Get(`${CacheEnum.Currency}:*`);
    if (ResultData.length > 0) {
      return ResultData;
    }
    else {
      const CurrencyList = await currency.find();
      await this._CacheService.Store(`${CacheEnum.Currency}`, CurrencyList);
      return CurrencyList;
    }
  }

  async GetById(CurrencyId: string) {
    const ResultData = await this._CacheService.Get(`${CacheEnum.Currency}:${CurrencyId}`);
    if (ResultData.length > 0) {
      return ResultData[0];
    }
    else {
      const CurrencyData = await currency.findOne({ where: { id: CurrencyId } });
      await this._CacheService.Store(`${CacheEnum.Currency}:${CurrencyId}`, [CurrencyData]);
      return CurrencyData;
    }
  }

  async Insert(CurrencyData: CurrencyModel, UserId: string) {
    const _CurrencyData = new currency();
    _CurrencyData.name = CurrencyData.name;
    _CurrencyData.code = CurrencyData.code;
    _CurrencyData.symbol = CurrencyData.symbol;
    _CurrencyData.created_by_id = UserId;
    _CurrencyData.created_on = new Date();
    await currency.insert(_CurrencyData);
    this._AuditLogService.AuditEmitEvent({ PerformedType: currency.name, ActionType: LogActionEnum.Insert, PrimaryId: [_CurrencyData.id] });
    await this._CacheService.Store(`${CacheEnum.Currency}`, [_CurrencyData]);
    return _CurrencyData
  }

  async Update(Id: string, CurrencyData: CurrencyModel, UserId: string) {
    const CurrencyUpdateData = await currency.findOne({ where: { id: Id } });
    if (!CurrencyUpdateData) {
      throw new Error('Record not found')
    }
    CurrencyUpdateData.name = CurrencyData.name;
    CurrencyUpdateData.code = CurrencyData.code;
    CurrencyUpdateData.symbol = CurrencyData.symbol;
    CurrencyUpdateData.updated_by_id = UserId;
    CurrencyUpdateData.updated_on = new Date();
    await currency.update(Id, CurrencyUpdateData);
    this._AuditLogService.AuditEmitEvent({ PerformedType: currency.name, ActionType: LogActionEnum.Update, PrimaryId: [CurrencyUpdateData.id] });
    await this._CacheService.Store(`${CacheEnum.Currency}`, [{ ...CurrencyUpdateData, id: Id }]);
    return CurrencyUpdateData;
  }

  async Delete(Id: string) {
    const CurrencyData = await currency.findOne({ where: { id: Id } });
    if (!CurrencyData) {
      throw new Error(ResponseEnum.NotFound);
    }
    await CurrencyData.remove();
    this._AuditLogService.AuditEmitEvent({ PerformedType: currency.name, ActionType: LogActionEnum.Delete, PrimaryId: [CurrencyData.id] });
    await this._CacheService.Remove(`${CacheEnum.Currency}:${Id}`, CurrencyData);
    return true;
  }

}
