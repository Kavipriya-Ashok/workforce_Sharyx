import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/lib/auth';
import { AdminDashboard } from './AdminDashboard';
import { WhatsAppAutomation } from '@/pages/whatsapp/WhatsAppAutomation';
import { EmailAutomation } from '@/pages/email/EmailAutomation';
import { VoiceAutomation } from '@/pages/voice/VoiceAutomation';
import { CallLogsPage } from '@/pages/voice/CallLogsPage';
import { AiAgentsPage } from '@/pages/agents/AiAgentsPage';
import { VoiceService, VoiceAgentDto } from '@/service/voiceService';
import Leads from '@/pages/lead/Leads';
import { Customers } from '@/pages/customer/Customers';
import { SettingsPage } from '@/pages/settings/SettingsPage';
import { ThemeToggle } from '@/components/ThemeToggle';
import {
  LayoutDashboard,
  MessageSquare,
  Mail,
  Users,
  UserCheck,
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
  RefreshCw,
  LayoutTemplate,
  Megaphone,
  BarChart3,
  GraduationCap,
  FileText,
  Inbox,
  Send,
  Key,
} from 'lucide-react';

export type AdminPage =
  | 'dashboard'
  | 'whatsapp_chat'
  | 'whatsapp_sync'
  | 'whatsapp_templates'
  | 'whatsapp_campaigns'
  | 'whatsapp_brain'
  | 'whatsapp_analytics'
  | 'email'
  | 'email_inbox'
  | 'email_templates'
  | 'email_ai'
  | 'email_campaigns'
  | 'email_settings'
  | 'voice'
  | 'voice_logs'
  | 'agents'
  | 'leads'
  | 'candidates'
  | 'customers'
  | 'settings';

export const AdminLayout: React.FC = () => {
  const [location, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const getPageFromLocation = (loc: string): AdminPage => {
    const path = loc.split('?')[0].replace(/^\/admin\/?/, '').toLowerCase().trim();

    if (typeof window !== 'undefined' && window.location.search) {
      const params = new URLSearchParams(window.location.search);
      const query = (params.get('page') || params.get('tab') || '').toLowerCase().trim();
      if (query === 'api' || query === 'settings' || query === 'credentials') return 'settings';
      if (query === 'whatsapp') return 'whatsapp_chat';
      if (query === 'email') return 'email_inbox';
      if (query === 'voice') return 'voice';
      if (query === 'leads') return 'leads';
      if (query === 'candidates') return 'candidates';
      if (query === 'customers') return 'customers';
    }

    if (!path || path === 'dashboard') return 'dashboard';
    if (path === 'api' || path === 'settings' || path === 'credentials' || path === 'api-credentials') return 'settings';
    if (path === 'whatsapp' || path === 'whatsapp/chat' || path === 'whatsapp_chat') return 'whatsapp_chat';
    if (path === 'whatsapp/campaigns' || path === 'whatsapp_campaigns') return 'whatsapp_campaigns';
    if (path === 'whatsapp/templates' || path === 'whatsapp_templates') return 'whatsapp_templates';
    if (path === 'whatsapp/brain' || path === 'whatsapp_brain') return 'whatsapp_brain';
    if (path === 'whatsapp/analytics' || path === 'whatsapp_analytics') return 'whatsapp_analytics';
    if (path === 'email' || path === 'email/inbox' || path === 'email_inbox') return 'email_inbox';
    if (path === 'email/templates' || path === 'email_templates') return 'email_templates';
    if (path === 'email/ai' || path === 'email_ai') return 'email_ai';
    if (path === 'email/campaigns' || path === 'email_campaigns') return 'email_campaigns';
    if (path === 'email/settings' || path === 'email_settings') return 'email_settings';
    if (path === 'voice') return 'voice';
    if (path === 'voice/logs' || path === 'voice_logs') return 'voice_logs';
    if (path === 'agents') return 'agents';
    if (path === 'leads') return 'leads';
    if (path === 'candidates') return 'candidates';
    if (path === 'customers') return 'customers';

    return 'dashboard';
  };

  const [activePage, setActivePage] = useState<AdminPage>(() => getPageFromLocation(location));

  const navigateToPage = (page: AdminPage) => {
    setActivePage(page);
    const routeMap: Record<AdminPage, string> = {
      dashboard: '/admin/dashboard',
      whatsapp_chat: '/admin/whatsapp',
      whatsapp_sync: '/admin/whatsapp',
      whatsapp_campaigns: '/admin/whatsapp/campaigns',
      whatsapp_templates: '/admin/whatsapp/templates',
      whatsapp_brain: '/admin/whatsapp/brain',
      whatsapp_analytics: '/admin/whatsapp/analytics',
      email: '/admin/email',
      email_inbox: '/admin/email',
      email_templates: '/admin/email/templates',
      email_ai: '/admin/email/ai',
      email_campaigns: '/admin/email/campaigns',
      email_settings: '/admin/email/settings',
      voice: '/admin/voice',
      voice_logs: '/admin/voice/logs',
      agents: '/admin/agents',
      leads: '/admin/leads',
      candidates: '/admin/candidates',
      customers: '/admin/customers',
      settings: '/admin/api',
    };
    const targetRoute = routeMap[page] || '/admin/dashboard';
    if (location !== targetRoute) {
      setLocation(targetRoute);
    }
  };

  useEffect(() => {
    const matched = getPageFromLocation(location);
    if (matched !== activePage) {
      setActivePage(matched);
    }
  }, [location]);

  const [whatsappSubmenuOpen, setWhatsappSubmenuOpen] = useState(true);
  const [emailSubmenuOpen, setEmailSubmenuOpen] = useState(true);
  const [selectedAgentKey, setSelectedAgentKey] = useState<string | null>(null);
  const [agentsSubmenuOpen, setAgentsSubmenuOpen] = useState(true);
  const [tenantDropdownOpen, setTenantDropdownOpen] = useState(false);
  const [activeTenant, setActiveTenant] = useState(user?.company_name || 'Sharyx Enterprise Inc');
  const [dynamicVoiceAgents, setDynamicVoiceAgents] = useState<VoiceAgentDto[]>([]);

  useEffect(() => {
    VoiceService.listAgents()
      .then((res) => {
        if (Array.isArray(res) && res.length > 0) {
          setDynamicVoiceAgents(res);
        }
      })
      .catch(() => {});
  }, []);

  const SIDEBAR_AGENTS = [
    { key: 'receptionist', name: 'Receptionist', emoji: '🛎️', role: 'Welcome & Routing', color: 'text-amber-500' },
    { key: 'sales', name: 'Sales Specialist', emoji: '💼', role: 'Pricing & Deals', color: 'text-emerald-600' },
    { key: 'recruitment', name: 'Recruitment', emoji: '🎓', role: 'Hiring & Screening', color: 'text-rose-600' },
    { key: 'support', name: 'Support & 360°', emoji: '🛟', role: 'Issues & History', color: 'text-violet-600' },
    { key: 'appointment', name: 'Appointment', emoji: '📅', role: 'Meet Booking', color: 'text-cyan-600' },
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
    <div className="min-h-screen bg-[#f1f5f9] text-slate-900 flex font-sans selection:bg-blue-600 selection:text-white">
      {/* SIDEBAR */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-[#1a2846] bg-[#0c1427] text-slate-200 transition-all duration-300 shadow-xl ${
          sidebarCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Brand */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-[#1a2846]">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shrink-0 shadow-md shadow-blue-500/30">
              <Sparkles className="h-4 w-4 text-white font-bold" />
            </div>
            {!sidebarCollapsed && (
              <span className="font-extrabold text-sm text-white tracking-tight">
                Sharyx <span className="text-blue-400 font-semibold">Workforce</span>
              </span>
            )}
          </div>
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="text-slate-400 hover:text-white hover:bg-white/5 p-1 rounded-lg transition-colors"
          >
            {sidebarCollapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
          </button>
        </div>

        {/* Navigation links */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          <button
            onClick={() => navigateToPage('dashboard')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activePage === 'dashboard'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-semibold'
                : 'text-slate-300 hover:text-white hover:bg-[#15223e]'
            }`}
          >
            <LayoutDashboard className={`h-4 w-4 shrink-0 ${activePage === 'dashboard' ? 'text-white' : 'text-blue-400'}`} />
            {!sidebarCollapsed && <span>Overview & KPIs</span>}
          </button>

          {/* WHATSAPP AUTOMATION & SUB-PAGES */}
          <div className="space-y-1">
            <button
              onClick={() => {
                setWhatsappSubmenuOpen(!whatsappSubmenuOpen);
                if (!whatsappSubmenuOpen && !activePage.startsWith('whatsapp_')) {
                  navigateToPage('whatsapp_chat');
                }
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activePage.startsWith('whatsapp')
                  ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-[#15223e]'
              }`}
            >
              <div className="flex items-center gap-3">
                <MessageSquare className={`h-4 w-4 shrink-0 ${activePage.startsWith('whatsapp') ? 'text-blue-400' : 'text-emerald-400'}`} />
                {!sidebarCollapsed && <span>WhatsApp Suite</span>}
              </div>
              {!sidebarCollapsed && (
                <ChevronDown
                  className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${
                    whatsappSubmenuOpen ? 'rotate-180' : ''
                  }`}
                />
              )}
            </button>

            {/* WHATSAPP DEDICATED SEPARATE PAGES */}
            {!sidebarCollapsed && whatsappSubmenuOpen && (
              <div className="pl-3 pr-1 py-1 space-y-1 border-l border-[#1a2846] ml-5 my-1">
                <button
                  onClick={() => navigateToPage('whatsapp_chat')}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                    activePage === 'whatsapp_chat'
                      ? 'bg-blue-600 text-white font-bold shadow-sm shadow-blue-500/20'
                      : 'text-slate-400 hover:text-white hover:bg-[#15223e]'
                  }`}
                >
                  <MessageSquare className="h-3 w-3 text-emerald-400 shrink-0" />
                  <span>💬 Live Chat Inbox</span>
                </button>

                <button
                  onClick={() => navigateToPage('whatsapp_campaigns')}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                    activePage === 'whatsapp_campaigns'
                      ? 'bg-blue-600 text-white font-bold shadow-sm shadow-blue-500/20'
                      : 'text-slate-400 hover:text-white hover:bg-[#15223e]'
                  }`}
                >
                  <Megaphone className="h-3 w-3 text-indigo-400 shrink-0" />
                  <span>🚀 Campaigns & Broadcast</span>
                </button>

                <button
                  onClick={() => navigateToPage('whatsapp_templates')}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                    activePage === 'whatsapp_templates'
                      ? 'bg-blue-600 text-white font-bold shadow-sm shadow-blue-500/20'
                      : 'text-slate-400 hover:text-white hover:bg-[#15223e]'
                  }`}
                >
                  <LayoutTemplate className="h-3 w-3 text-amber-400 shrink-0" />
                  <span>📋 Meta Templates</span>
                </button>

                <button
                  onClick={() => navigateToPage('whatsapp_brain')}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                    activePage === 'whatsapp_brain'
                      ? 'bg-blue-600 text-white font-bold shadow-sm shadow-blue-500/20'
                      : 'text-slate-400 hover:text-white hover:bg-[#15223e]'
                  }`}
                >
                  <Bot className="h-3 w-3 text-purple-400 shrink-0" />
                  <span>🧠 AI Brain & Copilot</span>
                </button>

                <button
                  onClick={() => navigateToPage('whatsapp_analytics')}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                    activePage === 'whatsapp_analytics'
                      ? 'bg-blue-600 text-white font-bold shadow-sm shadow-blue-500/20'
                      : 'text-slate-400 hover:text-white hover:bg-[#15223e]'
                  }`}
                >
                  <BarChart3 className="h-3 w-3 text-sky-400 shrink-0" />
                  <span>📊 Telemetry & SLAs</span>
                </button>
              </div>
            )}
          </div>

          {/* EMAIL OMNICHANNEL SUITE */}
          <div className="space-y-1">
            <button
              onClick={() => {
                navigateToPage('email_inbox');
                setEmailSubmenuOpen(!emailSubmenuOpen);
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activePage.startsWith('email')
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-[#15223e]'
              }`}
            >
              <div className="flex items-center gap-3">
                <Mail className={`h-4 w-4 shrink-0 ${activePage.startsWith('email') ? 'text-white' : 'text-indigo-400'}`} />
                {!sidebarCollapsed && <span>Email Suite</span>}
              </div>
              {!sidebarCollapsed && (
                <ChevronDown
                  className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${
                    emailSubmenuOpen ? 'rotate-180' : ''
                  }`}
                />
              )}
            </button>

            {!sidebarCollapsed && emailSubmenuOpen && (
              <div className="pl-3 pr-1 py-1 space-y-1 border-l border-[#1a2846] ml-5 my-1">
                <button
                  onClick={() => navigateToPage('email_inbox')}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                    activePage === 'email_inbox' || activePage === 'email'
                      ? 'bg-blue-600 text-white font-bold shadow-sm shadow-blue-500/20'
                      : 'text-slate-400 hover:text-white hover:bg-[#15223e]'
                  }`}
                >
                  <Inbox className="h-3 w-3 text-indigo-400 shrink-0" />
                  <span>📥 Two-Way Inbox</span>
                </button>

                <button
                  onClick={() => navigateToPage('email_templates')}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                    activePage === 'email_templates'
                      ? 'bg-blue-600 text-white font-bold shadow-sm shadow-blue-500/20'
                      : 'text-slate-400 hover:text-white hover:bg-[#15223e]'
                  }`}
                >
                  <LayoutTemplate className="h-3 w-3 text-blue-400 shrink-0" />
                  <span>📋 Email Templates</span>
                </button>

                <button
                  onClick={() => navigateToPage('email_ai')}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                    activePage === 'email_ai'
                      ? 'bg-blue-600 text-white font-bold shadow-sm shadow-blue-500/20'
                      : 'text-slate-400 hover:text-white hover:bg-[#15223e]'
                  }`}
                >
                  <Bot className="h-3 w-3 text-purple-400 shrink-0" />
                  <span>🧠 AI Auto-Reply</span>
                </button>

                <button
                  onClick={() => navigateToPage('email_campaigns')}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                    activePage === 'email_campaigns'
                      ? 'bg-blue-600 text-white font-bold shadow-sm shadow-blue-500/20'
                      : 'text-slate-400 hover:text-white hover:bg-[#15223e]'
                  }`}
                >
                  <Send className="h-3 w-3 text-emerald-400 shrink-0" />
                  <span>🚀 Sequences & Broadcast</span>
                </button>

                <button
                  onClick={() => navigateToPage('email_settings')}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                    activePage === 'email_settings'
                      ? 'bg-blue-600 text-white font-bold shadow-sm shadow-blue-500/20'
                      : 'text-slate-400 hover:text-white hover:bg-[#15223e]'
                  }`}
                >
                  <Key className="h-3 w-3 text-amber-400 shrink-0" />
                  <span>⚙️ Mailbox & SMTP Setup</span>
                </button>
              </div>
            )}
          </div>

          <button
            onClick={() => navigateToPage('voice')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activePage === 'voice'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-semibold'
                : 'text-slate-300 hover:text-white hover:bg-[#15223e]'
            }`}
          >
            <PhoneCall className={`h-4 w-4 shrink-0 ${activePage === 'voice' ? 'text-white' : 'text-cyan-400'}`} />
            {!sidebarCollapsed && <span>Voice AI & Phone Calls</span>}
          </button>

          <button
            onClick={() => navigateToPage('voice_logs')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activePage === 'voice_logs'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-semibold'
                : 'text-slate-300 hover:text-white hover:bg-[#15223e]'
            }`}
          >
            <FileText className={`h-4 w-4 shrink-0 ${activePage === 'voice_logs' ? 'text-white' : 'text-blue-400'}`} />
            {!sidebarCollapsed && (
              <div className="flex items-center justify-between flex-1">
                <span>Call Logs & Recordings</span>
                <span className="text-[9px] uppercase font-bold px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300">
                  Live
                </span>
              </div>
            )}
          </button>

          <div className="pt-4 pb-1">
            {!sidebarCollapsed && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3">
                Workforce & CRM
              </span>
            )}
          </div>

          <button
            onClick={() => navigateToPage('leads')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activePage === 'leads'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-300 hover:text-white hover:bg-[#15223e]'
            }`}
          >
            <Users className={`h-4 w-4 shrink-0 ${activePage === 'leads' ? 'text-white' : 'text-blue-400'}`} />
            {!sidebarCollapsed && <span>Leads & Contacts</span>}
          </button>

          <button
            onClick={() => navigateToPage('candidates')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activePage === 'candidates'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-purple-600/30 font-bold'
                : 'text-slate-300 hover:text-white hover:bg-[#15223e]'
            }`}
          >
            <GraduationCap className={`h-4 w-4 shrink-0 ${activePage === 'candidates' ? 'text-white' : 'text-amber-400'}`} />
            {!sidebarCollapsed && <span>Candidates & Interviews</span>}
          </button>

          <button
            onClick={() => navigateToPage('customers')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activePage === 'customers'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/30 font-bold'
                : 'text-slate-300 hover:text-white hover:bg-[#15223e]'
            }`}
          >
            <UserCheck className={`h-4 w-4 shrink-0 ${activePage === 'customers' ? 'text-white' : 'text-emerald-400'}`} />
            {!sidebarCollapsed && (
              <div className="flex items-center justify-between flex-1">
                <span>Customers 360°</span>
                <span className="text-[9px] uppercase font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300">
                  Auto
                </span>
              </div>
            )}
          </button>

          <button
            onClick={() => navigateToPage('settings')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activePage === 'settings'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-bold'
                : 'text-slate-300 hover:text-white hover:bg-[#15223e]'
            }`}
          >
            <Key className={`h-4 w-4 shrink-0 ${activePage === 'settings' ? 'text-white' : 'text-amber-400'}`} />
            {!sidebarCollapsed && <span>API Credentials & Settings</span>}
          </button>
        </div>

        {/* User Card & Logout */}
        <div className="p-3 border-t border-[#1a2846]">
          <div className="flex items-center justify-between p-2 rounded-xl bg-[#121c35] border border-[#1d2c4f]">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 border border-blue-400/40 flex items-center justify-center text-xs font-bold text-white shrink-0">
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
              className="text-slate-400 hover:text-rose-400 p-1 transition-colors"
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
        <header className="sticky top-0 z-30 h-16 border-b border-blue-100/90 bg-white/90 backdrop-blur-xl flex items-center justify-between px-6 shadow-xs">
          {/* Tenant Switcher & Breadcrumb */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <button
                onClick={() => setTenantDropdownOpen(!tenantDropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50/80 border border-blue-200/80 hover:bg-blue-100/80 text-xs font-medium text-blue-950 transition-all shadow-xs"
              >
                <Building2 className="h-3.5 w-3.5 text-blue-600" />
                <span>{activeTenant}</span>
                <ChevronDown className="h-3.5 w-3.5 text-blue-600/70 ml-1" />
              </button>

              {tenantDropdownOpen && (
                <div className="absolute top-11 left-0 z-50 w-56 rounded-xl border border-blue-100 bg-white shadow-2xl p-1.5 space-y-1">
                  {tenants.map((t) => (
                    <div
                      key={t}
                      onClick={() => {
                        setActiveTenant(t);
                        setTenantDropdownOpen(false);
                      }}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs cursor-pointer ${
                        activeTenant === t
                          ? 'bg-blue-50 text-blue-700 font-semibold'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span>{t}</span>
                      {activeTenant === t && <Check className="h-3.5 w-3.5 text-blue-600" />}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Dynamic Page Breadcrumb */}
            <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-400 font-medium border-l border-slate-200 pl-4">
              <span>Sharyx</span>
              <span>/</span>
              <span className="font-bold text-slate-800">
                {activePage === 'dashboard' && 'Overview & KPIs'}
                {activePage === 'whatsapp_chat' && 'WhatsApp Live Chat Inbox'}
                {activePage === 'whatsapp_sync' && 'WhatsApp Live Sync & Diagnostics'}
                {activePage === 'whatsapp_templates' && 'Meta Approved Templates'}
                {activePage === 'whatsapp_campaigns' && 'WhatsApp Broadcasts & Automated Campaigns'}
                {activePage === 'whatsapp_brain' && 'WhatsApp AI Copilot Brain'}
                {activePage === 'whatsapp_analytics' && 'WhatsApp Telemetry & SLAs'}
                {activePage === 'email' && 'Email Two-Way Inbox'}
                {activePage === 'email_inbox' && 'Email Two-Way Inbox'}
                {activePage === 'email_templates' && 'Email Templates & PDF Engine'}
                {activePage === 'email_ai' && 'Email AI Copilot & Auto-Reply'}
                {activePage === 'email_campaigns' && 'Email Sequences & Broadcasts'}
                {activePage === 'email_settings' && 'Email Mailbox & SMTP Settings'}
                {activePage === 'voice' && 'Voice AI & Phone Calls'}
                {activePage === 'voice_logs' && 'Voice Call Logs & Audio Dialogue'}
                {activePage === 'agents' && 'Specialized Chat Agents Sandbox'}
                {activePage === 'leads' && 'Leads & Contacts'}
                {activePage === 'candidates' && 'Candidates & Scheduled Interviews'}
                {activePage === 'customers' && 'Customers 360° & Automated Conversions'}
                {activePage === 'settings' && 'API Keys & Connected Platforms'}
              </span>
            </div>
          </div>

          {/* Search Bar & Actions */}
          <div className="flex items-center gap-3">
            <div className="relative hidden sm:block w-64">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search leads, calls, messages..."
                className="w-full h-9 pl-9 pr-4 rounded-xl border border-blue-100 bg-blue-50/40 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>

            <ThemeToggle />

            <button className="relative text-slate-600 hover:text-blue-600 p-2 rounded-xl bg-blue-50/60 border border-blue-100/80 hover:border-blue-200 transition-all">
              <Bell className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-blue-600 ring-2 ring-white" />
            </button>
          </div>
        </header>

        {/* CONTENT BODY */}
        <main className="flex-1 p-3 sm:p-5 lg:p-6 max-w-7xl mx-auto w-full min-w-0 overflow-x-hidden">
          {activePage === 'dashboard' && <AdminDashboard />}
          {activePage.startsWith('whatsapp') && (
            <WhatsAppAutomation
              key={activePage}
              initialTab={
                activePage === 'whatsapp_campaigns' ? 'campaigns' :
                activePage === 'whatsapp_templates' ? 'templates' :
                activePage === 'whatsapp_brain' ? 'ai_brain' :
                activePage === 'whatsapp_analytics' ? 'analytics' :
                'live_chat'
              }
              onTabChange={(tab) => {
                const pageMap: Record<string, AdminPage> = {
                  live_chat: 'whatsapp_chat',
                  campaigns: 'whatsapp_campaigns',
                  templates: 'whatsapp_templates',
                  ai_brain: 'whatsapp_brain',
                  analytics: 'whatsapp_analytics',
                };
                if (pageMap[tab]) navigateToPage(pageMap[tab]);
              }}
            />
          )}
          {activePage.startsWith('email') && (
            <EmailAutomation
              key={activePage}
              initialTab={
                activePage === 'email_templates' ? 'templates' :
                activePage === 'email_ai' ? 'ai_settings' :
                activePage === 'email_campaigns' ? 'campaigns' :
                activePage === 'email_settings' ? 'settings' :
                'inbox'
              }
              onTabChange={(tab) => {
                const pageMap: Record<string, AdminPage> = {
                  inbox: 'email_inbox',
                  templates: 'email_templates',
                  ai_settings: 'email_ai',
                  campaigns: 'email_campaigns',
                  settings: 'email_settings',
                };
                if (pageMap[tab]) navigateToPage(pageMap[tab]);
              }}
            />
          )}
          {activePage === 'voice' && <VoiceAutomation />}
          {activePage === 'voice_logs' && <CallLogsPage />}
          {activePage === 'agents' && (
            <AiAgentsPage
              selectedAgentKey={selectedAgentKey}
              onSelectAgent={setSelectedAgentKey}
              onNavigateVoice={() => navigateToPage('voice')}
            />
          )}
          {activePage === 'leads' && <Leads isCandidate={false} />}
          {activePage === 'candidates' && <Leads isCandidate={true} />}
          {activePage === 'customers' && <Customers />}
          {activePage === 'settings' && <SettingsPage />}
        </main>
      </div>
    </div>
  );
};
