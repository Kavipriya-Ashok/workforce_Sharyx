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
      color: 'text-emerald-400',
    },
    {
      title: 'Delivery Rate',
      value: '98.4%',
      change: '+0.6%',
      icon: CheckCircle,
      color: 'text-blue-400',
    },
    {
      title: 'Read Rate',
      value: '84.1%',
      change: '+4.3%',
      icon: Eye,
      color: 'text-cyan-400',
    },
    {
      title: 'AI Auto-Resolved',
      value: '72.8%',
      change: '+12.5%',
      icon: Bot,
      color: 'text-indigo-400',
    },
  ];

  return (
    <div className="space-y-6">
      {/* 4 Top KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m, idx) => {
          const Icon = m.icon;
          return (
            <Card key={idx} className="relative overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-400">{m.title}</span>
                  <div className="h-8 w-8 rounded-lg bg-slate-800 flex items-center justify-center">
                    <Icon className={`h-4 w-4 ${m.color}`} />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline justify-between">
                  <span className="text-2xl font-bold text-white">{m.value}</span>
                  <Badge variant="success" className="text-[10px] gap-0.5">
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
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-400" />
              AI vs Human SLA Speed
            </CardTitle>
            <CardDescription>Response turnaround metrics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Bot className="h-3.5 w-3.5 text-indigo-400" /> AI Copilot Avg Response
                </span>
                <span className="font-bold text-emerald-400">1.4 seconds</span>
              </div>
              <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full w-[96%]" />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-slate-400" /> Human Representative SLA
                </span>
                <span className="font-bold text-amber-400">4.2 minutes</span>
              </div>
              <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full w-[65%]" />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400 mt-4">
              AI Copilot answers 73 out of every 100 queries without requiring agent intervention.
            </div>
          </CardContent>
        </Card>

        {/* Message Delivery Funnel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-400" />
              Meta Cloud Delivery Telemetry
            </CardTitle>
            <CardDescription>Last 30 days throughput</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/40 border border-slate-800/80">
              <span className="text-xs text-slate-300">Sent Outbound</span>
              <span className="font-mono text-xs font-semibold text-white">45,120 msgs</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/40 border border-slate-800/80">
              <span className="text-xs text-slate-300">Successfully Delivered</span>
              <span className="font-mono text-xs font-semibold text-emerald-400">44,398 msgs (98.4%)</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/40 border border-slate-800/80">
              <span className="text-xs text-slate-300">Read by Customer</span>
              <span className="font-mono text-xs font-semibold text-cyan-400">37,338 msgs (84.1%)</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/40 border border-slate-800/80">
              <span className="text-xs text-slate-300">Failed / Undelivered</span>
              <span className="font-mono text-xs font-semibold text-rose-400">722 msgs (1.6%)</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
