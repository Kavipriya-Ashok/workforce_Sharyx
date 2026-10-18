import { BaseTable } from "../BaseTable";
export declare enum LeadStatus {
    NEW = "NEW",
    CONTACTED = "CONTACTED",
    QUALIFIED = "QUALIFIED",
    PROPOSAL = "PROPOSAL",
    WON = "WON",
    LOST = "LOST",
    UNQUALIFIED = "UNQUALIFIED"
}
export declare enum LeadSource {
    MANUAL = "MANUAL",
    CSV_IMPORT = "CSV_IMPORT",
    WEBHOOK = "WEBHOOK",
    FORM = "FORM",
    ZAPIER = "ZAPIER",
    FACEBOOK = "FACEBOOK",
    AI_AGENT = "AI_AGENT",
    INBOUND_CALL = "INBOUND_CALL",
    WHATSAPP = "WHATSAPP",
    EMAIL = "EMAIL",
    OTHER = "OTHER"
}
export declare class lead extends BaseTable {
    first_name: string;
    last_name: string;
    name: string;
    email: string;
    phone: string;
    company_name: string;
    job_title: string;
    lead_status: string;
    source: string;
    score: number;
    deal_value: number;
    currency: string;
    notes: string;
    tags: string[];
    custom_fields: Record<string, any>;
    assigned_to_id: string;
    tenant_id: string;
    last_contacted_at: Date;
    is_candidate: boolean;
}
