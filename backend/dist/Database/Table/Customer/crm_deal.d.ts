import { BaseTable } from "../BaseTable";
export declare class CrmDeal extends BaseTable {
    tenant_id: string;
    title: string;
    lead_id: string;
    customer_id: string;
    deal_value: number;
    currency: string;
    stage: string;
    pipeline: string;
    probability: number;
    expected_close_date: Date;
    closed_at: Date;
    notes: string;
    tags: string[];
}
