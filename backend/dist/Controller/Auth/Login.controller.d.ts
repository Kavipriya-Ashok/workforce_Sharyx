import { ResponseEnum } from '@Helper/Enum/ResponseEnum';
import { ForgotPasswordDto, GoogleAuthDto, LoginDto, ResendSignupOtpDto, ResetPasswordDto, SendSignupOtpDto, VerifySignupOtpDto } from '@Model/Auth/Auth.model';
import { UserService } from '@Service/Admin/User.service';
import { AuthService } from '@Service/Auth/Auth.service';
import { GoogleAuthService } from '@Service/Auth/GoogleAuth.service';
import { AuthBaseController } from '@Controller/AuthBase.controller';
export declare const AUTH_THROTTLE_TTL_MS: number;
export declare const AUTH_THROTTLE_LIMIT: number;
export declare class LoginController extends AuthBaseController {
    private _AuthService;
    private _UserService;
    private _GoogleAuthService;
    constructor(_AuthService: AuthService, _UserService: UserService, _GoogleAuthService: GoogleAuthService);
    UserLogin(UserLogin: LoginDto): Promise<{
        Type: ResponseEnum;
        Message: string;
        result: any;
    }>;
    Logout(req: any): Promise<{
        Type: ResponseEnum;
        Message: string;
    }>;
    SendSignupOtp(body: SendSignupOtpDto): Promise<{
        Type: ResponseEnum;
        Message: string;
        result: {
            ok: boolean;
            message: string;
        };
    }>;
    ResendSignupOtp(body: ResendSignupOtpDto): Promise<{
        Type: ResponseEnum;
        Message: string;
        result: {
            ok: boolean;
            message: string;
        };
    }>;
    VerifySignupOtp(body: VerifySignupOtpDto): Promise<{
        Type: ResponseEnum;
        Message: string;
        result: any;
    }>;
    GoogleAuth(body: GoogleAuthDto): Promise<{
        Type: ResponseEnum;
        Message: string;
        result: any;
    }>;
    ForgotPassword(ForgotPasswordData: ForgotPasswordDto): Promise<{
        Type: ResponseEnum;
        Message: string;
        AddtionalData: any;
    } | {
        Type: ResponseEnum;
        Message: string;
        AddtionalData?: undefined;
    }>;
    ResetPassword(ResetPasswordData: ResetPasswordDto): Promise<{
        Type: ResponseEnum;
        Message: string;
        AddtionalData: any;
    } | {
        Type: ResponseEnum;
        Message: string;
        AddtionalData?: undefined;
    }>;
}
