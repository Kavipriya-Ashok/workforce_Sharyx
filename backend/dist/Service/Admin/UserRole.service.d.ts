import { user_role } from "@Database/Table/Admin/user_role";
import { UserRoleModel } from "@Model/Admin/UserRole.model";
import { AuditLogService } from "./AuditLog.service";
import { CacheService } from "@Service/Cache.service";
export declare class UserRoleService {
    private _AuditLogService;
    private _CacheService;
    constructor(_AuditLogService: AuditLogService, _CacheService: CacheService);
    GetAll(): Promise<any[]>;
    GetAllExpectSuperAdmin(): Promise<any[]>;
    GetById(UserRoleId: string): Promise<any>;
    Insert(UserRoleData: UserRoleModel, UserId: string): Promise<user_role>;
    Update(Id: string, UserRoleData: UserRoleModel, UserId: string): Promise<user_role>;
    Delete(Id: string): Promise<boolean>;
}
