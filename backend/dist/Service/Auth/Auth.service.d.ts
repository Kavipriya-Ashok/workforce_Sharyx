import { JwtService } from '@nestjs/jwt';
import { EncryptionService } from '../Encryption.service';
export declare class AuthService {
    private _JwtService;
    private _EncryptionService;
    private readonly logger;
    private signupOtps;
    constructor(_JwtService: JwtService, _EncryptionService: EncryptionService);
    ValidateUser(username: string, password: string): Promise<any>;
    sendSignupOtp(email: string, name?: string): Promise<{
        ok: boolean;
        message: string;
        debugOtp?: string;
    }>;
    verifySignupOtp(dto: {
        email: string;
        otp: string;
        first_name?: string;
        last_name?: string;
        username?: string;
        password?: string;
        mobile?: string;
        company_name?: string;
    }): Promise<any>;
    googleAuth(dto: {
        code?: string;
        redirect_uri?: string;
        credential?: string;
        email?: string;
        name?: string;
        picture?: string;
    }): Promise<any>;
    private sendOtpEmail;
}
