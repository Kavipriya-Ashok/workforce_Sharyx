import { BaseTable } from "../BaseTable";
export declare class lead_activity extends BaseTable {
    lead_id: string;
    activity_type: string;
    title: string;
    description: string;
    metadata: Record<string, any>;
    performer_name: string;
    tenant_id: string;
}
