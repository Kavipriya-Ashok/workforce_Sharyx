export interface DashboardTelemetryDto {
    kpis: {
        totalCalls: number;
        answeredCalls: number;
        answeredRate: string;
        missedPrevented: number;
        apptsBooked: number;
        apptsConversionRate: string;
        leadsCaptured: number;
        avgDuration: string;
        emailsProcessed: number;
        whatsAppMessages: number;
        crmRecordsSynced: number;
        autonomousActions: number;
    };
    volumeData: {
        day: string;
        inbound: number;
        outbound: number;
    }[];
    leadStageData: {
        name: string;
        value: number;
        color: string;
    }[];
    recentActivity: {
        id: string | number;
        type: "phone" | "whatsapp" | "email";
        title: string;
        contact: string;
        agent: string;
        time: string;
        status: string;
        statusVariant: "success" | "purple" | "warning" | "secondary" | "destructive" | "default";
    }[];
    lastUpdated: string;
}
export declare class DashboardTelemetryService {
    private readonly logger;
    getTelemetry(range?: string, tenantId?: string): Promise<DashboardTelemetryDto>;
    private formatLocalDate;
    private generateVolumeData;
    private buildRecentActivity;
    private formatRelativeTime;
}
