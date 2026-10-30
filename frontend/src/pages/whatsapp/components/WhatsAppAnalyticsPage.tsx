import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp,
  MessageSquare,
  CheckCircle,
  Eye,
  Bot,
  Zap,
  Clock,
  ArrowUpRight,
} from 'lucide-react';

export const WhatsAppAnalyticsPage: React.FC = () => {
  const metrics = [
    {
      title: 'Total Conversations',
      value: '2,845',
      change: '+18.2%',
      icon: MessageSquare,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 border-blue-200',
    },
    {
      title: 'Delivery Rate',
      value: '98.4%',
      change: '+0.6%',
      icon: CheckCircle,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50 border-emerald-200',
    },
    {
      title: 'Read Rate',
      value: '84.1%',
      change: '+4.3%',
      icon: Eye,
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-50 border-cyan-200',
    },
    {
      title: 'AI Auto-Resolved',
      value: '72.8%',
      change: '+12.5%',
      icon: Bot,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50 border-indigo-200',
    },
  ];

  return (
    <div className="space-y-6">
      {/* 4 Top KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m, idx) => {
          const Icon = m.icon;
          return (
            <Card key={idx} className="bg-white border-blue-150 shadow-xs relative overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">{m.title}</span>
                  <div className={`h-9 w-9 rounded-xl border flex items-center justify-center ${m.bgColor}`}>
                    <Icon className={`h-4 w-4 ${m.color}`} />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline justify-between">
                  <span className="text-2xl font-extrabold text-slate-900 tracking-tight">{m.value}</span>
                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-semibold gap-0.5">
                    <ArrowUpRight className="h-3 w-3" />
                    {m.change}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Response Times & Speed */}
        <Card className="bg-white border-blue-150 shadow-xs">
          <CardHeader className="pb-3 border-b border-blue-100">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-900">
              <Zap className="h-4 w-4 text-amber-500" />
              AI vs Human SLA Speed
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">Response turnaround metrics</CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-slate-700 font-medium">
                <span className="flex items-center gap-1.5">
                  <Bot className="h-3.5 w-3.5 text-blue-600" /> AI Copilot Avg Response
                </span>
                <span className="font-bold text-emerald-700">1.4 seconds</span>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full w-[96%]" />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs text-slate-700 font-medium">
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-slate-400" /> Human Representative SLA
                </span>
                <span className="font-bold text-amber-700">4.2 minutes</span>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full w-[65%]" />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-150 text-xs text-blue-900 font-medium mt-4">
              AI Copilot answers 73 out of every 100 queries without requiring agent intervention.
            </div>
          </CardContent>
        </Card>

        {/* Message Delivery Funnel */}
        <Card className="bg-white border-blue-150 shadow-xs">
          <CardHeader className="pb-3 border-b border-blue-100">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-900">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              Meta Cloud Delivery Telemetry
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">Last 30 days throughput</CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-2.5">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-150">
              <span className="text-xs font-medium text-slate-700">Sent Outbound</span>
              <span className="font-mono text-xs font-bold text-slate-900">45,120 msgs</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50/60 border border-emerald-150">
              <span className="text-xs font-medium text-emerald-900">Successfully Delivered</span>
              <span className="font-mono text-xs font-bold text-emerald-700">44,398 msgs (98.4%)</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50/60 border border-blue-150">
              <span className="text-xs font-medium text-blue-900">Read by Customer</span>
              <span className="font-mono text-xs font-bold text-blue-700">37,338 msgs (84.1%)</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-rose-50/60 border border-rose-150">
              <span className="text-xs font-medium text-rose-900">Failed / Undelivered</span>
              <span className="font-mono text-xs font-bold text-rose-700">722 msgs (1.6%)</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
