import { company } from '@Database/Table/Admin/company';
import { CompanyModel } from '@Model/Admin/Company.model';
import { DataSource } from 'typeorm';
import { AuditLogService } from '@Service/Admin/AuditLog.service';
import { CacheService } from '@Service/Cache.service';
export declare class CompanyService {
    private _AuditLogService;
    private _DataSource;
    private _CacheService;
    constructor(_AuditLogService: AuditLogService, _DataSource: DataSource, _CacheService: CacheService);
    Get(): Promise<any>;
    Update(Id: string, CompanyData: CompanyModel, UserId: string): Promise<company>;
    Insert(CompanyData: CompanyModel, UserId: string): Promise<company>;
}
