import { BaseTable } from "../BaseTable";
import { user_role } from "./user_role";
import { company } from "./company";
export declare class user extends BaseTable {
    user_role: user_role;
    user_role_id: string;
    company: company;
    company_id: string;
    first_name: string;
    last_name: string;
    email: string;
    password: string;
    mobile: string;
    reset_otp: number;
    reset_otp_expires_at: Date;
}
