import React, { useState } from 'react';
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

export const AdminDashboard: React.FC = () => {
  const [dateRange, setDateRange] = useState('7d');

  // Chart 1 Data: Inbound vs Outbound activity
  const volumeData = [
    { day: 'Mon', inbound: 120, outbound: 310 },
    { day: 'Tue', inbound: 190, outbound: 420 },
    { day: 'Wed', inbound: 240, outbound: 480 },
    { day: 'Thu', inbound: 310, outbound: 550 },
    { day: 'Fri', inbound: 290, outbound: 620 },
    { day: 'Sat', inbound: 180, outbound: 380 },
    { day: 'Sun', inbound: 140, outbound: 290 },
  ];

  // Chart 2 Data: Lead Pipeline Distribution
  const leadStageData = [
    { name: 'New Inbound', value: 340, color: '#3b82f6' },
    { name: 'AI Contacted', value: 480, color: '#6366f1' },
    { name: 'Qualified Lead', value: 260, color: '#10b981' },
    { name: 'Demo / Closed', value: 140, color: '#f59e0b' },
  ];

  const recentActivity = [
    {
      id: 1,
      type: 'phone',
      title: 'Inbound Call: Booking Request',
      contact: '+1 (555) 234-8901',
      agent: 'AI Receptionist',
      time: '2 mins ago',
      status: 'Appointment Booked',
      statusVariant: 'success' as const,
    },
    {
      id: 2,
      type: 'whatsapp',
      title: 'WhatsApp Inquiry: Pricing Tier',
      contact: '+91 98765 43210',
      agent: 'WhatsApp Sales Copilot',
      time: '6 mins ago',
      status: 'Auto-Replied',
      statusVariant: 'purple' as const,
    },
    {
      id: 3,
      type: 'email',
      title: 'Inbound RFQ: Enterprise 100 Seats',
      contact: 'procurement@globalcorp.com',
      agent: 'Email Autonomous Agent',
      time: '14 mins ago',
      status: 'Draft Prepared',
      statusVariant: 'warning' as const,
    },
    {
      id: 4,
      type: 'phone',
      title: 'After-Hours Emergency Triage',
      contact: '+1 (555) 876-1234',
      agent: 'AI Support Tier 1',
      time: '28 mins ago',
      status: 'Escalated to On-Call',
      statusVariant: 'secondary' as const,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner & Date Range Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            Workforce Command Center
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time telemetry from phone calls, WhatsApp conversations, and autonomous email agents.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Date Range:</span>
          <div className="w-44">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="h-9 text-xs bg-slate-900 border-slate-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
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

      {/* 6 Core KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
        <Card className="p-4 bg-slate-950/60 border-slate-800/80">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-400">Total Calls</span>
            <PhoneCall className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="text-xl font-extrabold text-white mt-2">1,428</p>
          <div className="flex items-center gap-1 mt-1 text-[10px] text-emerald-400">
            <ArrowUpRight className="h-3 w-3" /> +14.2% from last week
          </div>
        </Card>

        <Card className="p-4 bg-slate-950/60 border-slate-800/80">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-400">Answered Calls</span>
            <PhoneIncoming className="h-4 w-4 text-blue-400" />
          </div>
          <p className="text-xl font-extrabold text-blue-400 mt-2">1,392 (97.4%)</p>
          <p className="text-[10px] text-slate-500 mt-1">Industry avg: 72%</p>
        </Card>

        <Card className="p-4 bg-slate-950/60 border-slate-800/80">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-400">Missed Prevented</span>
            <ShieldAlert className="h-4 w-4 text-teal-400" />
          </div>
          <p className="text-xl font-extrabold text-teal-400 mt-2">384 calls</p>
          <p className="text-[10px] text-slate-500 mt-1">Zero dropped revenue</p>
        </Card>

        <Card className="p-4 bg-slate-950/60 border-slate-800/80">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-400">Appts Booked</span>
            <CalendarCheck className="h-4 w-4 text-purple-400" />
          </div>
          <p className="text-xl font-extrabold text-purple-400 mt-2">162</p>
          <div className="flex items-center gap-1 mt-1 text-[10px] text-purple-400">
            <ArrowUpRight className="h-3 w-3" /> +22.8% conversion
          </div>
        </Card>

        <Card className="p-4 bg-slate-950/60 border-slate-800/80">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-400">Leads Captured</span>
            <UserCheck className="h-4 w-4 text-indigo-400" />
          </div>
          <p className="text-xl font-extrabold text-indigo-400 mt-2">488</p>
          <p className="text-[10px] text-slate-500 mt-1">Synced with CRM</p>
        </Card>

        <Card className="p-4 bg-slate-950/60 border-slate-800/80">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-400">Avg Duration</span>
            <Clock className="h-4 w-4 text-amber-400" />
          </div>
          <p className="text-xl font-extrabold text-amber-400 mt-2">2m 14s</p>
          <p className="text-[10px] text-slate-500 mt-1">Concise & natural</p>
        </Card>
      </div>

      {/* Omnichannel Counters Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-2xl glass border border-slate-800 bg-slate-950/40">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
            <Mail className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400">Emails Processed</p>
            <p className="text-base font-bold text-white">14,892</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400">WhatsApp Messages</p>
            <p className="text-base font-bold text-white">28,450</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
            <Database className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400">CRM Records Synced</p>
            <p className="text-base font-bold text-white">3,420</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400">Autonomous Actions</p>
            <p className="text-base font-bold text-white">42,910</p>
          </div>
        </div>
      </div>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Line Chart: Communication Throughput */}
        <div className="lg:col-span-8">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-emerald-400" />
                    Communication Volume Telemetry
                  </CardTitle>
                  <CardDescription>Inbound customer inquiries vs outbound automated replies</CardDescription>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1 text-emerald-400">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" /> Outbound AI
                  </span>
                  <span className="flex items-center gap-1 text-indigo-400">
                    <span className="h-2 w-2 rounded-full bg-indigo-400" /> Inbound
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
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorInbound" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="day" stroke="#64748b" fontSize={11} />
                    <YAxis stroke="#64748b" fontSize={11} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '0.75rem',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="outbound"
                      stroke="#10b981"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorOutbound)"
                    />
                    <Area
                      type="monotone"
                      dataKey="inbound"
                      stroke="#6366f1"
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
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-400" />
                Lead Funnel Qualification
              </CardTitle>
              <CardDescription>Stage breakdown of captured leads</CardDescription>
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
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '0.75rem',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-800 text-xs">
                {leadStageData.map((st) => (
                  <div key={st.name} className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: st.color }} />
                    <span className="text-slate-400 truncate">{st.name}</span>
                    <span className="font-bold text-white ml-auto">{st.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Real-Time Live Activity Stream */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-cyan-400" />
                Real-Time Omnichannel Activity Feed
              </CardTitle>
              <CardDescription>Live actions executed by your digital workforce</CardDescription>
            </div>
            <Badge variant="success" className="gap-1 text-[10px]">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" /> Live Sync
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-slate-800">
            {recentActivity.map((act) => (
              <div key={act.id} className="py-3.5 flex items-center justify-between first:pt-0 last:pb-0">
                <div className="flex items-center gap-3">
                  <div
                    className={`h-9 w-9 rounded-xl flex items-center justify-center ${
                      act.type === 'phone'
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : act.type === 'whatsapp'
                        ? 'bg-teal-500/10 text-teal-400'
                        : 'bg-indigo-500/10 text-indigo-400'
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
                    <h5 className="text-xs font-semibold text-white">{act.title}</h5>
                    <p className="text-[11px] text-slate-400">
                      Contact: <span className="text-slate-200">{act.contact}</span> • Agent:{' '}
                      <span className="text-indigo-300">{act.agent}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Badge variant={act.statusVariant} className="text-[10px]">
                    {act.status}
                  </Badge>
                  <span className="text-[10px] text-slate-500 shrink-0">{act.time}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
