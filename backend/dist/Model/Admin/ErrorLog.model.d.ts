import { PaginationModel } from "../Base.model";
export declare class ErrorLogLazyLoadModel extends PaginationModel {
    user_id: string;
    start_date: Date;
    end_date: Date;
}
export declare class ErrorLogDeleteModel {
    password: string;
    as_of_date: Date;
}
