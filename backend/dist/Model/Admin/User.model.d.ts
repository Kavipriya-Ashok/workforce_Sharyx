import { BaseModel } from '../Base.model';
export declare class UserModel extends BaseModel {
    user_role_id: string;
    first_name: string;
    last_name: string;
    email: string;
    password: string;
    mobile: string;
}
export declare class ChangePasswordModel {
    old_password: string;
    password: string;
    confirm_password: string;
}
