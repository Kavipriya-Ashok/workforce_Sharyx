import axios from 'axios';

export interface TelemetryKpis {
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
}

export interface VolumeDataPoint {
  day: string;
  inbound: number;
  outbound: number;
}

export interface LeadStagePoint {
  name: string;
  value: number;
  color: string;
}

export interface RecentActivityItem {
  id: string | number;
  type: 'phone' | 'whatsapp' | 'email';
  title: string;
  contact: string;
  agent: string;
  time: string;
  status: string;
  statusVariant: 'success' | 'purple' | 'warning' | 'secondary' | 'destructive' | 'default';
}

export interface DashboardTelemetryResponse {
  kpis: TelemetryKpis;
  volumeData: VolumeDataPoint[];
  leadStageData: LeadStagePoint[];
  recentActivity: RecentActivityItem[];
  lastUpdated: string;
}

const API_BASE = '/api/v1/Admin/Dashboard';

export class DashboardService {
  public static async getTelemetry(range: string = '7d', tenantId: string = 'default'): Promise<DashboardTelemetryResponse> {
    const res = await axios.get(`${API_BASE}/telemetry`, {
      params: { range, tenantId },
    });
    return res.data?.AddtionalData || res.data?.data || res.data;
  }

  public static async syncNow(tenantId: string = 'default'): Promise<DashboardTelemetryResponse> {
    const res = await axios.get(`${API_BASE}/sync`, {
      params: { tenantId },
    });
    return res.data?.AddtionalData || res.data?.data || res.data;
  }
}
