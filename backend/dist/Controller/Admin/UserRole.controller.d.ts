import { UserRoleService } from '@Service/Admin/UserRole.service';
import { ResponseEnum } from '@Helper/Enum/ResponseEnum';
import { UserRoleModel } from '@Model/Admin/UserRole.model';
import { JWTAuthController } from '@Controller/JWTAuth.controller';
export declare class UserRoleController extends JWTAuthController {
    private _UserRoleService;
    constructor(_UserRoleService: UserRoleService);
    List(): Promise<any>;
    ById(Id: string): Promise<any>;
    Insert(UserRoleData: UserRoleModel, UserId: string): Promise<{
        Type: ResponseEnum;
        Message: string;
        AddtionalData: any;
    } | {
        Type: ResponseEnum;
        Message: string;
        AddtionalData?: undefined;
    }>;
    Update(Id: string, UserRoleData: UserRoleModel, UserId: string): Promise<{
        Type: ResponseEnum;
        Message: string;
        AddtionalData: any;
    } | {
        Type: ResponseEnum;
        Message: string;
        AddtionalData?: undefined;
    }>;
    Delete(Id: string): Promise<{
        Type: ResponseEnum;
        Message: string;
        AddtionalData: any;
    } | {
        Type: ResponseEnum;
        Message: string;
        AddtionalData?: undefined;
    }>;
}
