import { BaseModel } from '../Base.model';
export declare class UserModel extends BaseModel {
    user_role_id: string;
    first_name: string;
    last_name: string;
    email: string;
    password: string;
    mobile: string;
}
export declare class ForgotPasswordModel {
    email: string;
}
export declare class ResetPasswordModel {
    user_id: string;
    reset_otp: number;
    password: string;
}
export declare class ChangePasswordModel {
    old_password: string;
    password: string;
}
