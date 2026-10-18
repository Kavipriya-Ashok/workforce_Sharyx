import { UserService } from '@Service/Admin/User.service';
import { ResponseEnum } from '@Helper/Enum/ResponseEnum';
import { ChangePasswordModel, UserModel } from '@Model/Admin/User.model';
import { JWTAuthController } from '@Controller/JWTAuth.controller';
export declare class UserController extends JWTAuthController {
    private _UserService;
    constructor(_UserService: UserService);
    List(): Promise<any>;
    ById(Id: string): Promise<any>;
    Insert(UserData: UserModel, UserId: string): Promise<{
        Type: ResponseEnum;
        Message: string;
        AddtionalData: any;
    } | {
        Type: ResponseEnum;
        Message: string;
        AddtionalData?: undefined;
    }>;
    Update(Id: string, UserData: UserModel, UserId: string): Promise<{
        Type: ResponseEnum;
        Message: string;
        AddtionalData: any;
    } | {
        Type: ResponseEnum;
        Message: string;
        AddtionalData?: undefined;
    }>;
    SuspendOrActivate(id: string, UserId: string): Promise<{
        Type: ResponseEnum;
        Message: string;
        AddtionalData: any;
    } | {
        Type: ResponseEnum;
        Message: string;
        AddtionalData?: undefined;
    }>;
    ChangePassword(ChangePasswordData: ChangePasswordModel, UserId: string): Promise<{
        Type: ResponseEnum;
        Message: string;
        AddtionalData: any;
    } | {
        Type: ResponseEnum;
        Message: string;
        AddtionalData?: undefined;
    }>;
    ResetPassword(Id: string, UserData: UserModel, UserId: string): Promise<{
        Type: ResponseEnum;
        Message: string;
        AddtionalData: any;
    } | {
        Type: ResponseEnum;
        Message: string;
        AddtionalData?: undefined;
    }>;
}
