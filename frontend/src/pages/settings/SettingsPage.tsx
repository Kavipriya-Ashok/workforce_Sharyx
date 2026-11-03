import React, { useState, useEffect } from 'react';
import {
  KeyRound,
  PhoneCall,
  MessageSquare,
  Bot,
  Mail,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Copy,
  ExternalLink,
  Save,
  RefreshCw,
  Sparkles,
  Zap,
  ArrowLeft,
  Loader2,
  LogOut,
  Server,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { VoiceService, MaskedVoiceConfig, VoiceProviderType } from '@/service/voiceService';
import { whatsappService } from '@/service/whatsappService';
import { WhatsAppConfig } from '@/types/whatsapp';
import { emailService } from '@/service/emailService';
import { EmailAccountConfig, OAuthStatus } from '@/types/email';

interface SettingsPageProps {
  initialTab?: 'voice' | 'whatsapp' | 'ai' | 'email';
  onBack?: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ initialTab = 'voice', onBack }) => {
  const [activeTab, setActiveTab] = useState<'voice' | 'whatsapp' | 'ai' | 'email'>(initialTab);

  // ─── Voice States ──────────────────────────────────────────────────────────
  const [voiceConfigs, setVoiceConfigs] = useState<Record<string, MaskedVoiceConfig>>({});
  const [vapiApiKey, setVapiApiKey] = useState('');
  const [vapiPhoneId, setVapiPhoneId] = useState('');
  const [vapiCallerId, setVapiCallerId] = useState('');
  const [showVapiKey, setShowVapiKey] = useState(false);
  const [savingVoice, setSavingVoice] = useState(false);
  const [testingVoice, setTestingVoice] = useState(false);
  const [voiceTestResult, setVoiceTestResult] = useState<any>(null);

  const [saasApiKey, setSaasApiKey] = useState('');
  const [saasCallerId, setSaasCallerId] = useState('+918035454141');
  const [saasBaseUrl, setSaasBaseUrl] = useState('https://fallback-voice.sharyx.ai');

  // ─── WhatsApp States ───────────────────────────────────────────────────────
  const [waConfig, setWaConfig] = useState<WhatsAppConfig>({
    provider: 'meta_cloud',
    phone_number: '',
    phone_number_id: '',
    waba_id: '',
    access_token: '',
    verify_token: 'sharyx_verify_token_secure',
  });
  const [showWaToken, setShowWaToken] = useState(false);
  const [savingWa, setSavingWa] = useState(false);
  const [testingWa, setTestingWa] = useState(false);
  const [waTestResult, setWaTestResult] = useState<any>(null);

  // ─── AI LLM Brain States ───────────────────────────────────────────────────
  const [llmProvider, setLlmProvider] = useState<'gemini' | 'openai'>('gemini');
  const [geminiKey, setGeminiKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);
  const [savingAi, setSavingAi] = useState(false);

  // ─── Email & Google OAuth States ───────────────────────────────────────────
  const [oauthStatus, setOauthStatus] = useState<OAuthStatus | null>(null);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [emailConfig, setEmailConfig] = useState<EmailAccountConfig | null>(null);
  const [smtpForm, setSmtpForm] = useState({
    smtp_host: 'smtp.gmail.com',
    smtp_port: 587,
    smtp_user: '',
    smtp_password: '',
    imap_host: 'imap.gmail.com',
    imap_port: 993,
    use_ssl: true,
  });
  const [showSmtpPass, setShowSmtpPass] = useState(false);
  const [savingSmtp, setSavingSmtp] = useState(false);

  // ─── Fetch All Configs ─────────────────────────────────────────────────────
  const loadConfigs = async () => {
    try {
      // 1. Voice Configs
      const voiceData = await VoiceService.getConfigs();
      if (voiceData) {
        setVoiceConfigs(voiceData);
        if (voiceData.vapi) {
          setVapiPhoneId(voiceData.vapi.phone_number_id || '');
          setVapiCallerId(voiceData.vapi.caller_id || '');
        }
        if (voiceData.saas_fallback) {
          setSaasCallerId(voiceData.saas_fallback.caller_id || '+918035454141');
          setSaasBaseUrl(voiceData.saas_fallback.base_url || 'https://fallback-voice.sharyx.ai');
        }
      }

      // 2. WhatsApp Config
      const waData = await whatsappService.getConfig();
      if (waData) {
        setWaConfig({
          provider: waData.provider || 'meta_cloud',
          phone_number: waData.phone_number || '',
          phone_number_id: waData.phone_number_id || '',
          waba_id: waData.waba_id || '',
          access_token: waData.access_token || '',
          verify_token: waData.verify_token || 'sharyx_verify_token_secure',
        });
      }

      // 3. AI Brain Config
      const aiData = await whatsappService.getAIConfig();
      if (aiData) {
        setLlmProvider((aiData.llm_provider as any) || 'gemini');
        if (aiData.llm_provider === 'gemini' && aiData.api_key) setGeminiKey(aiData.api_key);
        if (aiData.llm_provider === 'openai' && aiData.api_key) setOpenaiKey(aiData.api_key);
      }

      // 4. Email & OAuth Config
      try {
        const [oStatus, eCfg] = await Promise.all([
          emailService.getOAuthStatus(),
          emailService.getConfig(),
        ]);
        setOauthStatus(oStatus);
        setEmailConfig(eCfg);
        if (eCfg) {
          setSmtpForm({
            smtp_host: eCfg.smtp_host || 'smtp.gmail.com',
            smtp_port: eCfg.smtp_port || 587,
            smtp_user: eCfg.smtp_user || '',
            smtp_password: eCfg.smtp_password || '',
            imap_host: eCfg.imap_host || 'imap.gmail.com',
            imap_port: eCfg.imap_port || 993,
            use_ssl: eCfg.use_ssl ?? true,
          });
        }
      } catch (e: any) {
        console.warn('Could not load email OAuth status:', e.message);
      }
    } catch (err: any) {
      console.warn('Could not load some settings:', err.message);
    }
  };

  useEffect(() => {
    loadConfigs();
  }, []);

  const handleConnectGoogle = async () => {
    try {
      setOauthLoading(true);
      const redirectUri = `${window.location.origin}/oauth/callback`;
      const authUrl = await emailService.getGoogleAuthUrl(redirectUri);
      if (authUrl) {
        window.location.href = authUrl;
      } else {
        toast.error('Could not generate Google authorization URL.');
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
      const status = await emailService.getOAuthStatus();
      setOauthStatus(status);
    } catch (err: any) {
      toast.error(err.message || 'Failed to disconnect.');
    } finally {
      setOauthLoading(false);
    }
  };

  const handleSaveSmtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSmtp(true);
    try {
      await emailService.saveConfig({
        provider: 'smtp',
        email_address: smtpForm.smtp_user,
        smtp_host: smtpForm.smtp_host,
        smtp_port: Number(smtpForm.smtp_port),
        smtp_user: smtpForm.smtp_user,
        smtp_password: smtpForm.smtp_password,
        imap_host: smtpForm.imap_host,
        imap_port: Number(smtpForm.imap_port),
        use_ssl: smtpForm.use_ssl,
        is_active: true,
      });
      toast.success('SMTP configuration saved successfully.');
      const status = await emailService.getOAuthStatus();
      setOauthStatus(status);
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Failed to save SMTP config.');
    } finally {
      setSavingSmtp(false);
    }
  };

  // ─── Save Vapi Configuration ───────────────────────────────────────────────
  const handleSaveVapi = async () => {
    setSavingVoice(true);
    try {
      await VoiceService.saveConfig({
        provider: 'vapi',
        api_key: vapiApiKey.trim() || undefined,
        phone_number_id: vapiPhoneId.trim() || undefined,
        caller_id: vapiCallerId.trim() || undefined,
        is_active: true,
      });
      await VoiceService.activateProvider('vapi');
      toast.success('✅ Vapi API Key & configuration saved! Set as active voice platform.');
      setVapiApiKey('');
      await loadConfigs();
    } catch (err: any) {
      toast.error(`Failed to save Vapi config: ${err.message}`);
    } finally {
      setSavingVoice(false);
    }
  };

  // ─── Save SaaS Configuration ───────────────────────────────────────────────
  const handleSaveSaas = async () => {
    setSavingVoice(true);
    try {
      await VoiceService.saveConfig({
        provider: 'saas_fallback',
        api_key: saasApiKey.trim() || undefined,
        caller_id: saasCallerId.trim() || undefined,
        base_url: saasBaseUrl.trim() || undefined,
        is_active: true,
      });
      await VoiceService.activateProvider('saas_fallback');
      toast.success('✅ Sharyx SaaS Telephony configuration saved & activated!');
      setSaasApiKey('');
      await loadConfigs();
    } catch (err: any) {
      toast.error(`Failed to save SaaS config: ${err.message}`);
    } finally {
      setSavingVoice(false);
    }
  };

  // ─── Test Vapi Connection ──────────────────────────────────────────────────
  const handleTestVapi = async () => {
    setTestingVoice(true);
    setVoiceTestResult(null);
    try {
      const res = await VoiceService.testConnection('vapi', vapiApiKey.trim() || undefined);
      setVoiceTestResult(res);
      if (res.ok) {
        toast.success(`Connected to Vapi Cloud! Latency: ${res.latencyMs || 0}ms`);
      } else {
        toast.error(`Vapi test failed: ${res.message}`);
      }
    } catch (err: any) {
      toast.error(`Vapi connection test failed: ${err.message}`);
    } finally {
      setTestingVoice(false);
    }
  };

  // ─── Save WhatsApp Configuration ───────────────────────────────────────────
  const handleSaveWhatsApp = async () => {
    setSavingWa(true);
    try {
      await whatsappService.saveConfig(waConfig);
      toast.success('✅ WhatsApp Meta Cloud API configuration saved successfully!');
      await loadConfigs();
    } catch (err: any) {
      toast.error(`Failed to save WhatsApp config: ${err.message}`);
    } finally {
      setSavingWa(false);
    }
  };

  // ─── Test WhatsApp Connection ──────────────────────────────────────────────
  const handleTestWhatsApp = async () => {
    setTestingWa(true);
    setWaTestResult(null);
    try {
      const res = await whatsappService.testConnection(waConfig);
      setWaTestResult(res);
      if (res.ok) {
        toast.success(res.message || 'WhatsApp Meta credentials verified successfully!');
      } else {
        toast.error(res.message || 'WhatsApp connection test failed');
      }
    } catch (err: any) {
      toast.error(err.message || 'Connection test failed');
    } finally {
      setTestingWa(false);
    }
  };

  // ─── Save AI LLM Keys ──────────────────────────────────────────────────────
  const handleSaveAi = async () => {
    setSavingAi(true);
    try {
      const selectedKey = llmProvider === 'gemini' ? geminiKey : openaiKey;
      await whatsappService.saveAIConfig({
        is_ai_enabled: true,
        ai_mode: 'hybrid',
        llm_provider: llmProvider,
        llm_model: llmProvider === 'gemini' ? 'gemini-2.5-flash' : 'gpt-4o-mini',
        api_key: selectedKey.trim() || undefined,
      });
      toast.success(`✅ ${llmProvider.toUpperCase()} AI Brain key saved successfully!`);
      await loadConfigs();
    } catch (err: any) {
      toast.error(`Failed to save AI config: ${err.message}`);
    } finally {
      setSavingAi(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {onBack && (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onBack}
            className="rounded-xl border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold text-xs"
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Dashboard
          </Button>
        </div>
      )}
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1 rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300">
              <KeyRound className="h-3.5 w-3.5" />
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              {activeTab === 'email' ? 'Email & Mailbox Configuration' : 'Integrations & Credentials'}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {activeTab === 'email' ? 'Email Mailbox & OAuth Settings' : 'API Keys & Connected Platforms'}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {activeTab === 'email'
              ? 'Configure Google OAuth 2.0 dispatch, SMTP/IMAP credentials, and mailbox synchronization.'
              : 'Configure your Vapi Voice AI credentials, Meta WhatsApp Cloud API tokens, and AI LLM keys.'}
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={loadConfigs}
          className="h-8 text-xs border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 gap-1.5 self-start sm:self-center rounded-xl"
        >
          <RefreshCw className="h-3.5 w-3.5 text-slate-500" /> Reload Configs
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-300 pb-2">
        <button
          onClick={() => setActiveTab('voice')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'voice'
              ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <PhoneCall className="h-3.5 w-3.5" />
          <span>Voice Telephony (Vapi / SaaS)</span>
          {voiceConfigs.vapi?.is_active && (
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('whatsapp')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'whatsapp'
              ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <MessageSquare className="h-3.5 w-3.5" />
          <span>WhatsApp (Meta Cloud API)</span>
          {waConfig.access_token && (
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('ai')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'ai'
              ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Bot className="h-3.5 w-3.5" />
          <span>AI Copilot LLM (Gemini / OpenAI)</span>
        </button>

        <button
          onClick={() => setActiveTab('email')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'email'
              ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Mail className="h-3.5 w-3.5" />
          <span>Email & OAuth</span>
        </button>
      </div>

      {/* ─── TAB 1: VOICE TELEPHONY (VAPI / SAAS) ────────────────────────────── */}
      {activeTab === 'voice' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* VAPI CONFIG CARD */}
          <div className="bg-white rounded-2xl border border-slate-300 p-6 shadow-[0_1px_3px_0_rgba(15,23,42,0.06),0_1px_2px_-1px_rgba(15,23,42,0.04)] space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-violet-50 text-violet-700 flex items-center justify-center font-bold text-sm">
                  V
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                    Vapi.ai Voice Platform
                    {voiceConfigs.vapi?.is_active && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        ACTIVE ENGINE
                      </span>
                    )}
                  </h3>
                  <p className="text-[11px] text-slate-500">Autonomous voice calls via api.vapi.ai</p>
                </div>
              </div>
              <a
                href="https://dashboard.vapi.ai"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-blue-600 hover:text-blue-800 flex items-center gap-1 font-semibold"
              >
                Vapi Console <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="text-slate-700 font-bold block mb-1 flex items-center justify-between">
                  <span>Vapi Private API Key *</span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    {voiceConfigs.vapi?.has_key ? '✅ Key is currently configured' : '⚠️ No key set'}
                  </span>
                </label>
                <div className="relative">
                  <Input
                    type={showVapiKey ? 'text' : 'password'}
                    value={vapiApiKey}
                    onChange={(e) => setVapiApiKey(e.target.value)}
                    placeholder={
                      voiceConfigs.vapi?.has_key
                        ? '•••••••••••••••••••••••• (Leave blank to keep current)'
                        : 'Enter your Vapi API Key (e.g. 01a1...)'
                    }
                    className="font-mono text-xs pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowVapiKey(!showVapiKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showVapiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">
                  Vapi Phone Number ID (Optional)
                </label>
                <Input
                  value={vapiPhoneId}
                  onChange={(e) => setVapiPhoneId(e.target.value)}
                  placeholder="e.g. 01a180... (UUID from Vapi Phone Numbers)"
                  className="font-mono text-xs"
                />
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">
                  Caller ID / Outbound Display Number
                </label>
                <Input
                  value={vapiCallerId}
                  onChange={(e) => setVapiCallerId(e.target.value)}
                  placeholder="e.g. +14155552671"
                  className="font-mono text-xs"
                />
              </div>

              {voiceTestResult && (
                <div
                  className={`p-3 rounded-xl border text-xs ${
                    voiceTestResult.ok
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border-rose-200'
                  }`}
                >
                  <p className="font-bold">{voiceTestResult.ok ? '✅ Connection Successful' : '❌ Test Failed'}</p>
                  <p className="text-[11px] mt-0.5">{voiceTestResult.message}</p>
                  {voiceTestResult.latencyMs && (
                    <p className="text-[10px] text-slate-500 mt-1 font-mono">Latency: {voiceTestResult.latencyMs}ms</p>
                  )}
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <Button
                  onClick={handleSaveVapi}
                  disabled={savingVoice}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-9 gap-1.5 flex-1"
                >
                  <Save className="h-3.5 w-3.5" />
                  {savingVoice ? 'Saving...' : 'Save & Set Active'}
                </Button>

                <Button
                  variant="outline"
                  onClick={handleTestVapi}
                  disabled={testingVoice}
                  className="text-xs h-9 border-slate-300 hover:bg-slate-50 gap-1.5"
                >
                  <Zap className="h-3.5 w-3.5 text-amber-500" />
                  {testingVoice ? 'Testing...' : 'Test Connection'}
                </Button>
              </div>
            </div>
          </div>

          {/* SHARYX SAAS TELEPHONY CARD */}
          <div className="bg-white rounded-2xl border border-slate-300 p-6 shadow-[0_1px_3px_0_rgba(15,23,42,0.06),0_1px_2px_-1px_rgba(15,23,42,0.04)] space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-cyan-50 text-cyan-700 flex items-center justify-center font-bold text-sm">
                  S
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                    Sharyx SaaS Voice Telephony
                    {voiceConfigs.saas_fallback?.is_active && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        ACTIVE ENGINE
                      </span>
                    )}
                  </h3>
                  <p className="text-[11px] text-slate-500">Built-in India caller route (+918035454141)</p>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-50 text-cyan-700 border border-cyan-200 font-mono">
                PSTN Route
              </span>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="text-slate-700 font-bold block mb-1">
                  SaaS Telephony API Key
                </label>
                <Input
                  type="password"
                  value={saasApiKey}
                  onChange={(e) => setSaasApiKey(e.target.value)}
                  placeholder="•••••••••••••••••••••••• (Leave blank to keep active key)"
                  className="font-mono text-xs"
                />
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">
                  Caller ID Number
                </label>
                <Input
                  value={saasCallerId}
                  onChange={(e) => setSaasCallerId(e.target.value)}
                  placeholder="+918035454141"
                  className="font-mono text-xs"
                />
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">
                  Voice Backend Gateway URL
                </label>
                <Input
                  value={saasBaseUrl}
                  onChange={(e) => setSaasBaseUrl(e.target.value)}
                  placeholder="https://fallback-voice.sharyx.ai"
                  className="font-mono text-xs"
                />
              </div>

              <div className="pt-2">
                <Button
                  onClick={handleSaveSaas}
                  disabled={savingVoice}
                  className="w-full bg-cyan-700 hover:bg-cyan-800 text-white font-bold text-xs h-9 gap-1.5"
                >
                  <Save className="h-3.5 w-3.5" />
                  {savingVoice ? 'Saving...' : 'Save & Activate SaaS Route'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 2: WHATSAPP (META CLOUD API) ─────────────────────────────────── */}
      {activeTab === 'whatsapp' && (
        <div className="max-w-3xl bg-white rounded-2xl border border-slate-300 p-6 shadow-[0_1px_3px_0_rgba(15,23,42,0.06),0_1px_2px_-1px_rgba(15,23,42,0.04)] space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-sm">
                WA
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-slate-900">
                  Meta WhatsApp Cloud API Configuration
                </h3>
                <p className="text-[11px] text-slate-500">
                  Official WhatsApp Business Cloud API integration via Meta for Developers
                </p>
              </div>
            </div>
            <a
              href="https://developers.facebook.com/apps"
              target="_blank"
              rel="noreferrer"
              className="text-[11px] text-blue-600 hover:text-blue-800 flex items-center gap-1 font-semibold"
            >
              Meta Developer Portal <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-slate-700 font-bold block mb-1">
                  Phone Number ID *
                </label>
                <Input
                  value={waConfig.phone_number_id}
                  onChange={(e) => setWaConfig({ ...waConfig, phone_number_id: e.target.value })}
                  placeholder="e.g. 104273891823741"
                  className="font-mono text-xs"
                />
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">
                  WhatsApp Business Account ID (WABA ID)
                </label>
                <Input
                  value={waConfig.waba_id}
                  onChange={(e) => setWaConfig({ ...waConfig, waba_id: e.target.value })}
                  placeholder="e.g. 102938475610293"
                  className="font-mono text-xs"
                />
              </div>
            </div>

            <div>
              <label className="text-slate-700 font-bold block mb-1">
                Display Phone Number
              </label>
              <Input
                value={waConfig.phone_number}
                onChange={(e) => setWaConfig({ ...waConfig, phone_number: e.target.value })}
                placeholder="e.g. +91 98765 43210"
                className="font-mono text-xs"
              />
            </div>

            <div>
              <label className="text-slate-700 font-bold block mb-1">
                Permanent System User Access Token *
              </label>
              <div className="relative">
                <Input
                  type={showWaToken ? 'text' : 'password'}
                  value={waConfig.access_token}
                  onChange={(e) => setWaConfig({ ...waConfig, access_token: e.target.value })}
                  placeholder="EAA..."
                  className="font-mono text-xs pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowWaToken(!showWaToken)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showWaToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Webhook Callback Info */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-300 space-y-2">
              <span className="text-slate-700 font-bold block text-[11px] uppercase tracking-wider">
                Meta Webhook Settings (Copy to Meta App)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-semibold block">Callback URL</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <code className="font-mono bg-white px-2 py-1 rounded border text-[11px] text-slate-800 flex-1 truncate">
                      https://your-domain/api/v1/WhatsApp/Webhook
                    </code>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        copyToClipboard(
                          `${window.location.origin}/api/v1/WhatsApp/Webhook`,
                          'Webhook URL'
                        )
                      }
                      className="h-7 w-7 p-0"
                    >
                      <Copy className="h-3.5 w-3.5 text-slate-500" />
                    </Button>
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-semibold block">Verify Token</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <code className="font-mono bg-white px-2 py-1 rounded border text-[11px] text-slate-800 flex-1">
                      {waConfig.verify_token || 'sharyx_verify_token_secure'}
                    </code>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        copyToClipboard(waConfig.verify_token || 'sharyx_verify_token_secure', 'Verify Token')
                      }
                      className="h-7 w-7 p-0"
                    >
                      <Copy className="h-3.5 w-3.5 text-slate-500" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {waTestResult && (
              <div
                className={`p-3 rounded-xl border text-xs ${
                  waTestResult.ok
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border-rose-200'
                }`}
              >
                <p className="font-bold">{waTestResult.ok ? '✅ Meta Cloud API Verified' : '❌ Verification Failed'}</p>
                <p className="text-[11px] mt-0.5">{waTestResult.message}</p>
              </div>
            )}

            <div className="flex items-center gap-2 pt-2">
              <Button
                onClick={handleSaveWhatsApp}
                disabled={savingWa}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 gap-1.5 flex-1"
              >
                <Save className="h-3.5 w-3.5" />
                {savingWa ? 'Saving...' : 'Save Meta WhatsApp Credentials'}
              </Button>

              <Button
                variant="outline"
                onClick={handleTestWhatsApp}
                disabled={testingWa}
                className="text-xs h-9 border-slate-300 hover:bg-slate-50 gap-1.5"
              >
                <Zap className="h-3.5 w-3.5 text-emerald-600" />
                {testingWa ? 'Verifying...' : 'Test Connection'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 3: AI COPILOT LLM (GEMINI / OPENAI) ─────────────────────────── */}
      {activeTab === 'ai' && (
        <div className="max-w-2xl bg-white rounded-2xl border border-slate-300 p-6 shadow-[0_1px_3px_0_rgba(15,23,42,0.06),0_1px_2px_-1px_rgba(15,23,42,0.04)] space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="h-10 w-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold text-sm">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900">
                AI Copilot LLM Engine Keys
              </h3>
              <p className="text-[11px] text-slate-500">
                Powers real-time reasoning for WhatsApp, Email auto-replies, and Multi-Agent handoffs.
              </p>
            </div>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="text-slate-700 font-bold block mb-1">Primary LLM Provider</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setLlmProvider('gemini')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    llmProvider === 'gemini'
                      ? 'border-blue-500 bg-blue-50/60 ring-2 ring-blue-500/20'
                      : 'border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <p className="font-bold text-slate-900">Google Gemini (Recommended)</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Model: gemini-2.5-flash (&lt;250ms)</p>
                </button>

                <button
                  type="button"
                  onClick={() => setLlmProvider('openai')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    llmProvider === 'openai'
                      ? 'border-blue-500 bg-blue-50/60 ring-2 ring-blue-500/20'
                      : 'border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <p className="font-bold text-slate-900">OpenAI</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Model: gpt-4o-mini</p>
                </button>
              </div>
            </div>

            {llmProvider === 'gemini' ? (
              <div>
                <label className="text-slate-700 font-bold block mb-1">
                  Google Gemini API Key *
                </label>
                <div className="relative">
                  <Input
                    type={showGeminiKey ? 'text' : 'password'}
                    value={geminiKey}
                    onChange={(e) => setGeminiKey(e.target.value)}
                    placeholder="AQ.Ab... or AIzaSy..."
                    className="font-mono text-xs pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowGeminiKey(!showGeminiKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showGeminiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <label className="text-slate-700 font-bold block mb-1">
                  OpenAI API Key *
                </label>
                <div className="relative">
                  <Input
                    type={showOpenaiKey ? 'text' : 'password'}
                    value={openaiKey}
                    onChange={(e) => setOpenaiKey(e.target.value)}
                    placeholder="sk-proj-..."
                    className="font-mono text-xs pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOpenaiKey(!showOpenaiKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showOpenaiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}

            <Button
              onClick={handleSaveAi}
              disabled={savingAi}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs h-9 gap-1.5 mt-2"
            >
              <Save className="h-3.5 w-3.5" />
              {savingAi ? 'Saving...' : 'Save AI LLM Configuration'}
            </Button>
          </div>
        </div>
      )}

      {/* ─── TAB 4: EMAIL & OAUTH ────────────────────────────────────────────── */}
      {activeTab === 'email' && (
        <div className="max-w-2xl space-y-6">
          {/* Main Google OAuth 2.0 Card */}
          <div className="bg-white rounded-2xl border border-slate-300 p-6 shadow-[0_1px_3px_0_rgba(15,23,42,0.06),0_1px_2px_-1px_rgba(15,23,42,0.04)] space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-sm">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">
                    Google OAuth 2.0 (Gmail API)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Connect your Google Workspace or Gmail account for automated outbound follow-ups.
                  </p>
                </div>
              </div>

              {oauthStatus?.isConnected && oauthStatus?.provider === 'google-email' ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  Connected
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-300">
                  Not Connected
                </span>
              )}
            </div>

            {/* Google OAuth Details / Actions */}
            {oauthStatus?.isConnected && oauthStatus?.provider === 'google-email' ? (
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-300 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Authenticated Google Account:</span>
                    <span className="font-bold text-slate-900 font-mono text-sm">{oauthStatus.email_address}</span>
                  </div>
                  {oauthStatus.display_name && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Sender Name:</span>
                      <span className="font-medium text-slate-800">{oauthStatus.display_name}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Security Mode:</span>
                    <span className="text-emerald-700 font-medium flex items-center gap-1">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> OAuth 2.0 (Live Refresh Token)
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <Button
                    onClick={handleConnectGoogle}
                    disabled={oauthLoading}
                    variant="outline"
                    className="flex-1 gap-2 text-xs font-semibold h-10 border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl"
                  >
                    {oauthLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4 text-blue-600" />
                    )}
                    Reconnect Account
                  </Button>
                  <Button
                    onClick={handleDisconnectGoogle}
                    disabled={oauthLoading}
                    variant="outline"
                    className="gap-2 text-xs font-semibold h-10 border-rose-200 hover:bg-rose-50 text-rose-600 rounded-xl"
                  >
                    <LogOut className="h-4 w-4" />
                    Disconnect
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 pt-1">
                <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 text-xs text-indigo-900">
                  <p className="font-bold flex items-center gap-1.5 text-indigo-950">
                    <Sparkles className="h-4 w-4 text-indigo-600" /> Seamless One-Click Authorization
                  </p>
                  <p className="text-[11px] text-indigo-800/80 mt-1">
                    Connecting your Google account grants secure dispatch access without sharing your Gmail password.
                  </p>
                </div>

                <Button
                  onClick={handleConnectGoogle}
                  disabled={oauthLoading}
                  className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/20 flex items-center justify-center gap-2.5 transition-all"
                >
                  {oauthLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <svg className="h-4 w-4" viewBox="0 0 24 24">
                      <path
                        fill="#FFFFFF"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#FFFFFF"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FFFFFF"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#FFFFFF"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                  )}
                  <span>Sign in with Google to Connect Gmail</span>
                </Button>
              </div>
            )}

            {/* Google OAuth Technical Specs */}
            <div className="pt-3 border-t border-slate-100 space-y-3 text-xs">
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-semibold block">Authorized Redirect URI</span>
                <div className="flex items-center gap-1.5 mt-1">
                  <code className="font-mono bg-slate-50 px-2 py-1.5 rounded border text-[11px] text-slate-800 flex-1 truncate">
                    {window.location.origin}/oauth/callback
                  </code>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      copyToClipboard(`${window.location.origin}/oauth/callback`, 'OAuth Redirect URI')
                    }
                    className="h-8 w-8 p-0"
                  >
                    <Copy className="h-3.5 w-3.5 text-slate-500" />
                  </Button>
                </div>
              </div>

              <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200 text-blue-900 text-xs">
                <p className="font-bold flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-blue-600" /> Google Cloud Console Setup
                </p>
                <p className="text-[11px] text-blue-800/80 mt-1">
                  Ensure <code>{window.location.origin}/oauth/callback</code> is added under <strong>Authorized redirect URIs</strong> in your Google Cloud Console OAuth 2.0 Client credentials.
                </p>
              </div>
            </div>
          </div>

          {/* Manual SMTP / IMAP Fallback Section */}
          <div className="bg-white rounded-2xl border border-slate-300 p-6 shadow-[0_1px_3px_0_rgba(15,23,42,0.06),0_1px_2px_-1px_rgba(15,23,42,0.04)] space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="h-9 w-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs">
                <Server className="h-4 w-4 text-cyan-600" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">Standard SMTP / IMAP (Optional)</h3>
                <p className="text-[11px] text-slate-500">
                  Custom email dispatch via SendGrid, Mailgun, Amazon SES, or custom SMTP server.
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveSmtp} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">SMTP Host</label>
                  <Input
                    value={smtpForm.smtp_host}
                    onChange={(e) => setSmtpForm({ ...smtpForm, smtp_host: e.target.value })}
                    placeholder="smtp.gmail.com"
                    className="h-9 text-xs"
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">SMTP Port</label>
                  <Input
                    type="number"
                    value={smtpForm.smtp_port}
                    onChange={(e) => setSmtpForm({ ...smtpForm, smtp_port: Number(e.target.value) })}
                    placeholder="587"
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">SMTP Username / Email</label>
                  <Input
                    value={smtpForm.smtp_user}
                    onChange={(e) => setSmtpForm({ ...smtpForm, smtp_user: e.target.value })}
                    placeholder="you@company.com"
                    className="h-9 text-xs"
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">SMTP Password / App Password</label>
                  <div className="relative">
                    <Input
                      type={showSmtpPass ? 'text' : 'password'}
                      value={smtpForm.smtp_password}
                      onChange={(e) => setSmtpForm({ ...smtpForm, smtp_password: e.target.value })}
                      placeholder="••••••••••••"
                      className="h-9 text-xs pr-9"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSmtpPass(!showSmtpPass)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showSmtpPass ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                disabled={savingSmtp}
                className="w-full bg-slate-900 hover:bg-black text-white font-semibold text-xs h-9 gap-1.5 rounded-xl mt-2"
              >
                <Save className="h-3.5 w-3.5" />
                {savingSmtp ? 'Saving SMTP...' : 'Save SMTP Configuration'}
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
