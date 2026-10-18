import { email_config } from '@Database/Table/Admin/email_config';
import { EmailConfigModel } from '@Model/Admin/EmailConfig.model';
import { EncryptionService } from '../Encryption.service';
import { CacheService } from '@Service/Cache.service';
export declare class EmailConfigService {
    private readonly _EncryptionService;
    private _CacheService;
    constructor(_EncryptionService: EncryptionService, _CacheService: CacheService);
    GetWithoutPasswordById(): Promise<any>;
    Update(Id: string, EmailConfigData: EmailConfigModel, UserId: string): Promise<email_config>;
    Insert(EmailConfigData: EmailConfigModel, UserId: string): Promise<email_config>;
}
