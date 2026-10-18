import { JwtService } from '@nestjs/jwt';
import { EncryptionService } from '../Encryption.service';
export declare class AuthService {
    private _JwtService;
    private _EncryptionService;
    constructor(_JwtService: JwtService, _EncryptionService: EncryptionService);
    ValidateUser(username: string, password: string): Promise<any>;
}
