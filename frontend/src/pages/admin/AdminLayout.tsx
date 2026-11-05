import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/lib/auth';
import { useTenant } from '@/context/TenantContext';
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
import { ProfilePage } from '@/pages/profile/ProfilePage';
import { OmnichannelInboxPage } from '@/pages/omnichannel/OmnichannelInboxPage';
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
  ShieldAlert,
  Globe,
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
  | 'omnichannel'
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
  | 'profile'
  | 'settings';

export const AdminLayout: React.FC = () => {
  const [location, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  // below the md breakpoint the sidebar is an off-canvas drawer opened from the top bar
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const getPageFromLocation = (loc: string): AdminPage => {
    const path = loc.split('?')[0].replace(/^\/admin\/?/, '').toLowerCase().trim();

    if (typeof window !== 'undefined' && window.location.search) {
      const params = new URLSearchParams(window.location.search);
      const query = (params.get('page') || params.get('tab') || '').toLowerCase().trim();
      if (query === 'api' || query === 'settings' || query === 'credentials') return 'settings';
      if (query === 'omnichannel' || query === 'inbox') return 'omnichannel';
      if (query === 'whatsapp') return 'whatsapp_chat';
      if (query === 'email') return 'email_inbox';
      if (query === 'voice') return 'voice';
      if (query === 'leads') return 'leads';
      if (query === 'candidates') return 'candidates';
      if (query === 'customers') return 'customers';
    }

    if (path === 'profile' || path.startsWith('profile/')) return 'profile';
    if (!path || path === 'dashboard') return 'dashboard';
    if (path === 'omnichannel' || path === 'inbox' || path.startsWith('omnichannel/')) return 'omnichannel';
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
    setMobileNavOpen(false);
    setActivePage(page);
    const routeMap: Record<AdminPage, string> = {
      dashboard: '/admin/dashboard',
      omnichannel: '/admin/omnichannel',
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
      profile: '/admin/profile',
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
  const [tenantSearch, setTenantSearch] = useState('');
  const {
    tenants,
    selectedTenant,
    isSuperAdmin,
    isImpersonating,
    switchTenant,
    resetToAllTenants,
  } = useTenant();

  const filteredTenants = tenants.filter(
    (t) =>
      (t.name || '').toLowerCase().includes(tenantSearch.toLowerCase()) ||
      (t.email || '').toLowerCase().includes(tenantSearch.toLowerCase())
  );
  const [dynamicVoiceAgents, setDynamicVoiceAgents] = useState<VoiceAgentDto[]>([]);
  const mainRef = React.useRef<HTMLElement>(null);

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, behavior: 'instant' as any });
  }, [activePage, location]);

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

  const handleLogout = () => {
    logout();
    setLocation('/login');
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#eaedf2] dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex font-sans selection:bg-blue-600 selection:text-white transition-colors duration-200">
      {/* SIDEBAR */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={() => setMobileNavOpen(false)} aria-hidden="true" />
      )}
      <aside
        data-testid="sidebar"
        className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 transition-all duration-300 shadow-xs w-64 ${
          sidebarCollapsed ? 'md:w-20' : 'md:w-64'
        } ${mobileNavOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
      >
        {/* Brand */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <img
              src="/sharyx_logo.jpg?v=2"
              alt="Sharyx Workforce"
              className="h-8 w-8 rounded-xl object-cover shrink-0 shadow-sm ring-1 ring-slate-800/20 dark:ring-white/10"
            />
            {!sidebarCollapsed && (
              <span className="font-extrabold text-sm text-slate-900 dark:text-white tracking-tight">
                Sharyx <span className="text-blue-600 dark:text-blue-400 font-semibold">Workforce</span>
              </span>
            )}
          </div>
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 p-1.5 rounded-lg transition-colors cursor-pointer"
          >
            {sidebarCollapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
          </button>
        </div>

        {/* Navigation links */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-200 dark:[&::-webkit-scrollbar-thumb]:bg-slate-700 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
          <button
            onClick={() => navigateToPage('dashboard')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activePage === 'dashboard'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-semibold'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800/60 cursor-pointer'
            }`}
          >
            <LayoutDashboard className={`h-4 w-4 shrink-0 ${activePage === 'dashboard' ? 'text-white' : 'text-blue-400'}`} />
            {!sidebarCollapsed && <span>Overview & KPIs</span>}
          </button>

                    <button
            onClick={() => navigateToPage('omnichannel')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activePage === 'omnichannel'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-semibold'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800/60 cursor-pointer'
            }`}
          >
            <Inbox className={`h-4 w-4 shrink-0 ${activePage === 'omnichannel' ? 'text-white' : 'text-indigo-500'}`} />
            {!sidebarCollapsed && (
              <div className="flex items-center justify-between flex-1">
                <span>Omnichannel Inbox</span>
                <span className={`text-[9px] uppercase font-bold px-1.5 py-0.2 rounded ${
                  activePage === 'omnichannel'
                    ? 'bg-white/20 text-white'
                    : 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30'
                }`}>
                  Unified
                </span>
              </div>
            )}
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
                activePage.startsWith('whatsapp') ? 'bg-blue-50/80 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-semibold' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer'
              }`}
            >
              <div className="flex items-center gap-3">
                <MessageSquare className={`h-4 w-4 shrink-0 ${activePage.startsWith('whatsapp') ? 'text-blue-600 dark:text-blue-400' : 'text-emerald-500'}`} />
                {!sidebarCollapsed && <span>WhatsApp Automation</span>}
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
              <div className="pl-3 pr-1 py-1 space-y-1 border-l border-slate-200 dark:border-slate-800 ml-5 my-1">
                <button
                  onClick={() => navigateToPage('whatsapp_chat')}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                    activePage === 'whatsapp_chat'
                      ? 'bg-blue-600 text-white font-bold shadow-sm shadow-blue-500/20'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 cursor-pointer font-medium'
                  }`}
                >
                  <MessageSquare className="h-3 w-3 text-emerald-400 shrink-0" />
                  <span>Live Chat Inbox</span>
                </button>

                <button
                  onClick={() => navigateToPage('whatsapp_campaigns')}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                    activePage === 'whatsapp_campaigns'
                      ? 'bg-blue-600 text-white font-bold shadow-sm shadow-blue-500/20'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 cursor-pointer font-medium'
                  }`}
                >
                  <Megaphone className="h-3 w-3 text-indigo-400 shrink-0" />
                  <span>Campaigns & Broadcast</span>
                </button>

                <button
                  onClick={() => navigateToPage('whatsapp_templates')}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                    activePage === 'whatsapp_templates'
                      ? 'bg-blue-600 text-white font-bold shadow-sm shadow-blue-500/20'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 cursor-pointer font-medium'
                  }`}
                >
                  <LayoutTemplate className="h-3 w-3 text-amber-400 shrink-0" />
                  <span>Meta Templates</span>
                </button>

                <button
                  onClick={() => navigateToPage('whatsapp_brain')}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                    activePage === 'whatsapp_brain'
                      ? 'bg-blue-600 text-white font-bold shadow-sm shadow-blue-500/20'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 cursor-pointer font-medium'
                  }`}
                >
                  <Bot className="h-3 w-3 text-purple-400 shrink-0" />
                  <span>AI Brain & Copilot</span>
                </button>

                <button
                  onClick={() => navigateToPage('whatsapp_analytics')}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                    activePage === 'whatsapp_analytics'
                      ? 'bg-blue-600 text-white font-bold shadow-sm shadow-blue-500/20'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 cursor-pointer font-medium'
                  }`}
                >
                  <BarChart3 className="h-3 w-3 text-sky-400 shrink-0" />
                  <span>Telemetry & SLAs</span>
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
                activePage.startsWith('email') ? 'bg-blue-50/80 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-semibold' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer'
              }`}
            >
              <div className="flex items-center gap-3">
                <Mail className={`h-4 w-4 shrink-0 ${activePage.startsWith('email') ? 'text-blue-600 dark:text-blue-400' : 'text-indigo-500'}`} />
                {!sidebarCollapsed && <span>Email Automation</span>}
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
              <div className="pl-3 pr-1 py-1 space-y-1 border-l border-slate-200 dark:border-slate-800 ml-5 my-1">
                <button
                  onClick={() => navigateToPage('email_inbox')}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                    activePage === 'email_inbox' || activePage === 'email'
                      ? 'bg-blue-600 text-white font-bold shadow-sm shadow-blue-500/20'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 cursor-pointer font-medium'
                  }`}
                >
                  <Inbox className="h-3 w-3 text-indigo-400 shrink-0" />
                  <span>Two-Way Inbox</span>
                </button>

                <button
                  onClick={() => navigateToPage('email_templates')}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                    activePage === 'email_templates'
                      ? 'bg-blue-600 text-white font-bold shadow-sm shadow-blue-500/20'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 cursor-pointer font-medium'
                  }`}
                >
                  <LayoutTemplate className="h-3 w-3 text-blue-400 shrink-0" />
                  <span>Email Templates</span>
                </button>

                <button
                  onClick={() => navigateToPage('email_ai')}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                    activePage === 'email_ai'
                      ? 'bg-blue-600 text-white font-bold shadow-sm shadow-blue-500/20'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 cursor-pointer font-medium'
                  }`}
                >
                  <Bot className="h-3 w-3 text-purple-400 shrink-0" />
                  <span>AI Auto-Reply</span>
                </button>

                <button
                  onClick={() => navigateToPage('email_campaigns')}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                    activePage === 'email_campaigns'
                      ? 'bg-blue-600 text-white font-bold shadow-sm shadow-blue-500/20'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 cursor-pointer font-medium'
                  }`}
                >
                  <Send className="h-3 w-3 text-emerald-400 shrink-0" />
                  <span>Sequences & Broadcast</span>
                </button>

                <button
                  onClick={() => navigateToPage('email_settings')}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                    activePage === 'email_settings'
                      ? 'bg-blue-600 text-white font-bold shadow-sm shadow-blue-500/20'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 cursor-pointer font-medium'
                  }`}
                >
                  <Key className="h-3 w-3 text-amber-400 shrink-0" />
                  <span>Mailbox & SMTP Setup</span>
                </button>
              </div>
            )}
          </div>

          <button
            onClick={() => navigateToPage('voice')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activePage === 'voice'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-semibold'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800/60 cursor-pointer'
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
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800/60 cursor-pointer'
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
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800/60 cursor-pointer'
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
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800/60 cursor-pointer'
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
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800/60 cursor-pointer'
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
            onClick={() => navigateToPage('profile')}
            data-testid="nav-profile"
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activePage === 'profile'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-bold'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800/60 cursor-pointer'
            }`}
          >
            <Building2 className={`h-4 w-4 shrink-0 ${activePage === 'profile' ? 'text-white' : 'text-indigo-500'}`} />
            {!sidebarCollapsed && <span>Company Profile &amp; Integrations</span>}
          </button>

          <button
            onClick={() => navigateToPage('settings')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activePage === 'settings'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-bold'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800/60 cursor-pointer'
            }`}
          >
            <Key className={`h-4 w-4 shrink-0 ${activePage === 'settings' ? 'text-white' : 'text-amber-400'}`} />
            {!sidebarCollapsed && <span>API Credentials & Settings</span>}
          </button>
        </div>

        {/* User Card & Logout */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/60">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 border border-blue-400/40 flex items-center justify-center text-xs font-bold text-white shrink-0">
                {user?.first_name ? user.first_name[0] : 'A'}
              </div>
              {!sidebarCollapsed && (
                <div className="truncate">
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {user?.first_name || 'Admin'} {user?.last_name || ''}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
                </div>
              )}
            </div>
            <button
              onClick={handleLogout}
              title="Logout"
              className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN VIEW AREA */}
      <div
        className={`flex-1 flex flex-col h-screen min-w-0 overflow-hidden transition-all duration-300 pl-0 ${
          sidebarCollapsed ? 'md:pl-20' : 'md:pl-64'
        }`}
      >
        {/* TOPBAR */}
        <header className="sticky top-0 z-30 h-16 border-b border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 dark:bg-slate-900/80 backdrop-blur-xl flex items-center justify-between px-3 sm:px-6 shadow-2xs transition-colors duration-200">
          {/* Tenant Switcher & Breadcrumb */}
          <div className="flex min-w-0 items-center gap-2 sm:gap-4">
            <button
              type="button"
              aria-label="Open menu"
              data-testid="mobile-menu"
              onClick={() => { setSidebarCollapsed(false); setMobileNavOpen(true); }}
              className="md:hidden shrink-0 rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="relative">
              {isSuperAdmin ? (
                <>
                  <button
                    onClick={() => setTenantDropdownOpen(!tenantDropdownOpen)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all shadow-xs ${
                      isImpersonating
                        ? 'bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100'
                        : 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-200/80 dark:border-blue-800/60 hover:bg-blue-100/80 dark:hover:bg-blue-900/40 text-blue-950 dark:text-blue-200'
                    }`}
                  >
                    {isImpersonating ? (
                      <Building2 className="h-3.5 w-3.5 text-amber-600" />
                    ) : (
                      <Globe className="h-3.5 w-3.5 text-blue-600" />
                    )}
                    <span className="max-w-[160px] truncate">
                      {selectedTenant ? selectedTenant.name : '🌐 All Tenants (Global)'}
                    </span>
                    {isImpersonating && (
                      <span className="text-[9px] uppercase tracking-wider bg-amber-200 text-amber-900 px-1.5 py-0.2 rounded font-extrabold">
                        Impersonating
                      </span>
                    )}
                    <ChevronDown className="h-3.5 w-3.5 opacity-70 ml-1" />
                  </button>

                  {tenantDropdownOpen && (
                    <div className="absolute top-11 left-0 z-50 w-72 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl p-2 space-y-1.5 animate-in fade-in zoom-in-95 duration-150">
                      {/* Search box within dropdown */}
                      <div className="relative pb-1 border-b border-slate-100 dark:border-slate-800">
                        <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
                        <input
                          type="text"
                          value={tenantSearch}
                          onChange={(e) => setTenantSearch(e.target.value)}
                          placeholder="Filter tenants..."
                          className="w-full h-7 pl-8 pr-2 rounded-lg bg-[#eaedf2] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-[11px] placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>

                      {/* Option: All Tenants (Global View) */}
                      <div
                        onClick={() => {
                          resetToAllTenants();
                          setTenantDropdownOpen(false);
                          setTenantSearch('');
                        }}
                        className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs cursor-pointer transition-colors ${
                          selectedTenant === null
                            ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Globe className="h-3.5 w-3.5 text-blue-600" />
                          <span>🌐 All Tenants (Global View)</span>
                        </div>
                        {selectedTenant === null && <Check className="h-3.5 w-3.5 text-blue-600" />}
                      </div>

                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 pt-1">
                        Registered Tenants ({filteredTenants.length})
                      </div>

                      <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
                        {filteredTenants.length === 0 ? (
                          <div className="text-[11px] text-slate-400 px-3 py-2 text-center">
                            No tenants match "{tenantSearch}"
                          </div>
                        ) : (
                          filteredTenants.map((t) => {
                            const isSelected = selectedTenant?.id === t.id;
                            return (
                              <div
                                key={t.id}
                                onClick={() => {
                                  switchTenant(t);
                                  setTenantDropdownOpen(false);
                                  setTenantSearch('');
                                }}
                                className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs cursor-pointer transition-colors ${
                                  isSelected
                                    ? 'bg-amber-50 text-amber-900 font-bold border border-amber-200/60'
                                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                              >
                                <div className="truncate">
                                  <div className="font-medium truncate">{t.name}</div>
                                  {t.email && (
                                    <div className="text-[10px] text-slate-400 truncate">{t.email}</div>
                                  )}
                                </div>
                                {isSelected && <Check className="h-3.5 w-3.5 text-amber-600 shrink-0" />}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/60 text-xs font-semibold text-blue-950 dark:text-blue-200 shadow-2xs">
                  <Building2 className="h-3.5 w-3.5 text-blue-600" />
                  <span>{user?.company_name || 'Sharyx Enterprise Inc'}</span>
                </div>
              )}
            </div>

            {/* Dynamic Page Breadcrumb */}
            <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 font-medium border-l border-slate-200 dark:border-slate-800 pl-4">
              <span>Sharyx</span>
              <span>/</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
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
                {activePage === 'profile' && 'Company Profile & Integrations'}
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
                className="w-full h-9 pl-9 pr-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-800/60 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>

            <ThemeToggle />

            <button className="relative text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 p-2 rounded-xl bg-slate-100/70 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all">
              <Bell className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-blue-600 ring-2 ring-white dark:ring-slate-900" />
            </button>
          </div>
        </header>

        {/* SUPER ADMIN IMPERSONATION ALERT BANNER */}
        {isImpersonating && (
          <div className="sticky top-16 z-20 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15 border-b border-amber-300/40 dark:border-amber-500/20 px-6 py-2.5 flex items-center justify-between text-xs text-amber-900 dark:text-amber-200 backdrop-blur-md shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="h-6 w-6 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                <ShieldAlert className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <span className="font-bold">Super Admin Impersonation:</span> Currently filtering data for{' '}
                <span className="font-extrabold underline decoration-amber-500 underline-offset-2">
                  {selectedTenant?.name}
                </span>
                <span className="hidden sm:inline text-slate-500 dark:text-slate-400 ml-2">
                  (All mutations and queries are scoped to this company)
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => resetToAllTenants()}
                className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-[11px] transition-all shadow-xs flex items-center gap-1.5"
              >
                <Globe className="h-3 w-3" />
                <span>Exit to Global View</span>
              </button>
            </div>
          </div>
        )}

        {/* CONTENT BODY */}
        <main ref={mainRef} className={`flex-1 w-full min-w-0 bg-[#eaedf2] dark:bg-slate-950 flex flex-col ${activePage === "omnichannel" ? "p-0 overflow-hidden h-[calc(100vh-4rem)]" : "overflow-y-auto p-3 sm:p-5 lg:p-6 [scrollbar-width:thin]"}`}>
          {activePage === 'dashboard' && <AdminDashboard />}
          {activePage === 'omnichannel' && <OmnichannelInboxPage />}
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
          {activePage === 'profile' && <ProfilePage />}
          {activePage === 'settings' && <SettingsPage />}
        </main>
      </div>
    </div>
  );
};
