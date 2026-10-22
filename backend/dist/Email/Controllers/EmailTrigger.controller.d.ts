import { AuthBaseController } from "@Controller/AuthBase.controller";
import { ResponseEnum } from "@Helper/Enum/ResponseEnum";
import { OutcomeTriggerService, TriggerContext } from "@Service/OutcomeTrigger.service";
export declare class EmailTriggerController extends AuthBaseController {
    private readonly triggerService;
    constructor(triggerService: OutcomeTriggerService);
    executeTrigger(body: {
        channel: "whatsapp" | "email" | "both";
        event: string;
        context: TriggerContext;
    }): Promise<{
        Type: ResponseEnum;
        Message: string;
        AddtionalData: any;
    } | {
        Type: ResponseEnum;
        Message: string;
        AddtionalData?: undefined;
    }>;
}
