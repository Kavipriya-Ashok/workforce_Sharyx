import { ErrorLogService } from '@Service/Admin/ErrorLog.service';
import { JWTAuthController } from '@Controller/JWTAuth.controller';
import { ErrorLogDeleteModel, ErrorLogLazyLoadModel } from '@Model/Admin/ErrorLog.model';
import { ResponseEnum } from '@Helper/Enum/ResponseEnum';
export declare class ErrorLogController extends JWTAuthController {
    private _ErrorLogService;
    constructor(_ErrorLogService: ErrorLogService);
    LazyLoadList(ErrorLogLazyLoadData: ErrorLogLazyLoadModel): Promise<any>;
    DeleteByAsOfDate(ErrorLogDeleteData: ErrorLogDeleteModel): Promise<{
        Type: ResponseEnum;
        Message: string;
        AddtionalData: any;
    } | {
        Type: ResponseEnum;
        Message: string;
        AddtionalData?: undefined;
    }>;
}
