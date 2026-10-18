import { ResponseEnum } from "@Helper/Enum/ResponseEnum";
export declare class AuthBaseController {
    SendResponse(Type: ResponseEnum, Message: ResponseEnum | string, AddtionalReponse?: any): {
        Type: ResponseEnum;
        Message: string;
        AddtionalData: any;
    } | {
        Type: ResponseEnum;
        Message: string;
        AddtionalData?: undefined;
    };
    SendResponseData(ResponseData: any): any;
    SendErrorResponse(e: any): void;
}
