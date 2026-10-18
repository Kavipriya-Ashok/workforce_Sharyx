export declare class BaseModel {
    id: string;
    status: boolean;
    created_by_id: string;
    updated_by_id: string;
    created_on: Date;
    updated_on: Date;
}
export declare class PaginationModel {
    take: number;
    skip: number;
    keyword: string;
}
