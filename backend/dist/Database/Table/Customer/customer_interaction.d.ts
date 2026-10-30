import { BaseTable } from "../BaseTable";
export declare class CustomerInteraction extends BaseTable {
    tenant_id: string;
    customer_id: string;
    interaction_type: string;
    title: string;
    description: string;
    performer_name: string;
    metadata: Record<string, any>;
}
