import { BaseTable } from "../BaseTable";
import { user_role } from "./user_role";
export declare class user extends BaseTable {
    user_role: user_role;
    user_role_id: string;
    first_name: string;
    last_name: string;
    email: string;
    password: string;
    mobile: string;
    reset_otp: number;
}
