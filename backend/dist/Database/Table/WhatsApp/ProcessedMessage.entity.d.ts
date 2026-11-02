import { BaseEntity } from "typeorm";
export declare class ProcessedMessage extends BaseEntity {
    wamid: string;
    sender_phone: string;
    created_at: Date;
}
