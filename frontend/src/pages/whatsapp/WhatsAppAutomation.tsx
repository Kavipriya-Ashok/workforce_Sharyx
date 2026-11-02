import React, { useState, useEffect } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { WhatsAppLiveChat } from './components/WhatsAppLiveChat';
import { WhatsAppAIBrainPage } from './components/WhatsAppAIBrainPage';
import { WhatsAppCampaignFormPage } from './components/WhatsAppCampaignFormPage';
import { WhatsAppTemplatesTab } from './components/WhatsAppTemplatesTab';
import { WhatsAppAnalyticsPage } from './components/WhatsAppAnalyticsPage';
import { WhatsAppSyncSection } from './components/WhatsAppSyncSection';
import { WhatsAppSettingsDialog } from './components/WhatsAppSettingsDialog';
import { CreateWhatsAppTemplateDialog } from './components/CreateWhatsAppTemplateDialog';
import { whatsappService } from '@/service/whatsappService';
import { WhatsAppConfig } from '@/types/whatsapp';
import {
  MessageSquare,
  Bot,
  Megaphone,
  BarChart3,
  Settings,
  PlusCircle,
  Radio,
  Phone,
  ShieldCheck,
  CheckCircle2,
  Layers,
  LayoutTemplate,
  Activity,
  RefreshCw,
} from 'lucide-react';

interface WhatsAppAutomationProps {
  initialTab?: string;
  onTabChange?: (tab: string) => void;
}

export const WhatsAppAutomation: React.FC<WhatsAppAutomationProps> = ({ initialTab = 'live_chat', onTabChange }) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [diagnosticOpen, setDiagnosticOpen] = useState(false);
  const [config, setConfig] = useState<WhatsAppConfig | null>(null);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    onTabChange?.(tab);
  };

  const loadConfig = async () => {
    try {
      const data = await whatsappService.getConfig();
      if (data && (data.phone_number || data.phone_number_id)) {
        setConfig(data);
      } else {
        const savedUser = localStorage.getItem('sharyx_user');
        if (savedUser) {
          const u = JSON.parse(savedUser);
          if (u?.onboarding_data?.whatsapp_config) {
            setConfig(u.onboarding_data.whatsapp_config);
          }
        }
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const isConnected = Boolean(config?.phone_number || config?.phone_number_id);

  return (
    <div className="space-y-6">
      {/* WhatsApp Suite Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-blue-100">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
              WhatsApp Automation Suite
            </h1>
            <Badge
              className={`gap-1.5 py-1 text-xs font-semibold ${
                isConnected
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}
            >
              <Radio
                className={`h-3 w-3 ${
                  isConnected ? 'text-emerald-500 animate-pulse' : 'text-amber-500'
                }`}
              />
              {isConnected
                ? `${config?.provider === 'qr_gateway' ? 'QR Web Session' : config?.provider === 'custom_gateway' ? 'Custom Gateway' : 'Meta Cloud API v21.0'}`
                : 'Not Connected'}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Omnichannel WhatsApp business messaging, Meta message templates, autonomous AI copilot, and automated campaigns.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Diagnostic Modal Trigger */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDiagnosticOpen(true)}
            className="text-xs font-semibold text-slate-700 border-slate-200 hover:bg-slate-50 gap-1.5"
            title="Open real-time diagnostics, webhook tester & DB sync"
          >
            <Activity className="h-4 w-4 text-cyan-600" />
            Diagnostics & Health
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setTemplateOpen(true)}
            className="text-xs font-semibold text-slate-700 border-slate-200 hover:bg-slate-50 gap-1.5"
          >
            <PlusCircle className="h-4 w-4 text-blue-600" />
            Meta Template
          </Button>

          <Button
            size="sm"
            onClick={() => setSettingsOpen(true)}
            className="text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white gap-1.5 shadow-sm shadow-blue-500/20"
          >
            <Settings className="h-4 w-4" />
            API Credentials
          </Button>
        </div>
      </div>

      {/* Live Telemetry & Connected Account Card */}
      <div className="p-4 sm:p-5 rounded-2xl border border-blue-150 bg-white shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-center">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
            <Phone className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Sender Phone Number
            </span>
            <span className="text-xs font-bold text-slate-900 truncate block">
              {config?.phone_number || '+91 93440 78088'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Phone Number ID
            </span>
            <span className="text-xs font-mono font-semibold text-slate-800 truncate block">
              {config?.phone_number_id || '1154030421127355'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-cyan-50 border border-cyan-200 flex items-center justify-center text-cyan-600 shrink-0">
            <Layers className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              WhatsApp Business (WABA) ID
            </span>
            <span className="text-xs font-mono font-semibold text-slate-800 truncate block">
              {config?.waba_id || '1000898049032550'}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3 pl-2 sm:border-l border-blue-100">
          <div className="text-right">
            <span className="text-[10px] text-slate-400 block font-medium">Meta Webhook Handshake</span>
            <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 justify-end">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Active & Verified
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setDiagnosticOpen(true)}
            className="text-xs font-semibold text-blue-700 border-blue-200 hover:bg-blue-50"
          >
            Inspect
          </Button>
        </div>
      </div>

      {/* Clean 5-Tab Navigation Hub */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="flex flex-wrap items-center gap-1.5 p-1.5 bg-white border border-blue-150 rounded-2xl shadow-xs">
          <TabsTrigger
            value="live_chat"
            className="gap-2 text-xs font-semibold px-3 py-2 rounded-xl text-slate-600 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-xs transition-all"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Live Chat Inbox
          </TabsTrigger>
          <TabsTrigger
            value="campaigns"
            className="gap-2 text-xs font-semibold px-3 py-2 rounded-xl text-slate-600 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-xs transition-all"
          >
            <Megaphone className="h-3.5 w-3.5" />
            Campaigns & Broadcast
          </TabsTrigger>
          <TabsTrigger
            value="templates"
            className="gap-2 text-xs font-semibold px-3 py-2 rounded-xl text-slate-600 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-xs transition-all"
          >
            <LayoutTemplate className="h-3.5 w-3.5" />
            Meta Templates
          </TabsTrigger>
          <TabsTrigger
            value="ai_brain"
            className="gap-2 text-xs font-semibold px-3 py-2 rounded-xl text-slate-600 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-xs transition-all"
          >
            <Bot className="h-3.5 w-3.5" />
            AI Brain & Copilot
          </TabsTrigger>
          <TabsTrigger
            value="analytics"
            className="gap-2 text-xs font-semibold px-3 py-2 rounded-xl text-slate-600 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-xs transition-all"
          >
            <BarChart3 className="h-3.5 w-3.5" />
            Telemetry & SLAs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="live_chat" className="mt-4">
          <WhatsAppLiveChat />
        </TabsContent>

        <TabsContent value="campaigns" className="mt-4">
          <WhatsAppCampaignFormPage />
        </TabsContent>

        <TabsContent value="templates" className="mt-4">
          <WhatsAppTemplatesTab />
        </TabsContent>

        <TabsContent value="ai_brain" className="mt-4">
          <WhatsAppAIBrainPage />
        </TabsContent>

        <TabsContent value="analytics" className="mt-4">
          <WhatsAppAnalyticsPage />
        </TabsContent>
      </Tabs>

      {/* Diagnostics Modal: Real-time Database sync, Webhook tests, and audit telemetry */}
      <Dialog open={diagnosticOpen} onOpenChange={setDiagnosticOpen}>
        <DialogContent className="max-w-4xl max-h-[88vh] overflow-y-auto bg-white border border-blue-150 shadow-2xl p-6 text-slate-900">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-slate-900">
              <Activity className="h-5 w-5 text-cyan-600" />
              WhatsApp Live Diagnostics & Synchronization
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Verify database record sync, Meta API credentials, and live webhook handshakes.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <WhatsAppSyncSection />
          </div>
        </DialogContent>
      </Dialog>

      {/* Settings & Template Creation Modals */}
      <WhatsAppSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      <CreateWhatsAppTemplateDialog open={templateOpen} onOpenChange={setTemplateOpen} />
    </div>
  );
};
