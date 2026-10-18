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
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Mail className="h-4 w-4 text-emerald-400" />
                Launch Mass Email Sequence
              </CardTitle>
              <CardDescription>
                Send HTML email blasts and newsletters to customer segments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLaunch} className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-slate-300">Campaign Name</label>
                  <Input
                    placeholder="e.g. October Feature Release Announcement"
                    className="mt-1"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-300">Email Subject Line</label>
                  <Input
                    placeholder="e.g. Introducing Sharyx AI Copilot v2"
                    className="mt-1"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-300">
                    Recipients (One email per line or comma separated)
                  </label>
                  <Textarea
                    placeholder="client1@domain.com&#10;client2@domain.com"
                    rows={3}
                    className="mt-1 font-mono text-xs"
                    value={recipientsText}
                    onChange={(e) => setRecipientsText(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-300">HTML Email Template</label>
                  <Textarea
                    placeholder="<h1>Exciting News!</h1><p>We are thrilled to unveil...</p>"
                    rows={6}
                    className="mt-1 font-mono text-xs"
                    value={html}
                    onChange={(e) => setHtml(e.target.value)}
                    required
                  />
                </div>

                <Button type="submit" variant="emerald" className="w-full" disabled={submitting}>
                  <Send className="mr-2 h-4 w-4" />
                  {submitting ? 'Dispatching Campaign...' : 'Send Mass Campaign'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right: Email Campaigns Stats */}
        <div className="lg:col-span-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4 text-indigo-400" />
                Active & Sent Email Campaigns
              </CardTitle>
              <CardDescription>Delivery and open rate telemetry</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-slate-800">
                {campaigns.map((camp) => (
                  <div key={camp.id} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-sm font-semibold text-white">{camp.campaign_name}</h4>
                      <Badge
                        variant={
                          camp.campaign_status === 'sent'
                            ? 'success'
                            : camp.campaign_status === 'sending'
                            ? 'warning'
                            : 'secondary'
                        }
                      >
                        {camp.campaign_status}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-400 truncate mb-3">{camp.subject}</p>

                    <div className="grid grid-cols-3 gap-2 text-center bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/60">
                      <div>
                        <p className="text-[10px] text-slate-400">Target Contacts</p>
                        <p className="text-xs font-bold text-white">{camp.recipients_count}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 flex items-center justify-center gap-0.5">
                          <CheckCircle className="h-2.5 w-2.5 text-blue-400" /> Sent Out
                        </p>
                        <p className="text-xs font-bold text-blue-400">{camp.sent_count}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 flex items-center justify-center gap-0.5">
                          <Eye className="h-2.5 w-2.5 text-emerald-400" /> Opened
                        </p>
                        <p className="text-xs font-bold text-emerald-400">{camp.opened_count}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
