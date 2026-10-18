import { BaseTable } from "@Database/Table/BaseTable";
export declare class audit_log extends BaseTable {
    performed_action: string;
    performed_by: string;
    performed_by_id: string;
    performed_module_name: string;
    performed_module_header_name: string;
    performed_module_id: string;
    performed_on: string;
    performed_type: string;
    performed_ipaddress: string;
    performed_parameter: any;
}
