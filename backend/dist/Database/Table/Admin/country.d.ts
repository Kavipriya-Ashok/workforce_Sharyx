import { BaseTable } from "../BaseTable";
import { currency } from "./currency";
export declare class country extends BaseTable {
    currency: currency;
    currency_id: string;
    name: string;
    code: string;
}
