export interface ValidationResult {
    isValid: boolean;
    score: number;
    reason?: string;
    isDisposable: boolean;
    isRoleBased: boolean;
    hasMxRecords: boolean;
    mxHost?: string;
}
export declare class EmailValidationService {
    private readonly logger;
    validateEmail(email: string): Promise<ValidationResult>;
    verifyMailboxSmtp(email: string, mxHost: string): Promise<boolean>;
}
