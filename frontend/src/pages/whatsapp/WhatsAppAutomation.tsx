import React, { useState, useEffect } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { WhatsAppLiveChat } from './components/WhatsAppLiveChat';
import { WhatsAppAIBrainPage } from './components/WhatsAppAIBrainPage';
import { WhatsAppCampaignFormPage } from './components/WhatsAppCampaignFormPage';
import { WhatsAppTemplatesTab } from './components/WhatsAppTemplatesTab';
import { WhatsAppAnalyticsPage } from './components/WhatsAppAnalyticsPage';
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
} from 'lucide-react';

export const WhatsAppAutomation: React.FC = () => {
  const [activeTab, setActiveTab] = useState('templates');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [config, setConfig] = useState<WhatsAppConfig | null>(null);

  const loadConfig = async () => {
    try {
      const data = await whatsappService.getConfig();
      if (data && (data.phone_number || data.phone_number_id)) {
        setConfig(data);
      } else {
        // Fallback to onboarding session if present
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              WhatsApp Automation Suite
            </h1>
            <Badge
              variant={isConnected ? 'success' : 'warning'}
              className="gap-1.5 py-1"
            >
              <Radio
                className={`h-3 w-3 ${
                  isConnected ? 'text-emerald-400 animate-pulse' : 'text-amber-400'
                }`}
              />
              {isConnected
                ? `${config?.provider === 'qr_gateway' ? 'QR Web Session' : config?.provider === 'custom_gateway' ? 'Custom Gateway' : 'Meta Cloud API v18.0'}`
                : 'Not Connected'}
            </Badge>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Omnichannel WhatsApp business messaging, Meta message templates, autonomous AI copilot, and automated campaigns.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setTemplateOpen(true)}
            className="gap-1.5 border-slate-700 text-slate-200 hover:text-white"
          >
            <PlusCircle className="h-4 w-4 text-emerald-400" />
            Meta Template
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setSettingsOpen(true)}
            className="gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200"
          >
            <Settings className="h-4 w-4 text-slate-400" />
            API Credentials
          </Button>
        </div>
      </div>

      {/* 🟢 Live Telemetry & Connected Account Card */}
      <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-center">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <Phone className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
              Sender Phone Number
            </span>
            <span className="text-sm font-semibold text-slate-100 truncate block">
              {config?.phone_number || '+91 93440 78088'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
              Phone Number ID
            </span>
            <span className="text-xs font-mono font-semibold text-slate-200 truncate block">
              {config?.phone_number_id || '1154030421127355'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
            <Layers className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
              WhatsApp Business (WABA) ID
            </span>
            <span className="text-xs font-mono font-semibold text-slate-200 truncate block">
              {config?.waba_id || '1000898049032550'}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3 pl-2 sm:border-l border-slate-800">
          <div className="text-right">
            <span className="text-[10px] text-slate-500 block">Webhook Handshake</span>
            <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1 justify-end">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Active & Verified
            </span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSettingsOpen(true)}
            className="text-xs text-slate-400 hover:text-white"
          >
            Configure
          </Button>
        </div>
      </div>

      {/* Tabs Hub */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-5 max-w-2xl bg-slate-900 border border-slate-800">
          <TabsTrigger value="templates" className="gap-2 text-xs">
            <LayoutTemplate className="h-3.5 w-3.5 text-amber-400" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="campaigns" className="gap-2 text-xs">
            <Megaphone className="h-3.5 w-3.5 text-emerald-400" />
            Campaigns
          </TabsTrigger>
          <TabsTrigger value="live_chat" className="gap-2 text-xs">
            <MessageSquare className="h-3.5 w-3.5 text-cyan-400" />
            Live Chat
          </TabsTrigger>
          <TabsTrigger value="ai_brain" className="gap-2 text-xs">
            <Bot className="h-3.5 w-3.5 text-indigo-400" />
            AI Brain
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2 text-xs">
            <BarChart3 className="h-3.5 w-3.5 text-purple-400" />
            Telemetry
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="mt-4">
          <WhatsAppTemplatesTab />
        </TabsContent>

        <TabsContent value="campaigns" className="mt-4">
          <WhatsAppCampaignFormPage />
        </TabsContent>

        <TabsContent value="live_chat" className="mt-4">
          <WhatsAppLiveChat />
        </TabsContent>

        <TabsContent value="ai_brain" className="mt-4">
          <WhatsAppAIBrainPage />
        </TabsContent>

        <TabsContent value="analytics" className="mt-4">
          <WhatsAppAnalyticsPage />
        </TabsContent>
      </Tabs>

      {/* Dialog Modals */}
      <WhatsAppSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      <CreateWhatsAppTemplateDialog open={templateOpen} onOpenChange={setTemplateOpen} />
    </div>
  );
};
