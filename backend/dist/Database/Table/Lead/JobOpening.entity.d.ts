import { BaseEntity } from "typeorm";
export declare class JobOpening extends BaseEntity {
    id: string;
    tenant_id: string;
    title: string;
    skills: string[];
    min_experience: number;
    locations: string[];
    work_mode: string;
    relocation_supported: boolean;
    status: string;
    updated_by: string;
    created_at: Date;
    updated_at: Date;
}
