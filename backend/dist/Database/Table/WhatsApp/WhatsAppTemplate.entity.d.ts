import { BaseTable } from "../BaseTable";
export declare class WhatsAppTemplate extends BaseTable {
    tenant_id: string;
    name: string;
    category: string;
    language: string;
    header_text: string;
    body_text: string;
    footer_text: string;
    buttons: any[];
    approval_status: string;
    is_active: boolean;
    outcome_filter: string;
    attach_pdf: boolean;
    pdf_template_type: string;
    pdf_title: string;
}
