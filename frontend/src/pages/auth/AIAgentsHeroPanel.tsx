import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  PhoneCall,
  Headphones,
  CreditCard,
  UserCheck,
  TrendingUp,
  CalendarCheck,
  MessageSquare,
  Mail,
  Sparkles,
  Bot,
  Zap,
  ShieldCheck,
} from 'lucide-react';

export const AIAgentsHeroPanel: React.FC = () => {
  const [activeAgent, setActiveAgent] = useState(0);

  const agents = [
    {
      title: 'AI Phone Receptionist',
      desc: 'Answers 24/7 in native voice, triages callers, books calendar slots.',
      icon: PhoneCall,
      color: 'from-emerald-500 to-teal-600',
      badge: 'Voice AI',
    },
    {
      title: 'Customer Support Copilot',
      desc: 'Instant multilingual resolution across tickets, chat, and phone.',
      icon: Headphones,
      color: 'from-blue-500 to-cyan-600',
      badge: 'Multilingual',
    },
    {
      title: 'Debt & Collections Agent',
      desc: 'Sends courteous WhatsApp payment links and automated follow-ups.',
      icon: CreditCard,
      color: 'from-amber-500 to-orange-600',
      badge: 'Recovery',
    },
    {
      title: 'Recruitment & HR Screener',
      desc: 'Screens candidate CVs, conducts pre-interviews, scores fit.',
      icon: UserCheck,
      color: 'from-purple-500 to-indigo-600',
      badge: 'HR Tech',
    },
    {
      title: 'Inbound Sales Closer',
      desc: 'Qualifies website leads immediately and guides them to checkout.',
      icon: TrendingUp,
      color: 'from-emerald-500 to-green-600',
      badge: 'Revenue',
    },
    {
      title: 'Appointment Concierge',
      desc: 'Eliminates no-shows with smart calendar reminders and rescheduling.',
      icon: CalendarCheck,
      color: 'from-pink-500 to-rose-600',
      badge: 'Scheduling',
    },
    {
      title: 'WhatsApp Automation Cloud',
      desc: 'Official Meta Graph API v21.0 broadcast sequences and live chat.',
      icon: MessageSquare,
      color: 'from-teal-500 to-emerald-600',
      badge: 'Meta v21',
    },
    {
      title: 'Autonomous Email Responder',
      desc: 'Two-way IMAP listener that reads, drafts, and replies with LLM precision.',
      icon: Mail,
      color: 'from-indigo-500 to-purple-600',
      badge: 'Nodemailer',
    },
  ];

  return (
    <div className="relative hidden lg:flex flex-col justify-between p-10 bg-gradient-to-br from-slate-950 via-[#0a0f1d] to-slate-900 border-r border-slate-800/80 overflow-hidden min-h-screen">
      {/* Decorative Glow Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[450px] h-[450px] rounded-full bg-emerald-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-500/10 blur-[130px] pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 space-y-2">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-emerald-400 to-indigo-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Sparkles className="h-5 w-5 text-slate-950 font-bold" />
          </div>
          <span className="text-xl font-black tracking-tight text-white">
            Sharyx
            <span className="text-emerald-400 font-light ml-1.5 text-sm">Workforce AI</span>
          </span>
        </div>
        <h2 className="text-2xl font-bold text-white tracking-tight pt-4">
          Autonomous Digital Workforce Platform
        </h2>
        <p className="text-xs text-slate-400 max-w-md leading-relaxed">
          Deploy 8 specialized AI agents that answer phone calls, manage customer emails, and drive WhatsApp sales 24/7.
        </p>
      </div>

      {/* Interactive Agents Grid */}
      <div className="relative z-10 grid grid-cols-2 gap-3 my-6">
        {agents.map((ag, idx) => {
          const Icon = ag.icon;
          const isSelected = activeAgent === idx;
          return (
            <div
              key={idx}
              onMouseEnter={() => setActiveAgent(idx)}
              className={`p-3.5 rounded-xl border transition-all duration-300 cursor-pointer ${
                isSelected
                  ? 'bg-slate-900/90 border-emerald-500/50 shadow-xl shadow-emerald-950/40 translate-y-[-2px]'
                  : 'bg-slate-950/40 border-slate-800/60 hover:border-slate-700/80'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div
                  className={`h-8 w-8 rounded-lg bg-gradient-to-tr ${ag.color} flex items-center justify-center text-white shadow-md`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <Badge variant={isSelected ? 'success' : 'secondary'} className="text-[9px] py-0">
                  {ag.badge}
                </Badge>
              </div>
              <h4 className="text-xs font-semibold text-slate-100 truncate">{ag.title}</h4>
              <p className="text-[11px] text-slate-400 line-clamp-2 mt-1 leading-snug">
                {ag.desc}
              </p>
            </div>
          );
        })}
      </div>

      {/* Footer Live Telemetry Stats */}
      <div className="relative z-10 pt-4 border-t border-slate-800/80 flex items-center justify-between text-slate-400">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-emerald-400" />
          <span className="text-xs font-medium text-slate-200">1.4s SLA</span>
        </div>
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-indigo-400" />
          <span className="text-xs font-medium text-slate-200">73% Auto-Resolved</span>
        </div>
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-cyan-400" />
          <span className="text-xs font-medium text-slate-200">99.98% Uptime</span>
        </div>
      </div>
    </div>
  );
};
