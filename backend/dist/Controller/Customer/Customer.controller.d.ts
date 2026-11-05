import { CustomerService } from "@Service/Customer/Customer.service";
export declare class CustomerController {
    private readonly customerService;
    constructor(customerService: CustomerService);
    list(query: any, tenantId: string | null): Promise<{
        items: import("../../Database/Table/Customer/customer").Customer[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
        metrics: {
            totalCustomers: number;
            activeCustomers: number;
            totalRevenue: number;
            convertedFromLeads: number;
            autoConversionRate: number;
        };
    }>;
    listDeals(tenantId: string | null): Promise<import("../../Database/Table/Customer/crm_deal").CrmDeal[]>;
    getById(id: string, tenantId: string | null): Promise<{
        interactions: import("../../Database/Table/Customer/customer_interaction").CustomerInteraction[];
        deals: import("../../Database/Table/Customer/crm_deal").CrmDeal[];
        originalLead: import("../../Database/Table/Lead/lead").lead;
        tenant_id: string;
        name: string;
        first_name: string;
        last_name: string;
        email: string;
        phone: string;
        company_name: string;
        job_title: string;
        customer_status: import("../../Database/Table/Customer/customer").CustomerStatus | string;
        tier: import("../../Database/Table/Customer/customer").CustomerTier | string;
        total_spend: number;
        currency: string;
        converted_from_lead_id: string;
        conversion_date: Date;
        tags: string[];
        custom_fields: Record<string, any>;
        notes: string;
        assigned_to_id: string;
        id: string;
        status: boolean;
        created_by_id?: string;
        created_on?: Date;
        updated_by_id?: string;
        updated_on?: Date;
    }>;
    insert(body: any, userId: string, tenantId: string | null): Promise<import("../../Database/Table/Customer/customer").Customer>;
    update(id: string, body: any, userId: string, tenantId: string | null): Promise<import("../../Database/Table/Customer/customer").Customer>;
    delete(id: string, tenantId: string | null): Promise<{
        success: boolean;
    }>;
}
