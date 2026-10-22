import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/lib/auth';
import { AdminDashboard } from './AdminDashboard';
import { WhatsAppAutomation } from '@/pages/whatsapp/WhatsAppAutomation';
import { EmailAutomation } from '@/pages/email/EmailAutomation';
import { VoiceAutomation } from '@/pages/voice/VoiceAutomation';
import { AiAgentsPage } from '@/pages/agents/AiAgentsPage';
import Leads from '@/pages/lead/Leads';
import { ThemeToggle } from '@/components/ThemeToggle';
import {
  LayoutDashboard,
  MessageSquare,
  Mail,
  Users,
  Bot,
  Settings,
  LogOut,
  Bell,
  Search,
  ChevronDown,
  Sparkles,
  Menu,
  X,
  Building2,
  Check,
  PhoneCall,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export const AdminLayout: React.FC = () => {
  const [location, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'whatsapp' | 'email' | 'voice' | 'agents' | 'leads'>('dashboard');
  const [selectedAgentKey, setSelectedAgentKey] = useState<string | null>(null);
  const [agentsSubmenuOpen, setAgentsSubmenuOpen] = useState(true);
  const [tenantDropdownOpen, setTenantDropdownOpen] = useState(false);
  const [activeTenant, setActiveTenant] = useState(user?.company_name || 'Sharyx Enterprise Inc');

  const SIDEBAR_AGENTS = [
    { key: 'receptionist', name: 'Receptionist', emoji: '🛎️', role: 'Welcome & Routing', color: 'text-amber-400' },
    { key: 'sales', name: 'Sales Specialist', emoji: '💼', role: 'Pricing & Deals', color: 'text-emerald-400' },
    { key: 'recruitment', name: 'Recruitment', emoji: '🎓', role: 'Hiring & Screening', color: 'text-rose-400' },
    { key: 'support', name: 'Support & 360°', emoji: '🛟', role: 'Issues & History', color: 'text-violet-400' },
    { key: 'appointment', name: 'Appointment', emoji: '📅', role: 'Meet Booking', color: 'text-cyan-400' },
  ];

  const tenants = [
    activeTenant,
    'Acme Innovations Ltd',
    'Morgan Global Logistics',
  ];

  const handleLogout = () => {
    logout();
    setLocation('/login');
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex font-sans selection:bg-emerald-500 selection:text-black">
      {/* SIDEBAR */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-slate-800 bg-slate-950/95 backdrop-blur-xl transition-all duration-300 ${
          sidebarCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Brand */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-emerald-400 to-indigo-500 flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/20">
              <Sparkles className="h-4 w-4 text-slate-950 font-bold" />
            </div>
            {!sidebarCollapsed && (
              <span className="font-extrabold text-sm text-white tracking-tight">
                Sharyx <span className="text-emerald-400 font-light">Workforce</span>
              </span>
            )}
          </div>
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="text-slate-400 hover:text-white p-1 rounded-lg"
          >
            {sidebarCollapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
          </button>
        </div>

        {/* Navigation links */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'dashboard'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
            }`}
          >
            <LayoutDashboard className="h-4 w-4 shrink-0" />
            {!sidebarCollapsed && <span>Overview & KPIs</span>}
          </button>

          <button
            onClick={() => setActiveTab('whatsapp')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'whatsapp'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
            }`}
          >
            <MessageSquare className="h-4 w-4 shrink-0" />
            {!sidebarCollapsed && <span>WhatsApp Automation</span>}
          </button>

          <button
            onClick={() => setActiveTab('email')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'email'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
            }`}
          >
            <Mail className="h-4 w-4 shrink-0" />
            {!sidebarCollapsed && <span>Email Automation</span>}
          </button>

          <button
            onClick={() => setActiveTab('voice')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'voice'
                ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white shadow-md shadow-cyan-600/25 font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
            }`}
          >
            <PhoneCall className="h-4 w-4 shrink-0 text-cyan-400" />
            {!sidebarCollapsed && <span>Voice AI & Phone Calls</span>}
          </button>

          {/* AI AGENTS MENU & 5 DEFAULT AGENTS */}
          <div className="space-y-1">
            <button
              onClick={() => {
                setActiveTab('agents');
                setAgentsSubmenuOpen(!agentsSubmenuOpen);
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'agents'
                  ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <Bot className="h-4 w-4 shrink-0 text-purple-400" />
                {!sidebarCollapsed && <span>Chat Agents (WA/Email)</span>}
              </div>
              {!sidebarCollapsed && (
                <ChevronDown
                  className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${
                    agentsSubmenuOpen ? 'rotate-180' : ''
                  }`}
                />
              )}
            </button>

            {/* 5 DEFAULT AGENTS LIST */}
            {!sidebarCollapsed && agentsSubmenuOpen && (
              <div className="pl-3 pr-1 py-1 space-y-1 border-l border-slate-800 ml-5 my-1">
                <button
                  onClick={() => {
                    setActiveTab('agents');
                    setSelectedAgentKey(null);
                  }}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                    activeTab === 'agents' && !selectedAgentKey
                      ? 'bg-purple-500/20 text-purple-200 font-semibold'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
                  }`}
                >
                  <Sparkles className="h-3 w-3 text-purple-400 shrink-0" />
                  <span>All Agents Overview</span>
                </button>

                {SIDEBAR_AGENTS.map((ag) => {
                  const isSelected = activeTab === 'agents' && selectedAgentKey === ag.key;
                  return (
                    <button
                      key={ag.key}
                      onClick={() => {
                        setActiveTab('agents');
                        setSelectedAgentKey(ag.key);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                        isSelected
                          ? 'bg-indigo-600/30 text-white font-semibold border border-indigo-500/40 shadow-sm'
                          : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-xs">{ag.emoji}</span>
                        <span className="truncate">{ag.name}</span>
                      </div>
                      <span className="text-[9px] text-slate-500 uppercase tracking-wider">{ag.key.slice(0, 3)}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-4 pb-1">
            {!sidebarCollapsed && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-3">
                Workforce & CRM
              </span>
            )}
          </div>

          <button
            onClick={() => setActiveTab('voice')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'voice'
                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
            }`}
          >
            <PhoneCall className="h-4 w-4 shrink-0 text-cyan-400" />
            {!sidebarCollapsed && <span>Voice Dispatch & Logs</span>}
          </button>

          <button
            onClick={() => setActiveTab('leads')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'leads'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
            }`}
          >
            <Users className="h-4 w-4 shrink-0 text-purple-400" />
            {!sidebarCollapsed && <span>Leads & Contacts</span>}
          </button>

          <button
            onClick={() => setActiveTab('dashboard')}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-900/60"
          >
            <Settings className="h-4 w-4 shrink-0 text-slate-400" />
            {!sidebarCollapsed && <span>Account & Settings</span>}
          </button>
        </div>

        {/* User Card & Logout */}
        <div className="p-3 border-t border-slate-800">
          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/50">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="h-8 w-8 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-xs font-bold text-emerald-400 shrink-0">
                {user?.first_name ? user.first_name[0] : 'A'}
              </div>
              {!sidebarCollapsed && (
                <div className="truncate">
                  <p className="text-xs font-semibold text-white truncate">
                    {user?.first_name || 'Admin'} {user?.last_name || ''}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
                </div>
              )}
            </div>
            <button
              onClick={handleLogout}
              title="Logout"
              className="text-slate-400 hover:text-rose-400 p-1"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN VIEW AREA */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ${
          sidebarCollapsed ? 'pl-20' : 'pl-64'
        }`}
      >
        {/* TOPBAR */}
        <header className="sticky top-0 z-30 h-16 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl flex items-center justify-between px-6">
          {/* Tenant Switcher */}
          <div className="relative">
            <button
              onClick={() => setTenantDropdownOpen(!tenantDropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 text-xs font-medium text-slate-200 transition-all"
            >
              <Building2 className="h-3.5 w-3.5 text-emerald-400" />
              <span>{activeTenant}</span>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400 ml-1" />
            </button>

            {tenantDropdownOpen && (
              <div className="absolute top-11 left-0 z-50 w-56 rounded-xl border border-slate-800 bg-slate-900 shadow-2xl p-1.5 space-y-1">
                {tenants.map((t) => (
                  <div
                    key={t}
                    onClick={() => {
                      setActiveTenant(t);
                      setTenantDropdownOpen(false);
                    }}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs cursor-pointer ${
                      activeTenant === t
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span>{t}</span>
                    {activeTenant === t && <Check className="h-3.5 w-3.5" />}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Search Bar & Actions */}
          <div className="flex items-center gap-3">
            <div className="relative hidden sm:block w-64">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="Search leads, calls, messages..."
                className="w-full h-9 pl-9 pr-4 rounded-xl border border-slate-800 bg-slate-900/60 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-violet-500/50"
              />
            </div>

            <ThemeToggle />

            <button className="relative text-slate-400 hover:text-white p-2 rounded-xl bg-slate-900/50 border border-slate-800">
              <Bell className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-pink-500" />
            </button>
          </div>
        </header>

        {/* CONTENT BODY */}
        <main className="flex-1 p-3 sm:p-5 lg:p-6 max-w-7xl mx-auto w-full min-w-0 overflow-x-hidden">
          {activeTab === 'dashboard' && <AdminDashboard />}
          {activeTab === 'whatsapp' && <WhatsAppAutomation />}
          {activeTab === 'email' && <EmailAutomation />}
          {activeTab === 'voice' && <VoiceAutomation />}
          {activeTab === 'agents' && (
            <AiAgentsPage
              selectedAgentKey={selectedAgentKey}
              onSelectAgent={setSelectedAgentKey}
              onNavigateVoice={() => setActiveTab('voice')}
            />
          )}
          {activeTab === 'leads' && <Leads />}
        </main>
      </div>
    </div>
  );
};
