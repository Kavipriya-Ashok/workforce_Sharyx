import { ConfigService } from "@nestjs/config";
export declare class EncryptionService {
    private _ConfigService;
    constructor(_ConfigService: ConfigService);
    Decrypt(text: string): any;
    Encrypt(text: string): any;
}
