import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/lib/auth';
import { AdminDashboard } from './AdminDashboard';
import { WhatsAppAutomation } from '@/pages/whatsapp/WhatsAppAutomation';
import { EmailAutomation } from '@/pages/email/EmailAutomation';
import Leads from '@/pages/lead/Leads';
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export const AdminLayout: React.FC = () => {
  const [location, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'whatsapp' | 'email' | 'leads'>('dashboard');
  const [tenantDropdownOpen, setTenantDropdownOpen] = useState(false);
  const [activeTenant, setActiveTenant] = useState(user?.company_name || 'Sharyx Enterprise Inc');

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

          <div className="pt-4 pb-1">
            {!sidebarCollapsed && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-3">
                Workforce & CRM
              </span>
            )}
          </div>

          <button
            onClick={() => setActiveTab('dashboard')}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-900/60"
          >
            <Bot className="h-4 w-4 shrink-0 text-cyan-400" />
            {!sidebarCollapsed && <span>AI Voice Agents</span>}
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
          <div className="flex items-center gap-4">
            <div className="relative hidden sm:block w-64">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="Search leads, calls, messages..."
                className="w-full h-9 pl-9 pr-4 rounded-xl border border-slate-800 bg-slate-900/60 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
              />
            </div>

            <button className="relative text-slate-400 hover:text-white p-2 rounded-xl bg-slate-900/50 border border-slate-800">
              <Bell className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-emerald-400" />
            </button>
          </div>
        </header>

        {/* CONTENT BODY */}
        <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
          {activeTab === 'dashboard' && <AdminDashboard />}
          {activeTab === 'whatsapp' && <WhatsAppAutomation />}
          {activeTab === 'email' && <EmailAutomation />}
          {activeTab === 'leads' && <Leads />}
        </main>
      </div>
    </div>
  );
};
