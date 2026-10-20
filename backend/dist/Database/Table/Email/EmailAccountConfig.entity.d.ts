import { BaseTable } from "../BaseTable";
export declare class EmailAccountConfig extends BaseTable {
    tenant_id: string;
    provider: string;
    display_name: string;
    email_address: string;
    client_id: string;
    client_secret: string;
    refresh_token: string;
    access_token: string;
    token_expires_at: Date;
    smtp_host: string;
    smtp_port: number;
    smtp_user: string;
    smtp_password: string;
    imap_host: string;
    imap_port: number;
    use_ssl: boolean;
    is_active: boolean;
}
