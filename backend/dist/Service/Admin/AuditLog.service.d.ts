import { EventEmitter2 } from "@nestjs/event-emitter";
import { DataSource } from "typeorm";
import { AuditLogLazyLoadModel, AuditLogModel } from "@Model/Admin/AuditLog.model";
export declare class AuditLogService {
    private _EventEmitter;
    private _DataSource;
    private RemoveColumnsName;
    private RemoveColumnsNameByTable;
    private SameReferenceColumn;
    private LogTableIdentifierName;
    private ChangeTableReferenceName;
    private DB;
    private writeApi;
    private queryApi;
    constructor(_EventEmitter: EventEmitter2, _DataSource: DataSource);
    AuditEmitEvent(AuditLogData: AuditLogModel): void;
    private GenerateQuery;
    private GetLastAddedLog;
    private Insert;
    LazyLoadList(AuditLogLazyLoadData: AuditLogLazyLoadModel): Promise<any>;
    DetailList(EventLog: any): Promise<any>;
    GetColumneName(table: string, columns: string): any;
    GetTableName(table: string, columns: string): string;
}
