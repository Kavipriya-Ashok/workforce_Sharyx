import { AuditLogService } from '@Service/Admin/AuditLog.service';
import { JWTAuthController } from '@Controller/JWTAuth.controller';
import { AuditLogLazyLoadModel } from '@Model/Admin/AuditLog.model';
export declare class AuditLogController extends JWTAuthController {
    private _AuditLogService;
    constructor(_AuditLogService: AuditLogService);
    LazyLoadList(AuditLogLazyLoadData: AuditLogLazyLoadModel): Promise<any>;
    DetailList(EventLog: any): Promise<any>;
}
