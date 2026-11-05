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
      setConfig(data && (data.phone_number || data.phone_number_id) ? data : null);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const isConnected = Boolean(config?.is_connected && (config?.phone_number || config?.phone_number_id));

  return (
    <div className="space-y-3.5">
      {/* WhatsApp Suite Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-300 dark:border-slate-800 transition-colors">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
              {activeTab === 'live_chat' ? 'WhatsApp Live Chat Inbox' : 'WhatsApp Automation Suite'}
            </h1>
            <Badge
              className={`gap-1.5 py-0.5 text-[11px] font-semibold ${
                isConnected
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60'
                  : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60'
              }`}
            >
              <Radio
                className={`h-3 w-3 ${
                  isConnected ? 'text-emerald-500 animate-pulse' : 'text-amber-500'
                }`}
              />
              {isConnected ? 'Connected' : 'Not Connected'}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {activeTab === 'live_chat'
              ? 'Converse with customers in real time, manage queries, and automate responses.'
              : 'Omnichannel WhatsApp business messaging, Meta message templates, autonomous AI copilot, and automated campaigns.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDiagnosticOpen(true)}
            className="h-8 text-xs font-semibold text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 gap-1.5 rounded-xl"
            title="Open real-time diagnostics, webhook tester & DB sync"
          >
            <Activity className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
            <span className="hidden sm:inline">Diagnostics & Health</span>
          </Button>

          {activeTab === 'live_chat' ? (
            <Button
              size="sm"
              onClick={() => {
                const newBtn = document.querySelector('[data-new-chat-trigger]') as HTMLButtonElement;
                if (newBtn) newBtn.click();
              }}
              className="h-8 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white gap-1.5 rounded-xl shadow-xs shadow-blue-600/20"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              <span>New Chat</span>
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTemplateOpen(true)}
                className="h-8 text-xs font-semibold text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 gap-1.5 rounded-xl"
              >
                <PlusCircle className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                <span className="hidden sm:inline">Meta Template</span>
              </Button>

              <Button
                size="sm"
                onClick={() => setSettingsOpen(true)}
                className="h-8 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white gap-1.5 rounded-xl shadow-xs shadow-blue-600/20"
              >
                <Settings className="h-3.5 w-3.5" />
                <span>API Credentials</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Compact Integration Telemetry Ribbon - shown only when not on live_chat */}
      {activeTab !== 'live_chat' && (
      <div className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-800/80 bg-white dark:bg-slate-900/90 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <Phone className="h-3 w-3" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-semibold uppercase text-slate-400 dark:text-slate-500">Sender:</span>
              <span className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100">
                {config?.phone_number || '+91 93440 78088'}
              </span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2">
            <div className="h-6 w-6 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/60 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
              <ShieldCheck className="h-3 w-3" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-semibold uppercase text-slate-400 dark:text-slate-500">Phone ID:</span>
              <span className="text-xs font-mono text-slate-700 dark:text-slate-300">
                {config?.phone_number_id || '1154030421127355'}
              </span>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-2">
            <div className="h-6 w-6 rounded-lg bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200 dark:border-cyan-800/60 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shrink-0">
              <Layers className="h-3 w-3" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-semibold uppercase text-slate-400 dark:text-slate-500">WABA:</span>
              <span className="text-xs font-mono text-slate-700 dark:text-slate-300">
                {config?.waba_id || '1000898049032550'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 ml-auto">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span className="text-[11px]">Webhook Handshake Active</span>
          </div>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => setDiagnosticOpen(true)}
            className="h-6 px-2 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50"
          >
            Inspect
          </Button>
        </div>
      </div>
      )}

      {/* 5-Tab Navigation Hub */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="flex items-center flex-nowrap w-fit max-w-full overflow-x-auto gap-1 p-1 bg-slate-100/90 dark:bg-slate-800/80 rounded-xl border border-slate-300 dark:border-slate-700/80 shadow-2xs">
          <TabsTrigger
            value="live_chat"
            className="shrink-0 whitespace-nowrap gap-1.5 text-xs rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:shadow-xs text-slate-600 dark:text-slate-400 font-medium transition-all"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Live Chat Inbox
          </TabsTrigger>
          <TabsTrigger
            value="campaigns"
            className="shrink-0 whitespace-nowrap gap-1.5 text-xs rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:shadow-xs text-slate-600 dark:text-slate-400 font-medium transition-all"
          >
            <Megaphone className="h-3.5 w-3.5" />
            Campaigns & Broadcast
          </TabsTrigger>
          <TabsTrigger
            value="templates"
            className="shrink-0 whitespace-nowrap gap-1.5 text-xs rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:shadow-xs text-slate-600 dark:text-slate-400 font-medium transition-all"
          >
            <LayoutTemplate className="h-3.5 w-3.5" />
            Meta Templates
          </TabsTrigger>
          <TabsTrigger
            value="ai_brain"
            className="shrink-0 whitespace-nowrap gap-1.5 text-xs rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:shadow-xs text-slate-600 dark:text-slate-400 font-medium transition-all"
          >
            <Bot className="h-3.5 w-3.5" />
            AI Brain & Copilot
          </TabsTrigger>
          <TabsTrigger
            value="analytics"
            className="shrink-0 whitespace-nowrap gap-1.5 text-xs rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:shadow-xs text-slate-600 dark:text-slate-400 font-medium transition-all"
          >
            <BarChart3 className="h-3.5 w-3.5" />
            Telemetry & SLAs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="live_chat" className="mt-3">
          <WhatsAppLiveChat />
        </TabsContent>

        <TabsContent value="campaigns" className="mt-3">
          <WhatsAppCampaignFormPage />
        </TabsContent>

        <TabsContent value="templates" className="mt-3">
          <WhatsAppTemplatesTab />
        </TabsContent>

        <TabsContent value="ai_brain" className="mt-3">
          <WhatsAppAIBrainPage />
        </TabsContent>

        <TabsContent value="analytics" className="mt-3">
          <WhatsAppAnalyticsPage />
        </TabsContent>
      </Tabs>

      {/* Diagnostics Modal: Real-time Database sync, Webhook tests, and audit telemetry */}
      <Dialog open={diagnosticOpen} onOpenChange={setDiagnosticOpen}>
        <DialogContent className="max-w-4xl max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
              WhatsApp Live Diagnostics & Synchronization
            </DialogTitle>
            <DialogDescription>
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
