import { EmailConfigModel } from '@Model/Admin/EmailConfig.model';
import { EmailConfigService } from '@Service/Admin/EmailConfig.service';
import { ResponseEnum } from '@Helper/Enum/ResponseEnum';
import { JWTAuthController } from '@Controller/JWTAuth.controller';
export declare class EmailConfigController extends JWTAuthController {
    private _EmailConfigService;
    constructor(_EmailConfigService: EmailConfigService);
    EmailConfig(): Promise<any>;
    Update(EmailConfigData: EmailConfigModel, UserId: string): Promise<{
        Type: ResponseEnum;
        Message: string;
        AddtionalData: any;
    } | {
        Type: ResponseEnum;
        Message: string;
        AddtionalData?: undefined;
    }>;
}
