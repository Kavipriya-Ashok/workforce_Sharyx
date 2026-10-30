import { DashboardTelemetryService } from "@Service/Admin/DashboardTelemetry.service";
export declare class DashboardTelemetryController {
    private readonly telemetryService;
    constructor(telemetryService: DashboardTelemetryService);
    getTelemetry(range?: string, tenantId?: string): Promise<{
        Type: string;
        Message: string;
        AddtionalData: import("@Service/Admin/DashboardTelemetry.service").DashboardTelemetryDto;
        data: import("@Service/Admin/DashboardTelemetry.service").DashboardTelemetryDto;
    }>;
    syncNow(tenantId?: string): Promise<{
        Type: string;
        Message: string;
        AddtionalData: import("@Service/Admin/DashboardTelemetry.service").DashboardTelemetryDto;
        data: import("@Service/Admin/DashboardTelemetry.service").DashboardTelemetryDto;
    }>;
}
