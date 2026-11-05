import { user } from '@Database/Table/Admin/user';
import { ChangePasswordModel, UserModel } from '@Model/Admin/User.model';
import { ResetPasswordDto } from '@Model/Auth/Auth.model';
import { EmailService } from '../Email.service';
import { EncryptionService } from '../Encryption.service';
import { AuditLogService } from './AuditLog.service';
export declare class UserService {
    private _EmailService;
    private _EncryptionService;
    private _AuditLogService;
    private readonly logger;
    private memAttempts;
    constructor(_EmailService: EmailService, _EncryptionService: EncryptionService, _AuditLogService: AuditLogService);
    private scope;
    private assertRoleAllowed;
    GetAllExpectSuperAdmin(tenantId?: string | null): Promise<user[]>;
    GetIdsByTenant(tenantId: string | null): Promise<string[] | null>;
    GetById(UserId: string, tenantId?: string | null): Promise<user>;
    Insert(UserData: UserModel, UserId: string, tenantId?: string | null): Promise<user>;
    Update(Id: string, UserData: UserModel, UserId: string, tenantId?: string | null): Promise<user>;
    SuspendOrActivate(Id: string, UserId: string, tenantId?: string | null): Promise<user>;
    ForgotPassword(EmailId: string): Promise<{
        status: boolean;
        message: string;
    }>;
    ResetPassword(dto: ResetPasswordDto): Promise<boolean>;
    private bumpResetAttempts;
    private readResetAttempts;
    private clearResetAttempts;
    ChangePassword(UserId: string, ChangePasswordData: ChangePasswordModel): Promise<boolean>;
    UserResetPassword(Id: string, UserData: UserModel, UserId: string, tenantId?: string | null): Promise<user>;
}
