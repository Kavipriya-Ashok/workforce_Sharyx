import { currency } from '@Database/Table/Admin/currency';
import { CurrencyModel } from '@Model/Admin/Currency.model';
import { AuditLogService } from './AuditLog.service';
import { CacheService } from '@Service/Cache.service';
export declare class CurrencyService {
    private _AuditLogService;
    private _CacheService;
    constructor(_AuditLogService: AuditLogService, _CacheService: CacheService);
    GetAll(): Promise<any[]>;
    GetById(CurrencyId: string): Promise<any>;
    Insert(CurrencyData: CurrencyModel, UserId: string): Promise<currency>;
    Update(Id: string, CurrencyData: CurrencyModel, UserId: string): Promise<currency>;
    Delete(Id: string): Promise<boolean>;
}
