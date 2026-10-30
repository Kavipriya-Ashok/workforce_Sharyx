import { BaseTable } from "../BaseTable";
export declare enum CustomerStatus {
    ACTIVE = "ACTIVE",
    INACTIVE = "INACTIVE",
    CHURNED = "CHURNED"
}
export declare enum CustomerTier {
    STARTER = "STARTER",
    PROFESSIONAL = "PROFESSIONAL",
    ENTERPRISE = "ENTERPRISE"
}
export declare class Customer extends BaseTable {
    tenant_id: string;
    name: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    company_name: string;
    job_title: string;
    customer_status: CustomerStatus | string;
    tier: CustomerTier | string;
    total_spend: number;
    currency: string;
    converted_from_lead_id: string;
    conversion_date: Date;
    tags: string[];
    custom_fields: Record<string, any>;
    notes: string;
    assigned_to_id: string;
}
