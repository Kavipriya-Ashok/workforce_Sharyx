import { ResponseEnum } from '@Helper/Enum/ResponseEnum';
import { ForgotPasswordModel, ResetPasswordModel } from '@Model/Admin/User.model';
import { UserLoginModel } from '@Model/Admin/UserLogin.model';
import { UserService } from '@Service/Admin/User.service';
import { AuthService } from '@Service/Auth/Auth.service';
import { AuthBaseController } from '@Controller/AuthBase.controller';
export declare class LoginController extends AuthBaseController {
    private _AuthService;
    private _UserService;
    constructor(_AuthService: AuthService, _UserService: UserService);
    UserLogin(UserLogin: UserLoginModel): Promise<{
        Type: ResponseEnum;
        Message: string;
        result: any;
    }>;
    ForgotPassword(ForgotPasswordData: ForgotPasswordModel): Promise<{
        Type: ResponseEnum;
        Message: string;
        AddtionalData: any;
    } | {
        Type: ResponseEnum;
        Message: string;
        AddtionalData?: undefined;
    }>;
    ResetPassword(ResetPasswordData: ResetPasswordModel): Promise<{
        Type: ResponseEnum;
        Message: string;
        AddtionalData: any;
    } | {
        Type: ResponseEnum;
        Message: string;
        AddtionalData?: undefined;
    }>;
}
