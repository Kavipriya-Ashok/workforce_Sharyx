import React, { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmailInbox } from './components/EmailInbox';
import { EmailAISettingsView } from './components/EmailAISettingsView';
import { CreateCampaignView } from './components/CreateCampaignView';
import { EmailTemplatesTab } from './components/EmailTemplatesTab';
import { ComposeEmailDialog } from './components/ComposeEmailDialog';
import { EmailSettingsDialog } from './components/EmailSettingsDialog';
import { emailService } from '@/service/emailService';
import { toast } from 'sonner';
import {
  Mail,
  Bot,
  Send,
  Settings,
  PlusCircle,
  Inbox,
  Sparkles,
  RefreshCw,
  LayoutTemplate,
  Key,
} from 'lucide-react';

interface Props {
  initialTab?: 'inbox' | 'templates' | 'ai_settings' | 'campaigns' | 'settings';
}

export const EmailAutomation: React.FC<Props> = ({ initialTab = 'inbox' }) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [composeOpen, setComposeOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className="space-y-6">
      {/* Email Suite Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              Email Automation Suite
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
              <Sparkles className="h-3 w-3 text-purple-600" />
              Nodemailer + IMAP Poller
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Two-way email synchronization, autonomous AI email copilot, template library, and multi-recipient sequences.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              try {
                toast.loading('Syncing incoming emails and leads...', { id: 'email-sync' });
                const res = await emailService.syncInbox();
                const count = res?.synced ?? 0;
                toast.success(`Sync complete! ${count} new email(s) processed & CRM leads updated.`, { id: 'email-sync' });
              } catch (err: any) {
                toast.error(err.message || 'Sync failed', { id: 'email-sync' });
              }
            }}
            className="gap-1.5 border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-xs rounded-xl"
          >
            <RefreshCw className="h-3.5 w-3.5 text-blue-600" />
            Sync Inbox & Leads
          </Button>
          <Button
            size="sm"
            onClick={() => setComposeOpen(true)}
            className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm shadow-blue-500/20 font-semibold"
          >
            <PlusCircle className="h-4 w-4" />
            Compose Email
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSettingsOpen(true)}
            className="gap-1.5 border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-xs rounded-xl"
          >
            <Settings className="h-4 w-4 text-slate-500" />
            Mailbox Setup
          </Button>
        </div>
      </div>

      {/* Tabs Hub */}
      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)} className="w-full">
        <TabsList className="grid grid-cols-5 max-w-2xl bg-slate-100/80 p-1 rounded-2xl border border-slate-200">
          <TabsTrigger value="inbox" className="gap-2 text-xs rounded-xl data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-xs">
            <Inbox className="h-3.5 w-3.5" />
            Two-Way Inbox
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2 text-xs rounded-xl data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-xs">
            <LayoutTemplate className="h-3.5 w-3.5" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="ai_settings" className="gap-2 text-xs rounded-xl data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-xs">
            <Bot className="h-3.5 w-3.5" />
            AI Auto-Reply
          </TabsTrigger>
          <TabsTrigger value="campaigns" className="gap-2 text-xs rounded-xl data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-xs">
            <Send className="h-3.5 w-3.5" />
            Sequences
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2 text-xs rounded-xl data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-xs">
            <Key className="h-3.5 w-3.5" />
            Email Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inbox" className="mt-4">
          <EmailInbox />
        </TabsContent>

        <TabsContent value="templates" className="mt-4">
          <EmailTemplatesTab />
        </TabsContent>

        <TabsContent value="ai_settings" className="mt-4">
          <EmailAISettingsView />
        </TabsContent>

        <TabsContent value="campaigns" className="mt-4">
          <CreateCampaignView />
        </TabsContent>

        <TabsContent value="settings" className="mt-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs max-w-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Mailbox & SMTP / Google OAuth Configuration</h3>
                <p className="text-xs text-slate-500">Configure outbound SMTP server or connect your Gmail account via OAuth 2.0</p>
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
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase">Provider Mode</span>
                <p className="text-sm font-semibold text-slate-900">Google OAuth 2.0 & SMTP</p>
              </div>
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase">Incoming Sync</span>
                <p className="text-sm font-semibold text-slate-900">IMAP Automated Poller (Every 15s)</p>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialog Modals */}
      <ComposeEmailDialog open={composeOpen} onOpenChange={setComposeOpen} />
      <EmailSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
};
