import { CompanyModel } from '@Model/Admin/Company.model';
import { CompanyService } from '@Service/Admin/Company.service';
import { ResponseEnum } from '@Helper/Enum/ResponseEnum';
import { JWTAuthController } from '@Controller/JWTAuth.controller';
export declare class CompanyController extends JWTAuthController {
    private _CompanyService;
    constructor(_CompanyService: CompanyService);
    Get(): Promise<any>;
    Update(CompanyData: CompanyModel, UserId: string): Promise<{
        Type: ResponseEnum;
        Message: string;
        AddtionalData: any;
    } | {
        Type: ResponseEnum;
        Message: string;
        AddtionalData?: undefined;
    }>;
}
