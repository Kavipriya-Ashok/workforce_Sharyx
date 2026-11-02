import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  PhoneCall,
  PhoneIncoming,
  ShieldAlert,
  CalendarCheck,
  UserCheck,
  Clock,
  Mail,
  MessageSquare,
  Database,
  CheckCircle2,
  TrendingUp,
  ArrowUpRight,
  Sparkles,
  Zap,
  RefreshCw,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  DashboardService,
  DashboardTelemetryResponse,
  TelemetryKpis,
  VolumeDataPoint,
  LeadStagePoint,
  RecentActivityItem,
} from '@/service/dashboardService';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth';

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const currentTenantId = user?.tenant_id || user?.tenantId || 'default';

  const [dateRange, setDateRange] = useState('7d');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('Just now');

  // Dynamic initial state
  const [kpis, setKpis] = useState<TelemetryKpis>({
    totalCalls: 0,
    answeredCalls: 0,
    answeredRate: '0%',
    missedPrevented: 0,
    apptsBooked: 0,
    apptsConversionRate: '0% conversion',
    leadsCaptured: 0,
    avgDuration: '0m 0s',
    emailsProcessed: 0,
    whatsAppMessages: 0,
    crmRecordsSynced: 0,
    autonomousActions: 0,
  });

  const [volumeData, setVolumeData] = useState<VolumeDataPoint[]>([]);

  const [leadStageData, setLeadStageData] = useState<LeadStagePoint[]>([
    { name: 'New Inbound', value: 0, color: '#2563eb' },
    { name: 'AI Contacted', value: 0, color: '#38bdf8' },
    { name: 'Qualified Lead', value: 0, color: '#6366f1' },
    { name: 'Demo / Closed', value: 0, color: '#0284c7' },
  ]);

  const [recentActivity, setRecentActivity] = useState<RecentActivityItem[]>([]);

  const fetchTelemetry = async (range: string, isManualSync = false) => {
    try {
      if (isManualSync) setSyncing(true);
      const data: DashboardTelemetryResponse = await DashboardService.getTelemetry(range, currentTenantId);
      if (data?.kpis) {
        setKpis(data.kpis);
      }
      if (Array.isArray(data?.volumeData)) {
        setVolumeData(data.volumeData);
      }
      if (Array.isArray(data?.leadStageData)) {
        setLeadStageData(data.leadStageData);
      }
      if (Array.isArray(data?.recentActivity)) {
        setRecentActivity(data.recentActivity);
      }
      if (data?.lastUpdated) {
        setLastUpdated(data.lastUpdated);
      }
      if (isManualSync) {
        toast.success('Omnichannel Telemetry Synchronized Live!');
      }
    } catch (err: any) {
      console.warn('Telemetry load notice:', err.message);
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  };

  useEffect(() => {
    fetchTelemetry(dateRange);
    const interval = setInterval(() => {
      fetchTelemetry(dateRange);
    }, 25000);
    return () => clearInterval(interval);
  }, [dateRange, currentTenantId]);

  const handleManualSync = () => {
    fetchTelemetry(dateRange, true);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Date Range Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-300 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            Workforce Command Center
            <span className="flex h-2.5 w-2.5 rounded-full bg-blue-600 animate-pulse ring-4 ring-blue-100" />
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time telemetry from phone calls, WhatsApp conversations, and autonomous email agents.
            <span className="ml-2 text-blue-600 font-medium">Updated: {lastUpdated}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="outline"
            onClick={handleManualSync}
            disabled={syncing}
            className="h-9 px-3.5 text-xs bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 gap-1.5 transition-all shadow-[0_1px_3px_0_rgba(15,23,42,0.06),0_1px_2px_-1px_rgba(15,23,42,0.04)] font-medium rounded-lg"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin text-blue-600' : 'text-blue-500'}`} />
            {syncing ? 'Syncing...' : 'Sync Live'}
          </Button>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Date Range:</span>
            <div className="w-44">
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="h-9 text-xs bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-800 text-slate-800 dark:text-slate-200 shadow-[0_1px_3px_0_rgba(15,23,42,0.06),0_1px_2px_-1px_rgba(15,23,42,0.04)] focus:ring-blue-500 rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-800 shadow-xl">
                  <SelectItem value="today">Today (Live Stream)</SelectItem>
                  <SelectItem value="7d">Last 7 Days</SelectItem>
                  <SelectItem value="15d">Last 15 Days</SelectItem>
                  <SelectItem value="30d">Last 30 Days</SelectItem>
                  <SelectItem value="all">All Time History</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* 6 Core KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
        <Card className="p-4 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm transition-all shadow-[0_1px_3px_0_rgba(15,23,42,0.06),0_1px_2px_-1px_rgba(15,23,42,0.04)] group rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500">Total Calls</span>
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <PhoneCall className="h-4 w-4" />
            </div>
          </div>
          <p className="text-xl font-extrabold text-slate-900 mt-2">
            {kpis.totalCalls.toLocaleString()}
          </p>
          <div className="flex items-center gap-1 mt-1 text-[10px] text-blue-700 font-semibold">
            <ArrowUpRight className="h-3 w-3" /> +14.2% from last week
          </div>
        </Card>

        <Card className="p-4 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm transition-all shadow-[0_1px_3px_0_rgba(15,23,42,0.06),0_1px_2px_-1px_rgba(15,23,42,0.04)] group rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500">Answered Calls</span>
            <div className="p-1.5 rounded-lg bg-sky-50 text-sky-600 group-hover:bg-sky-600 group-hover:text-white transition-colors">
              <PhoneIncoming className="h-4 w-4" />
            </div>
          </div>
          <p className="text-xl font-extrabold text-blue-700 mt-2">
            {kpis.answeredCalls.toLocaleString()} ({kpis.answeredRate})
          </p>
          <p className="text-[10px] text-slate-400 mt-1">Industry avg: 72%</p>
        </Card>

        <Card className="p-4 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm transition-all shadow-[0_1px_3px_0_rgba(15,23,42,0.06),0_1px_2px_-1px_rgba(15,23,42,0.04)] group rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500">Missed Prevented</span>
            <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <ShieldAlert className="h-4 w-4" />
            </div>
          </div>
          <p className="text-xl font-extrabold text-indigo-700 mt-2">
            {kpis.missedPrevented.toLocaleString()} calls
          </p>
          <p className="text-[10px] text-blue-600/80 font-medium mt-1">Zero dropped revenue</p>
        </Card>

        <Card className="p-4 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm transition-all shadow-[0_1px_3px_0_rgba(15,23,42,0.06),0_1px_2px_-1px_rgba(15,23,42,0.04)] group rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500">Appts Booked</span>
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <CalendarCheck className="h-4 w-4" />
            </div>
          </div>
          <p className="text-xl font-extrabold text-blue-800 mt-2">
            {kpis.apptsBooked.toLocaleString()}
          </p>
          <div className="flex items-center gap-1 mt-1 text-[10px] text-blue-700 font-semibold">
            <ArrowUpRight className="h-3 w-3" /> {kpis.apptsConversionRate}
          </div>
        </Card>

        <Card className="p-4 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm transition-all shadow-[0_1px_3px_0_rgba(15,23,42,0.06),0_1px_2px_-1px_rgba(15,23,42,0.04)] group rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500">Leads Captured</span>
            <div className="p-1.5 rounded-lg bg-cyan-50 text-cyan-600 group-hover:bg-cyan-600 group-hover:text-white transition-colors">
              <UserCheck className="h-4 w-4" />
            </div>
          </div>
          <p className="text-xl font-extrabold text-cyan-800 mt-2">
            {kpis.leadsCaptured.toLocaleString()}
          </p>
          <p className="text-[10px] text-slate-400 mt-1">Synced with CRM</p>
        </Card>

        <Card className="p-4 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm transition-all shadow-[0_1px_3px_0_rgba(15,23,42,0.06),0_1px_2px_-1px_rgba(15,23,42,0.04)] group rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500">Avg Duration</span>
            <div className="p-1.5 rounded-lg bg-slate-100 text-slate-600 group-hover:bg-slate-700 group-hover:text-white transition-colors">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <p className="text-xl font-extrabold text-slate-800 mt-2">{kpis.avgDuration}</p>
          <p className="text-[10px] text-slate-400 mt-1">Concise & natural</p>
        </Card>
      </div>

      {/* Omnichannel Counters Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-[0_1px_3px_0_rgba(15,23,42,0.06),0_1px_2px_-1px_rgba(15,23,42,0.04)]">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center">
            <Mail className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Emails Processed</p>
            <p className="text-base font-bold text-slate-900 dark:text-white">
              {kpis.emailsProcessed.toLocaleString()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-sky-50 border border-sky-100 text-sky-600 flex items-center justify-center">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">WhatsApp Messages</p>
            <p className="text-base font-bold text-slate-900 dark:text-white">
              {kpis.whatsAppMessages.toLocaleString()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
            <Database className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">CRM Records Synced</p>
            <p className="text-base font-bold text-slate-900 dark:text-white">
              {kpis.crmRecordsSynced.toLocaleString()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-cyan-50 border border-cyan-100 text-cyan-600 flex items-center justify-center">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Autonomous Actions</p>
            <p className="text-base font-bold text-slate-900 dark:text-white">
              {kpis.autonomousActions.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Line Chart: Communication Throughput */}
        <div className="lg:col-span-8">
          <Card className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 shadow-[0_1px_3px_0_rgba(15,23,42,0.06),0_1px_2px_-1px_rgba(15,23,42,0.04)] rounded-xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2 text-slate-900">
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                    Communication Volume Telemetry
                  </CardTitle>
                  <CardDescription className="text-slate-500">Inbound customer inquiries vs outbound automated replies</CardDescription>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1.5 text-blue-700 font-semibold bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
                    <span className="h-2 w-2 rounded-full bg-blue-600" /> Outbound AI
                  </span>
                  <span className="flex items-center gap-1.5 text-sky-700 font-semibold bg-sky-50 px-2.5 py-1 rounded-full border border-sky-100">
                    <span className="h-2 w-2 rounded-full bg-sky-500" /> Inbound
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={volumeData}>
                    <defs>
                      <linearGradient id="colorOutbound" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorInbound" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0284c7" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#0284c7" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        borderColor: '#bfdbfe',
                        borderRadius: '0.75rem',
                        color: '#0f172a',
                        boxShadow: '0 10px 15px -3px rgb(37 99 235 / 0.1)',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="outbound"
                      stroke="#2563eb"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#colorOutbound)"
                    />
                    <Area
                      type="monotone"
                      dataKey="inbound"
                      stroke="#0284c7"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorInbound)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pie Chart: Lead Qualification Pipeline */}
        <div className="lg:col-span-4">
          <Card className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 shadow-[0_1px_3px_0_rgba(15,23,42,0.06),0_1px_2px_-1px_rgba(15,23,42,0.04)] rounded-xl">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2 text-slate-900">
                <Sparkles className="h-4 w-4 text-blue-600" />
                Lead Funnel Qualification
              </CardTitle>
              <CardDescription className="text-slate-500">Stage breakdown of captured leads</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-52 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={leadStageData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {leadStageData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        borderColor: '#bfdbfe',
                        borderRadius: '0.75rem',
                        color: '#0f172a',
                        boxShadow: '0 10px 15px -3px rgb(37 99 235 / 0.1)',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                {leadStageData.map((st) => (
                  <div key={st.name} className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: st.color }} />
                    <span className="text-slate-600 dark:text-slate-300 truncate">{st.name}</span>
                    <span className="font-bold text-slate-900 dark:text-white ml-auto">{st.value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Real-Time Live Activity Stream */}
      <Card className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 shadow-[0_1px_3px_0_rgba(15,23,42,0.06),0_1px_2px_-1px_rgba(15,23,42,0.04)] rounded-xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2 text-slate-900">
                <Clock className="h-4 w-4 text-blue-600" />
                Real-Time Omnichannel Activity Feed
              </CardTitle>
              <CardDescription className="text-slate-500">Live actions executed by your digital workforce</CardDescription>
            </div>
            <button
              onClick={handleManualSync}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-semibold hover:bg-blue-100 transition-all cursor-pointer shadow-[0_1px_3px_0_rgba(15,23,42,0.06),0_1px_2px_-1px_rgba(15,23,42,0.04)]"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-ping" />
              <span>{syncing ? 'Syncing...' : 'Live Sync'}</span>
            </button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {recentActivity.map((act) => (
              <div key={act.id} className="py-3.5 flex items-center justify-between first:pt-0 last:pb-0">
                <div className="flex items-center gap-3">
                  <div
                    className={`h-9 w-9 rounded-xl flex items-center justify-center ${
                      act.type === 'phone'
                        ? 'bg-blue-50 text-blue-700 border border-blue-100'
                        : act.type === 'whatsapp'
                        ? 'bg-teal-50 text-teal-700 border border-teal-100'
                        : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                    }`}
                  >
                    {act.type === 'phone' ? (
                      <PhoneCall className="h-4 w-4" />
                    ) : act.type === 'whatsapp' ? (
                      <MessageSquare className="h-4 w-4" />
                    ) : (
                      <Mail className="h-4 w-4" />
                    )}
                  </div>
                  <div>
                    <h5 className="text-xs font-semibold text-slate-900 dark:text-white">{act.title}</h5>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Contact: <span className="text-slate-800 dark:text-slate-200 font-medium">{act.contact}</span> • Agent:{' '}
                      <span className="text-blue-700 font-medium">{act.agent}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Badge variant={act.statusVariant as any} className="text-[10px]">
                    {act.status}
                  </Badge>
                  <span className="text-[10px] text-slate-400 shrink-0">{act.time}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
