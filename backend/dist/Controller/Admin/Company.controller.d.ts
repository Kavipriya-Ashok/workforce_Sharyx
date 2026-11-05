import { CompanyModel } from '@Model/Admin/Company.model';
import { CompanyService } from '@Service/Admin/Company.service';
import { ResponseEnum } from '@Helper/Enum/ResponseEnum';
import { JWTAuthController } from '@Controller/JWTAuth.controller';
import { company } from '@Database/Table/Admin/company';
export declare class CompanyController extends JWTAuthController {
    private _CompanyService;
    constructor(_CompanyService: CompanyService);
    Get(req: any): Promise<company>;
    List(req: any): Promise<any>;
    Update(CompanyData: CompanyModel, UserId: string, req: any): Promise<{
        Type: ResponseEnum;
        Message: string;
        AddtionalData: any;
    } | {
        Type: ResponseEnum;
        Message: string;
        AddtionalData?: undefined;
    }>;
}
