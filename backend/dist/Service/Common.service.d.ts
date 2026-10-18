import { ModuleTypeEnum } from "@Helper/Enum/ModuleTypeEnum";
export declare class CommonService {
    TransactionRunningNumber(ModuleType: ModuleTypeEnum): Promise<void>;
    RoundDecimal(value: number, scale?: number): number;
    GetBase64(FilePath: string): string;
    AutoGenerateNumber(value: string): string;
    private InvoiceAutoGenerateNext;
    private alphaNumericIncrementer;
}
