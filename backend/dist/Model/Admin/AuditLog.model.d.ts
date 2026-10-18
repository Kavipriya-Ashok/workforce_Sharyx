import { LogActionEnum } from "@Helper/Enum/AuditLogEnum";
import { PaginationModel } from "../Base.model";
export declare class AuditLogModel {
    PerformedType: string;
    PrimaryId: string[];
    ActionType: LogActionEnum;
}
export declare class AuditLogFilterModel {
    Start_date: Date;
    end_date: Date;
}
export declare class AuditLogLazyLoadModel extends PaginationModel {
    action: string;
    user_id: string;
    module: string;
    start_date: Date;
    end_date: Date;
}
