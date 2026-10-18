import { BaseTable } from "../BaseTable";
export declare class EmailAccountConfig extends BaseTable {
    tenant_id: string;
    email_address: string;
    smtp_host: string;
    smtp_port: number;
    smtp_user: string;
    smtp_password: string;
    imap_host: string;
    imap_port: number;
    use_ssl: boolean;
    is_active: boolean;
}
