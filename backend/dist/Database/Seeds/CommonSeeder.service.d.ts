import { DataSource } from 'typeorm';
import { EncryptionService } from '@Service/Encryption.service';
export declare class CommonSeederService {
    private readonly _EncryptionService;
    private _DataSource;
    constructor(_EncryptionService: EncryptionService, _DataSource: DataSource);
    Run(): Promise<void>;
    UserRoleSeed: () => Promise<void>;
    UserSeed: () => Promise<void>;
    CurrencySeed: () => Promise<void>;
    CountrySeed: () => Promise<void>;
    CompanySeed: () => Promise<void>;
}
