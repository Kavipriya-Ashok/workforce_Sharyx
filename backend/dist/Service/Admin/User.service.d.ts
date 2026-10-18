import { user } from '@Database/Table/Admin/user';
import { ChangePasswordModel, ResetPasswordModel, UserModel } from '@Model/Admin/User.model';
import { EmailService } from '../Email.service';
import { EncryptionService } from '../Encryption.service';
import { AuditLogService } from './AuditLog.service';
export declare class UserService {
    private _EmailService;
    private _EncryptionService;
    private _AuditLogService;
    constructor(_EmailService: EmailService, _EncryptionService: EncryptionService, _AuditLogService: AuditLogService);
    GetAllExpectSuperAdmin(): Promise<user[]>;
    GetById(UserId: string): Promise<user>;
    Insert(UserData: UserModel, UserId: string): Promise<user>;
    Update(Id: string, UserData: UserModel, UserId: string): Promise<user>;
    SuspendOrActivate(Id: string, UserId: string): Promise<user>;
    ForgotPassword(EmailId: string): Promise<{
        status: boolean;
        message: any;
    }>;
    ResetPassword(ResetPasswordData: ResetPasswordModel): Promise<boolean>;
    ChangePassword(UserId: string, ChangePasswordData: ChangePasswordModel): Promise<boolean>;
    UserResetPassword(Id: string, UserData: UserModel, UserId: string): Promise<user>;
}
