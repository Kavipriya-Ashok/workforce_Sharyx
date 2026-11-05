import { JwtService } from '@nestjs/jwt';
import { DataSource } from 'typeorm';
import { VerifySignupOtpDto } from '@Model/Auth/Auth.model';
import { EncryptionService } from '../Encryption.service';
import { AuthOtpService } from './AuthOtp.service';
export declare class AuthService {
    private _JwtService;
    private _EncryptionService;
    private _DataSource;
    private _AuthOtp;
    private readonly logger;
    private loginAttempts;
    private dummyHash;
    constructor(_JwtService: JwtService, _EncryptionService: EncryptionService, _DataSource: DataSource, _AuthOtp: AuthOtpService);
    private assertNotLockedOut;
    private recordLoginFailure;
    private pruneLoginAttempts;
    private clearLoginFailures;
    ValidateUser(username: string, password: string): Promise<any>;
    logout(userId: string): Promise<void>;
    private debugOtpEnabled;
    sendSignupOtp(email: string, name?: string): Promise<{
        ok: boolean;
        message: string;
    }>;
    resendSignupOtp(email: string): Promise<{
        ok: boolean;
        message: string;
    }>;
    verifySignupOtp(dto: VerifySignupOtpDto): Promise<any>;
    private otpHtml;
    private accountExistsHtml;
    private deliver;
    private dispatchEmail;
}
