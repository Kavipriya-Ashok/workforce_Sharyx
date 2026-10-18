import { CountryService } from '@Service/Admin/Country.service';
import { ResponseEnum } from '@Helper/Enum/ResponseEnum';
import { CountryModel } from '@Model/Admin/Country.model';
import { JWTAuthController } from '@Controller/JWTAuth.controller';
export declare class CountryController extends JWTAuthController {
    private _CountryService;
    constructor(_CountryService: CountryService);
    List(): Promise<any>;
    ById(Id: string): Promise<any>;
    Insert(CountryData: CountryModel, UserId: string): Promise<{
        Type: ResponseEnum;
        Message: string;
        AddtionalData: any;
    } | {
        Type: ResponseEnum;
        Message: string;
        AddtionalData?: undefined;
    }>;
    Update(Id: string, CountryData: CountryModel, UserId: string): Promise<{
        Type: ResponseEnum;
        Message: string;
        AddtionalData: any;
    } | {
        Type: ResponseEnum;
        Message: string;
        AddtionalData?: undefined;
    }>;
    Delete(Id: string): Promise<{
        Type: ResponseEnum;
        Message: string;
        AddtionalData: any;
    } | {
        Type: ResponseEnum;
        Message: string;
        AddtionalData?: undefined;
    }>;
}
