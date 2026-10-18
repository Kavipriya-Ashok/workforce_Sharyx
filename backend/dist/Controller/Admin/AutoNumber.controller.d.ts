import { JWTAuthController } from '@Controller/JWTAuth.controller';
import { CommonService } from '@Service/Common.service';
import { ModuleTypeEnum } from '@Helper/Enum/ModuleTypeEnum';
export declare class AutoNumberController extends JWTAuthController {
    private _CommonService;
    constructor(_CommonService: CommonService);
    Generate(Type: ModuleTypeEnum): Promise<any>;
}
