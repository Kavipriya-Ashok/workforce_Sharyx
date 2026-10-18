import { country } from '@Database/Table/Admin/country';
import { CountryModel } from '@Model/Admin/Country.model';
import { AuditLogService } from '@Service/Admin/AuditLog.service';
import { CacheService } from '@Service/Cache.service';
export declare class CountryService {
    private _AuditLogService;
    private _CacheService;
    constructor(_AuditLogService: AuditLogService, _CacheService: CacheService);
    GetAll(): Promise<any[]>;
    GetById(CountryId: string): Promise<any>;
    Insert(CountryData: CountryModel, UserId: string): Promise<country>;
    Update(Id: string, CountryData: CountryModel, UserId: string): Promise<country>;
    Delete(Id: string): Promise<boolean>;
}
