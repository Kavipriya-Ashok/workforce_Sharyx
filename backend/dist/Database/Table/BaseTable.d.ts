import { BaseEntity } from "typeorm";
export declare class BaseTable extends BaseEntity {
    id: string;
    status: boolean;
    created_by_id: string;
    created_on: Date;
    updated_by_id?: string;
    updated_on?: Date;
}
