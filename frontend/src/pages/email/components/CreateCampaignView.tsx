import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { emailService } from '@/service/emailService';
import { EmailCampaign } from '@/types/email';
import { Mail, Send, Users, CheckCircle, Eye, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export const CreateCampaignView: React.FC = () => {
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [html, setHtml] = useState('');
  const [recipientsText, setRecipientsText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    emailService.getCampaigns().then(setCampaigns);
  }, []);

  const handleLaunch = async (e: React.FormEvent) => {
    e.preventDefault();
    const emails = recipientsText
      .split(/[\n,]+/)
      .map((e) => e.trim())
      .filter((e) => e.includes('@'));

    if (emails.length === 0) {
      toast.error('Please enter at least one valid recipient email');
      return;
    }

    setSubmitting(true);
    try {
      await emailService.createCampaign({
        campaign_name: name,
        subject,
        html_template: html,
        recipients: emails,
      });
      toast.success(`Email Campaign "${name}" dispatched to ${emails.length} contacts!`);
      setName('');
      setSubject('');
      setHtml('');
      setRecipientsText('');
      const updated = await emailService.getCampaigns();
      setCampaigns(updated);
    } catch {
      toast.error('Failed to create email campaign');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Email Campaign Creator */}
        <div className="lg:col-span-6">
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs rounded-2xl">
            <CardHeader>
              <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Mail className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                Launch Mass Email Sequence
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
                Send HTML email blasts, quotations, and newsletters to customer segments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLaunch} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Campaign Name</label>
                  <Input
                    placeholder="e.g. October Feature Release Announcement"
                    className="mt-1 bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 rounded-xl"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Email Subject Line</label>
                  <Input
                    placeholder="e.g. Introducing Sharyx AI Copilot v2"
                    className="mt-1 bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 rounded-xl"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Recipients (One email per line or comma separated)
                  </label>
                  <Textarea
                    placeholder="client1@domain.com&#10;client2@domain.com"
                    rows={3}
                    className="mt-1 font-mono text-xs bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 rounded-xl"
                    value={recipientsText}
                    onChange={(e) => setRecipientsText(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">HTML Email Template</label>
                  <Textarea
                    placeholder="<h1>Exciting News!</h1><p>We are thrilled to unveil...</p>"
                    rows={6}
                    className="mt-1 font-mono text-xs bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 rounded-xl"
                    value={html}
                    onChange={(e) => setHtml(e.target.value)}
                    required
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-xs"
                  disabled={submitting}
                >
                  <Send className="mr-2 h-4 w-4" />
                  {submitting ? 'Dispatching Campaign...' : 'Send Mass Campaign'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right: Email Campaigns Stats */}
        <div className="lg:col-span-6">
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs rounded-2xl">
            <CardHeader>
              <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Users className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                Active & Sent Email Campaigns
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 dark:text-slate-400">Delivery and open rate telemetry</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {campaigns.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500">No email campaigns created yet</div>
                ) : (
                  campaigns.map((camp) => (
                    <div key={camp.id} className="py-3.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{camp.campaign_name}</span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            camp.campaign_status === 'sent'
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60'
                              : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/60'
                          }`}
                        >
                          {camp.campaign_status}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 truncate">{camp.subject}</p>
                      <div className="flex items-center gap-4 text-[11px] text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3 text-slate-400" />
                          {camp.recipients_count} Recipients
                        </span>
                        <span className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3 text-emerald-500" />
                          {camp.sent_count} Delivered
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3 text-blue-500" />
                          {camp.opened_count} Opened
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
