import React, { useState, useEffect } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { EmailInbox } from './components/EmailInbox';
import { EmailAISettingsView } from './components/EmailAISettingsView';
import { CreateCampaignView } from './components/CreateCampaignView';
import { EmailTemplatesTab } from './components/EmailTemplatesTab';
import { ComposeEmailDialog } from './components/ComposeEmailDialog';
import { SettingsPage } from '@/pages/settings/SettingsPage';
import { emailService } from '@/service/emailService';
import { toast } from 'sonner';
import {
  Inbox,
  Sparkles,
  RefreshCw,
  LayoutTemplate,
  Key,
  Plus,
  Settings,
  Bot,
  Send,
} from 'lucide-react';

interface Props {
  initialTab?: 'inbox' | 'templates' | 'ai_settings' | 'campaigns' | 'settings';
  onTabChange?: (tab: 'inbox' | 'templates' | 'ai_settings' | 'campaigns' | 'settings') => void;
}

export const EmailAutomation: React.FC<Props> = ({ initialTab = 'inbox', onTabChange }) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [composeOpen, setComposeOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(initialTab === 'settings');
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
      setSettingsOpen(initialTab === 'settings');
    }
  }, [initialTab]);

  const handleTabChange = (val: 'inbox' | 'templates' | 'ai_settings' | 'campaigns' | 'settings') => {
    setActiveTab(val);
    setSettingsOpen(val === 'settings');
    onTabChange?.(val);
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      toast.loading('Synchronizing IMAP inbox & CRM leads...', { id: 'email-sync' });
      const res = await emailService.syncInbox();
      const count = res?.synced ?? 0;
      toast.success(`Sync complete! ${count} new email(s) processed.`, { id: 'email-sync' });
    } catch (err: any) {
      toast.error(err.message || 'Sync failed. Check IMAP settings.', { id: 'email-sync' });
    } finally {
      setSyncing(false);
    }
  };

  if (settingsOpen || activeTab === 'settings') {
    return (
      <SettingsPage
        initialTab="email"
        onBack={() => {
          setActiveTab('inbox');
          setSettingsOpen(false);
          onTabChange?.('inbox');
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Email Suite Compact Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-300 dark:border-slate-800 transition-colors">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {activeTab === 'inbox' ? 'Two-Way Inbox' : 'Email Automation Suite'}
            </h1>
            {activeTab !== 'inbox' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60">
                <Sparkles className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                Nodemailer + IMAP Poller
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {activeTab === 'inbox'
              ? 'Manage conversations, reply faster with AI, and track all email communication.'
              : 'Two-way email synchronization, autonomous AI email copilot, template library, and multi-recipient sequences.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={syncing}
            className="h-8 gap-1.5 text-xs border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-2xs rounded-xl"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-blue-600 dark:text-blue-400 ${syncing ? 'animate-spin' : ''}`} />
            <span>Sync Inbox & Leads</span>
          </Button>

          <Button
            size="sm"
            onClick={() => setComposeOpen(true)}
            className="h-8 gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs shadow-blue-600/20 font-semibold"
          >
            <Plus className="h-4 w-4" />
            <span>Compose Email</span>
          </Button>

          {activeTab !== 'inbox' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSettingsOpen(true)}
              className="h-8 gap-1.5 text-xs border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-2xs rounded-xl"
            >
              <Settings className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
              <span className="hidden sm:inline">Mailbox Setup</span>
            </Button>
          )}
        </div>
      </div>

      {/* Tabs Hub */}
      <Tabs value={activeTab} onValueChange={(val) => handleTabChange(val as any)} className="w-full">
        <TabsList className="flex items-center flex-nowrap w-fit max-w-full overflow-x-auto gap-1 p-1 bg-slate-100/90 dark:bg-slate-800/80 rounded-xl border border-slate-300 dark:border-slate-700/80 shadow-2xs">
          <TabsTrigger
            value="inbox"
            className="shrink-0 whitespace-nowrap gap-1.5 text-xs rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:shadow-xs text-slate-600 dark:text-slate-400 font-medium transition-all"
          >
            <Inbox className="h-3.5 w-3.5" />
            Two-Way Inbox
          </TabsTrigger>
          <TabsTrigger
            value="templates"
            className="shrink-0 whitespace-nowrap gap-1.5 text-xs rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:shadow-xs text-slate-600 dark:text-slate-400 font-medium transition-all"
          >
            <LayoutTemplate className="h-3.5 w-3.5" />
            Templates
          </TabsTrigger>
          <TabsTrigger
            value="ai_settings"
            className="shrink-0 whitespace-nowrap gap-1.5 text-xs rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:shadow-xs text-slate-600 dark:text-slate-400 font-medium transition-all"
          >
            <Bot className="h-3.5 w-3.5" />
            AI Auto-Reply
          </TabsTrigger>
          <TabsTrigger
            value="campaigns"
            className="shrink-0 whitespace-nowrap gap-1.5 text-xs rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:shadow-xs text-slate-600 dark:text-slate-400 font-medium transition-all"
          >
            <Send className="h-3.5 w-3.5" />
            Sequences
          </TabsTrigger>
          <TabsTrigger
            value="settings"
            className="shrink-0 whitespace-nowrap gap-1.5 text-xs rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:shadow-xs text-slate-600 dark:text-slate-400 font-medium transition-all"
          >
            <Key className="h-3.5 w-3.5" />
            Email Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inbox" className="mt-3">
          <EmailInbox onOpenCompose={() => setComposeOpen(true)} />
        </TabsContent>

        <TabsContent value="templates" className="mt-3">
          <EmailTemplatesTab />
        </TabsContent>

        <TabsContent value="ai_settings" className="mt-3">
          <EmailAISettingsView />
        </TabsContent>

        <TabsContent value="campaigns" className="mt-3">
          <CreateCampaignView />
        </TabsContent>

        <TabsContent value="settings" className="mt-3">
          <div className="rounded-2xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs max-w-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Mailbox & SMTP / Google OAuth Configuration</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Configure outbound SMTP server or connect your Gmail account via OAuth 2.0</p>
              </div>
              <Button
                size="sm"
                onClick={() => setSettingsOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs"
              >
                Configure Mailbox
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 space-y-1">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">Provider Mode</span>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Google OAuth 2.0 & SMTP</p>
              </div>
              <div className="p-4 rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 space-y-1">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">Incoming Sync</span>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">IMAP Automated Poller (Every 15s)</p>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Global Compose Dialog */}
      <ComposeEmailDialog open={composeOpen} onOpenChange={setComposeOpen} />
    </div>
  );
};
