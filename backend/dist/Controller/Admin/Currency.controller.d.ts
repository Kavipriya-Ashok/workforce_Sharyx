import { CurrencyService } from '@Service/Admin/Currency.service';
import { ResponseEnum } from '@Helper/Enum/ResponseEnum';
import { CurrencyModel } from '@Model/Admin/Currency.model';
import { JWTAuthController } from '@Controller/JWTAuth.controller';
export declare class CurrencyController extends JWTAuthController {
    private _CurrencyService;
    constructor(_CurrencyService: CurrencyService);
    List(): Promise<any>;
    ById(Id: string): Promise<any>;
    Insert(CurrencyData: CurrencyModel, UserId: string): Promise<{
        Type: ResponseEnum;
        Message: string;
        AddtionalData: any;
    } | {
        Type: ResponseEnum;
        Message: string;
        AddtionalData?: undefined;
    }>;
    Update(Id: string, CurrencyData: CurrencyModel, UserId: string): Promise<{
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
