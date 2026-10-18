import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { emailService } from '@/service/emailService';
import { EmailAccountConfig } from '@/types/email';
import { Mail, Server, ShieldCheck, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EmailSettingsDialog: React.FC<Props> = ({ open, onOpenChange }) => {
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<EmailAccountConfig>({
    email_address: '',
    smtp_host: 'smtp.gmail.com',
    smtp_port: 587,
    smtp_user: '',
    smtp_password: '',
    imap_host: 'imap.gmail.com',
    imap_port: 993,
    use_ssl: true,
    is_active: true,
  });

  useEffect(() => {
    if (open) {
      emailService.getConfig().then((data) => {
        if (data) setConfig(data);
      });
    }
  }, [open]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await emailService.saveConfig(config);
      toast.success('SMTP & IMAP credentials saved successfully!');
      onOpenChange(false);
    } catch {
      toast.error('Failed to save email settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center space-x-2 text-indigo-400">
            <Mail className="h-5 w-5" />
            <DialogTitle>SMTP & IMAP Mailbox Settings</DialogTitle>
          </div>
          <DialogDescription>
            Configure your outbound SMTP credentials and inbound IMAP server for two-way synchronization.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs font-medium text-slate-300">Display Email Address</label>
              <Input
                placeholder="support@yourdomain.com"
                className="mt-1"
                value={config.email_address}
                onChange={(e) => setConfig({ ...config, email_address: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-300">SMTP Host</label>
              <Input
                placeholder="smtp.gmail.com"
                className="mt-1"
                value={config.smtp_host}
                onChange={(e) => setConfig({ ...config, smtp_host: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-300">SMTP Port</label>
              <Input
                type="number"
                placeholder="587"
                className="mt-1"
                value={config.smtp_port}
                onChange={(e) => setConfig({ ...config, smtp_port: Number(e.target.value) })}
                required
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-300">SMTP Username</label>
              <Input
                placeholder="user@gmail.com"
                className="mt-1"
                value={config.smtp_user}
                onChange={(e) => setConfig({ ...config, smtp_user: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-300">SMTP App Password</label>
              <Input
                type="password"
                placeholder="••••••••••••"
                className="mt-1"
                value={config.smtp_password || ''}
                onChange={(e) => setConfig({ ...config, smtp_password: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800">
            <h4 className="text-xs font-semibold text-slate-200 flex items-center gap-1.5 mb-2">
              <Server className="h-3.5 w-3.5 text-cyan-400" />
              Inbound IMAP Poller (Two-Way Sync)
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-300">IMAP Host</label>
                <Input
                  placeholder="imap.gmail.com"
                  className="mt-1"
                  value={config.imap_host || ''}
                  onChange={(e) => setConfig({ ...config, imap_host: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-300">IMAP Port</label>
                <Input
                  type="number"
                  placeholder="993"
                  className="mt-1"
                  value={config.imap_port || 993}
                  onChange={(e) => setConfig({ ...config, imap_port: Number(e.target.value) })}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              <Switch
                checked={config.use_ssl}
                onCheckedChange={(val) => setConfig({ ...config, use_ssl: val })}
              />
              <span className="text-xs text-slate-300">Enable SSL/TLS</span>
            </div>

            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="emerald" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Save Mailbox
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
