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
import { EmailAccountConfig, OAuthStatus } from '@/types/email';
import { Mail, Server, CheckCircle2, Loader2, Sparkles, LogOut, ExternalLink, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EmailSettingsDialog: React.FC<Props> = ({ open, onOpenChange }) => {
  const [activeMode, setActiveMode] = useState<'google' | 'smtp'>('google');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [oauthStatus, setOauthStatus] = useState<OAuthStatus | null>(null);

  const [config, setConfig] = useState<EmailAccountConfig>({
    provider: 'smtp',
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

  const fetchStatusAndConfig = async () => {
    try {
      const [cfg, status] = await Promise.all([
        emailService.getConfig(),
        emailService.getOAuthStatus(),
      ]);
      if (cfg) {
        setConfig(cfg);
        if (cfg.provider === 'google-email') {
          setActiveMode('google');
        }
      }
      setOauthStatus(status);
    } catch {
      // Ignored
    }
  };

  useEffect(() => {
    if (open) {
      fetchStatusAndConfig();
    }
  }, [open]);

  // Google OAuth Flow
  const handleConnectGoogle = async () => {
    try {
      setOauthLoading(true);
      const redirectUri = `${window.location.origin}/oauth/callback`;
      const authUrl = await emailService.getGoogleAuthUrl(redirectUri);
      if (authUrl) {
        window.location.href = authUrl;
      } else {
        toast.error('Could not generate Google authorization URL. Check server configuration.');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Failed to start Google OAuth.');
    } finally {
      setOauthLoading(false);
    }
  };

  const handleDisconnectGoogle = async () => {
    try {
      setOauthLoading(true);
      await emailService.disconnectGoogle();
      toast.success('Google account disconnected successfully.');
      await fetchStatusAndConfig();
    } catch (err: any) {
      toast.error(err.message || 'Failed to disconnect Google account.');
    } finally {
      setOauthLoading(false);
    }
  };

  // SMTP Save
  const handleSaveSmtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await emailService.saveConfig({ ...config, provider: 'smtp' });
      toast.success('SMTP & IMAP credentials saved successfully!');
      onOpenChange(false);
    } catch {
      toast.error('Failed to save email settings');
    } finally {
      setLoading(false);
    }
  };

  const isGoogleConnected = oauthStatus?.isConnected && oauthStatus?.provider === 'google-email';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl bg-slate-900 border-slate-800 text-white">
        <DialogHeader>
          <div className="flex items-center space-x-2 text-indigo-400">
            <Mail className="h-5 w-5" />
            <DialogTitle className="text-lg font-bold text-white">Email Connection & Mailbox Setup</DialogTitle>
          </div>
          <DialogDescription className="text-xs text-slate-400">
            Connect your Gmail via Google OAuth 2.0 or configure manual SMTP for outbound dispatch.
          </DialogDescription>
        </DialogHeader>

        {/* Mode Selector Tabs */}
        <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800 gap-1 mt-2">
          <button
            type="button"
            onClick={() => setActiveMode('google')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-all ${
              activeMode === 'google'
                ? 'bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-white border border-indigo-500/30 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            Google OAuth 2.0 (Gmail)
          </button>
          <button
            type="button"
            onClick={() => setActiveMode('smtp')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-all ${
              activeMode === 'smtp'
                ? 'bg-slate-800 text-white border border-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Server className="h-4 w-4 text-cyan-400" />
            Standard SMTP / IMAP
          </button>
        </div>

        {/* ── GOOGLE OAUTH SECTION ─────────────────────────────────── */}
        {activeMode === 'google' && (
          <div className="space-y-4 py-2">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                    <svg className="h-6 w-6" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">Gmail / Google Workspace</h4>
                    <p className="text-xs text-slate-400">
                      Dispatches direct from your authenticated Gmail address with automatic offline token refresh.
                    </p>
                  </div>
                </div>

                {isGoogleConnected ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Connected
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
                    Not Connected
                  </span>
                )}
              </div>

              {isGoogleConnected && (
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800/80 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Authenticated Account:</span>
                    <span className="text-white font-mono font-medium">{oauthStatus?.email_address}</span>
                  </div>
                  {oauthStatus?.display_name && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Sender Name:</span>
                      <span className="text-slate-200">{oauthStatus.display_name}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-400">Security Mode:</span>
                    <span className="text-cyan-400 flex items-center gap-1">
                      <ShieldCheck className="h-3.5 w-3.5" /> OAuth 2.0 (Refresh Token Active)
                    </span>
                  </div>
                </div>
              )}

              <div className="pt-2 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">
                  Permissions: <code className="text-slate-400">gmail.send</code>, <code className="text-slate-400">userinfo.email</code>
                </span>

                {isGoogleConnected ? (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleConnectGoogle}
                      disabled={oauthLoading}
                      className="border-slate-700 bg-slate-800 hover:bg-slate-700 text-white text-xs h-8"
                    >
                      {oauthLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
                      Reconnect
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={handleDisconnectGoogle}
                      disabled={oauthLoading}
                      className="text-xs h-8"
                    >
                      <LogOut className="h-3.5 w-3.5 mr-1.5" />
                      Disconnect
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={handleConnectGoogle}
                    disabled={oauthLoading}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs h-9 px-4 rounded-xl shadow-lg shadow-blue-500/20"
                  >
                    {oauthLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <ExternalLink className="h-4 w-4 mr-2" />
                    )}
                    Sign in with Google
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── STANDARD SMTP / IMAP SECTION ─────────────────────────── */}
        {activeMode === 'smtp' && (
          <form onSubmit={handleSaveSmtp} className="space-y-3.5 py-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs font-medium text-slate-300">Display Email Address</label>
                <Input
                  placeholder="support@yourdomain.com"
                  className="mt-1 bg-slate-950 border-slate-800 text-white text-xs"
                  value={config.email_address}
                  onChange={(e) => setConfig({ ...config, email_address: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300">SMTP Host</label>
                <Input
                  placeholder="smtp.gmail.com"
                  className="mt-1 bg-slate-950 border-slate-800 text-white text-xs"
                  value={config.smtp_host || ''}
                  onChange={(e) => setConfig({ ...config, smtp_host: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-300">SMTP Port</label>
                <Input
                  type="number"
                  placeholder="587"
                  className="mt-1 bg-slate-950 border-slate-800 text-white text-xs"
                  value={config.smtp_port || 587}
                  onChange={(e) => setConfig({ ...config, smtp_port: Number(e.target.value) })}
                  required
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300">SMTP Username</label>
                <Input
                  placeholder="user@gmail.com"
                  className="mt-1 bg-slate-950 border-slate-800 text-white text-xs"
                  value={config.smtp_user || ''}
                  onChange={(e) => setConfig({ ...config, smtp_user: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-300">SMTP Password / App Password</label>
                <Input
                  type="password"
                  placeholder="••••••••••••"
                  className="mt-1 bg-slate-950 border-slate-800 text-white text-xs"
                  value={config.smtp_password || ''}
                  onChange={(e) => setConfig({ ...config, smtp_password: e.target.value })}
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
                    className="mt-1 bg-slate-950 border-slate-800 text-white text-xs"
                    value={config.imap_host || ''}
                    onChange={(e) => setConfig({ ...config, imap_host: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-300">IMAP Port</label>
                  <Input
                    type="number"
                    placeholder="993"
                    className="mt-1 bg-slate-950 border-slate-800 text-white text-xs"
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
                <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="text-xs text-slate-400">
                  Cancel
                </Button>
                <Button type="submit" disabled={loading} className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs">
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Save Credentials
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
