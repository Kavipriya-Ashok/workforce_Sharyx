import { Repository } from "typeorm";
import { Customer, CustomerStatus, CustomerTier } from "@Database/Table/Customer/customer";
import { CrmDeal } from "@Database/Table/Customer/crm_deal";
import { CustomerInteraction } from "@Database/Table/Customer/customer_interaction";
import { lead } from "@Database/Table/Lead/lead";
export declare class CustomerService {
    private readonly customerRepo;
    private readonly dealRepo;
    private readonly interactionRepo;
    private readonly leadRepo;
    private readonly logger;
    constructor(customerRepo: Repository<Customer>, dealRepo: Repository<CrmDeal>, interactionRepo: Repository<CustomerInteraction>, leadRepo: Repository<lead>);
    list(query: any, userContext?: any): Promise<{
        items: Customer[];
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
    getById(id: string): Promise<{
        interactions: CustomerInteraction[];
        deals: CrmDeal[];
        originalLead: lead;
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
        id: string;
        status: boolean;
        created_by_id: string;
        created_on: Date;
        updated_by_id?: string;
        updated_on?: Date;
    }>;
    insert(data: Partial<Customer>, userId?: string): Promise<Customer>;
    update(id: string, data: Partial<Customer>, userId?: string): Promise<Customer>;
    delete(id: string): Promise<{
        success: boolean;
    }>;
    listDeals(tenantId?: string): Promise<CrmDeal[]>;
    addInteraction(customerId: string, data: Partial<CustomerInteraction>, userId?: string): Promise<CustomerInteraction>;
}
