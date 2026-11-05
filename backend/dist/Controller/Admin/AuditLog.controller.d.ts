import { AuditLogService } from '@Service/Admin/AuditLog.service';
import { JWTAuthController } from '@Controller/JWTAuth.controller';
import { UserService } from '@Service/Admin/User.service';
import { AuditLogLazyLoadModel } from '@Model/Admin/AuditLog.model';
export declare class AuditLogController extends JWTAuthController {
    private _AuditLogService;
    private _UserService;
    constructor(_AuditLogService: AuditLogService, _UserService: UserService);
    LazyLoadList(AuditLogLazyLoadData: AuditLogLazyLoadModel, tenantId: string | null): Promise<any>;
    DetailList(EventLog: any): Promise<any>;
}
