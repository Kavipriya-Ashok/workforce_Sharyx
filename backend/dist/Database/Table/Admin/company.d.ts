import { BaseTable } from "../BaseTable";
import { country } from "./country";
import { currency } from "./currency";
export declare class company extends BaseTable {
    name: string;
    address: string;
    country: country;
    country_id: string;
    currency: currency;
    currency_id: string;
    postal_code: string;
    email: string;
    website: string;
    uen_no: string;
    bank_name: string;
    bank_acct_no: string;
    telephone_no: string;
    fax_no: string;
    invoice_footer: string;
}
