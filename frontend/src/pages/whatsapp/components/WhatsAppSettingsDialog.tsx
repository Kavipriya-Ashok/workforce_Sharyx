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
import { whatsappService } from '@/service/whatsappService';
import { WhatsAppConfig } from '@/types/whatsapp';
import { KeyRound, Phone, ShieldCheck, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

export const WhatsAppSettingsDialog: React.FC<Props> = ({ open, onOpenChange, onSaved }) => {
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [config, setConfig] = useState<WhatsAppConfig>({
    provider: 'meta_cloud',
    phone_number: '',
    phone_number_id: '',
    waba_id: '',
    access_token: '',
    verify_token: 'sharyx_verify_token_secure',
  });

  useEffect(() => {
    if (open) {
      whatsappService.getConfig().then((data) => {
        if (data) {
          setConfig({
            provider: data.provider || 'meta_cloud',
            phone_number: data.phone_number || '',
            phone_number_id: data.phone_number_id || '',
            waba_id: data.waba_id || '',
            access_token: data.access_token || '',
            verify_token: data.verify_token || 'sharyx_verify_token_secure',
          });
        }
      });
    }
  }, [open]);

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await whatsappService.testConnection(config);
      setTestResult(res);
      toast.success(res.message || 'WhatsApp connection verified successfully!');
    } catch (err: any) {
      toast.error(err?.message || 'Connection test failed. Check Phone Number ID & Token.');
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await whatsappService.saveConfig(config);
      toast.success('Meta WhatsApp Cloud credentials saved successfully!');
      onSaved?.();
      onOpenChange(false);
    } catch {
      toast.error('Failed to save WhatsApp settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto bg-white border border-blue-150 shadow-2xl text-slate-900">
        <DialogHeader>
          <div className="flex items-center space-x-2 text-blue-600">
            <KeyRound className="h-5 w-5" />
            <DialogTitle className="text-slate-900">WhatsApp API Credentials & Provider</DialogTitle>
          </div>
          <DialogDescription className="text-xs text-slate-500">
            Configure your Meta Cloud API, QR Session, or Custom Gateway credentials.
          </DialogDescription>
        </DialogHeader>

        {/* Provider Toggle */}
        <div className="grid grid-cols-3 gap-2 mt-2">
          {[
            { id: 'meta_cloud', label: 'Meta Cloud API' },
            { id: 'qr_gateway', label: 'QR Web Pairing' },
            { id: 'custom_gateway', label: 'Custom Gateway' },
          ].map((prov) => (
            <button
              key={prov.id}
              type="button"
              onClick={() => setConfig({ ...config, provider: prov.id as any })}
              className={`p-2 rounded-xl border text-xs font-semibold text-center transition-all ${
                (config.provider || 'meta_cloud') === prov.id
                  ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-xs'
                  : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'
              }`}
            >
              {prov.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSave} className="space-y-4 mt-2">
          <div>
            <label className="text-xs font-semibold text-slate-700">Display Phone Number</label>
            <div className="relative mt-1">
              <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="+1 555 123 4567"
                className="pl-9 bg-slate-50 border-slate-200 focus:bg-white text-xs text-slate-900"
                value={config.phone_number || ''}
                onChange={(e) => setConfig({ ...config, phone_number: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700">Phone Number ID</label>
            <Input
              placeholder="e.g. 10482910394819"
              className="mt-1 bg-slate-50 border-slate-200 focus:bg-white text-xs text-slate-900"
              value={config.phone_number_id || ''}
              onChange={(e) => setConfig({ ...config, phone_number_id: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700">WhatsApp Business Account ID (WABA)</label>
            <Input
              placeholder="e.g. 98127391823719"
              className="mt-1 bg-slate-50 border-slate-200 focus:bg-white text-xs text-slate-900"
              value={config.waba_id || ''}
              onChange={(e) => setConfig({ ...config, waba_id: e.target.value })}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700">Permanent System User Access Token</label>
            <Input
              type="password"
              placeholder="EAAG..."
              className="mt-1 bg-slate-50 border-slate-200 focus:bg-white text-xs text-slate-900"
              value={config.access_token || ''}
              onChange={(e) => setConfig({ ...config, access_token: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700">Webhook Verification Token</label>
            <div className="relative mt-1">
              <ShieldCheck className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="sharyx_verify_token_secure"
                className="pl-9 bg-slate-50 border-slate-200 focus:bg-white text-xs text-slate-900"
                value={config.verify_token || ''}
                onChange={(e) => setConfig({ ...config, verify_token: e.target.value })}
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Set this exact token in Meta Developer Portal Webhook handshake.
            </p>
          </div>

          {testResult && (
            <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50 text-xs text-emerald-800 flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-emerald-900">
                  {testResult.verified_name || 'Verified WhatsApp Business Account'}
                </p>
                <p className="text-[11px] text-emerald-700 mt-0.5">
                  Display Phone: {testResult.display_phone_number || config.phone_number} • Quality: {testResult.quality_rating || 'GREEN'}
                </p>
              </div>
            </div>
          )}

          <div className="pt-2 flex items-center justify-between border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={testing || !config.phone_number_id || !config.access_token}
              onClick={handleTestConnection}
              className="gap-2 text-xs font-semibold text-slate-700 border-slate-200 hover:bg-slate-50"
            >
              {testing ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />
                  Testing...
                </>
              ) : (
                <>
                  <Phone className="h-3.5 w-3.5 text-blue-600" />
                  Test Connection
                </>
              )}
            </Button>

            <div className="flex space-x-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs gap-1.5 shadow-xs">
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
      </DialogContent>
    </Dialog>
  );
};
