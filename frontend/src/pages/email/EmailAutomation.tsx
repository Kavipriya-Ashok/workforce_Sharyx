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
} from 'lucide-react';

export const EmailAutomation: React.FC = () => {
  const [activeTab, setActiveTab] = useState('inbox');
  const [composeOpen, setComposeOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className="space-y-6">
      {/* Email Suite Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              Email Automation Suite
            </h1>
            <Badge variant="purple" className="gap-1.5 py-1">
              <Sparkles className="h-3 w-3 text-indigo-400" />
              Nodemailer + IMAP Poller
            </Badge>
          </div>
          <p className="text-xs text-slate-400 mt-1">
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
            className="gap-1.5 border-slate-700 bg-slate-800 text-slate-200 hover:text-white"
          >
            <RefreshCw className="h-4 w-4 text-cyan-400" />
            Sync Inbox & Leads
          </Button>
          <Button
            variant="emerald"
            size="sm"
            onClick={() => setComposeOpen(true)}
            className="gap-1.5"
          >
            <PlusCircle className="h-4 w-4" />
            Compose Email
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setSettingsOpen(true)}
            className="gap-1.5"
          >
            <Settings className="h-4 w-4 text-slate-400" />
            Mailbox Setup
          </Button>
        </div>
      </div>

      {/* Tabs Hub */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-4 max-w-xl">
          <TabsTrigger value="inbox" className="gap-2 text-xs">
            <Inbox className="h-3.5 w-3.5" />
            Two-Way Inbox
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2 text-xs">
            <LayoutTemplate className="h-3.5 w-3.5 text-indigo-400" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="ai_settings" className="gap-2 text-xs">
            <Bot className="h-3.5 w-3.5 text-indigo-400" />
            AI Auto-Reply
          </TabsTrigger>
          <TabsTrigger value="campaigns" className="gap-2 text-xs">
            <Send className="h-3.5 w-3.5 text-emerald-400" />
            Sequences
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inbox">
          <EmailInbox />
        </TabsContent>

        <TabsContent value="templates">
          <EmailTemplatesTab />
        </TabsContent>

        <TabsContent value="ai_settings">
          <EmailAISettingsView />
        </TabsContent>

        <TabsContent value="campaigns">
          <CreateCampaignView />
        </TabsContent>
      </Tabs>

      {/* Dialog Modals */}
      <ComposeEmailDialog open={composeOpen} onOpenChange={setComposeOpen} />
      <EmailSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
};
