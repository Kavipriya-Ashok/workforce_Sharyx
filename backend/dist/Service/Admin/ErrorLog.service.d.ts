import { ErrorLogDeleteModel, ErrorLogLazyLoadModel } from '@Model/Admin/ErrorLog.model';
import { DataSource } from 'typeorm';
export declare class ErrorLogService {
    private _DataSource;
    constructor(_DataSource: DataSource);
    LazyLoadList(ErrorLogLazyLoadData: ErrorLogLazyLoadModel): Promise<any[]>;
    DeleteByAsOfDate(ErrorLogDeleteData: ErrorLogDeleteModel): Promise<void>;
}
