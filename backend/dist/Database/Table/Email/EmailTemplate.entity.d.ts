import { BaseTable } from "../BaseTable";
export declare class EmailTemplate extends BaseTable {
    tenant_id: string;
    name: string;
    category: string;
    subject: string;
    body_html: string;
    body_text: string;
    preview_text: string;
    variables: string[];
    is_active: boolean;
    attach_pdf: boolean;
    pdf_template_type: string;
    pdf_title: string;
}
