import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { emailService } from '@/service/emailService';
import { EmailAIConfig } from '@/types/email';
import { Bot, Save, Sparkles, Sliders, ShieldCheck, Cpu } from 'lucide-react';
import { toast } from 'sonner';

export const EmailAISettingsView: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<EmailAIConfig>({
    auto_reply_enabled: true,
    tone: 'professional',
    system_prompt: '',
    llm_provider: 'gemini',
    llm_model: 'gemini-2.5-flash',
    api_key: '',
  });

  useEffect(() => {
    emailService.getAIConfig().then((data) => {
      if (data) setConfig((prev) => ({ ...prev, ...data }));
    });
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      await emailService.saveAIConfig(config);
      toast.success('Email AI Brain settings updated successfully!');
    } catch {
      toast.error('Failed to update email AI configuration');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800/60 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
            <Bot className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              Autonomous Email Copilot & AI Brain
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Drafts and replies to customer emails automatically using your corporate knowledge base.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/60 px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
            {config.auto_reply_enabled ? 'Auto-Reply Active' : 'Auto-Reply Paused'}
          </span>
          <Switch
            checked={config.auto_reply_enabled}
            onCheckedChange={(val) => setConfig({ ...config, auto_reply_enabled: val })}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Model & Tone Card */}
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Cpu className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              Intelligence & Persona
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 dark:text-slate-400">Select LLM engine, API key and tone of voice</CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Tone of Voice</label>
              <div className="mt-1">
                <Select
                  value={config.tone}
                  onValueChange={(val: any) => setConfig({ ...config, tone: val })}
                >
                  <SelectTrigger className="bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional">Professional & Polished</SelectItem>
                    <SelectItem value="friendly">Friendly & Approachable</SelectItem>
                    <SelectItem value="persuasive">Sales & Persuasive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">LLM Provider</label>
                <div className="mt-1">
                  <Select
                    value={config.llm_provider || 'gemini'}
                    onValueChange={(val: string) => {
                      const defaultModel = val === 'gemini' ? 'gemini-2.5-flash' : 'gpt-4o-mini';
                      setConfig({ ...config, llm_provider: val, llm_model: defaultModel });
                    }}
                  >
                    <SelectTrigger className="bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gemini">Google Gemini</SelectItem>
                      <SelectItem value="openai">OpenAI (ChatGPT)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Model Name</label>
                <div className="mt-1">
                  <Select
                    value={config.llm_model || (config.llm_provider === 'gemini' ? 'gemini-2.5-flash' : 'gpt-4o-mini')}
                    onValueChange={(val: string) => setConfig({ ...config, llm_model: val })}
                  >
                    <SelectTrigger className="bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {config.llm_provider === 'gemini' ? (
                        <>
                          <SelectItem value="gemini-2.5-flash">gemini-2.5-flash (Fast & Recommended)</SelectItem>
                          <SelectItem value="gemini-3.8-flash">gemini-3.8-flash (Latest Antigravity)</SelectItem>
                          <SelectItem value="gemini-1.5-flash">gemini-1.5-flash (Stable Free Tier)</SelectItem>
                          <SelectItem value="gemini-1.5-pro">gemini-1.5-pro (High Reasoning)</SelectItem>
                        </>
                      ) : (
                        <>
                          <SelectItem value="gpt-4o-mini">gpt-4o-mini (Fast & Cost Efficient)</SelectItem>
                          <SelectItem value="gpt-4o">gpt-4o (Omni Reasoning)</SelectItem>
                          <SelectItem value="gpt-3.5-turbo">gpt-3.5-turbo (Legacy)</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {config.llm_provider === 'gemini' ? 'Google Gemini API Key' : 'OpenAI API Key'}
                </label>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">Saved in Database</span>
              </div>
              <Input
                type="password"
                placeholder={config.llm_provider === 'gemini' ? 'AIzaSy...' : 'sk-proj-...'}
                className="font-mono text-xs bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-800 focus:bg-white dark:focus:bg-slate-900 text-slate-900 dark:text-slate-100"
                value={config.api_key || ''}
                onChange={(e) => setConfig({ ...config, api_key: e.target.value })}
              />
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Your Email AI copilot uses this key to formulate real-time answers.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Master Prompt */}
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              Master System Context & Guidelines
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 dark:text-slate-400">Provide business context, role instructions, and FAQs</CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  System Instruction Prompt (Email AI Brain)
                </label>
                <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">
                  Directs how AI drafts replies
                </span>
              </div>
              <Textarea
                rows={9}
                className="font-mono text-xs bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 rounded-xl"
                placeholder="You are an executive email assistant for Sharyx. Answer questions about our CRM, recruitment openings, and workforce management solutions..."
                value={config.system_prompt || ''}
                onChange={(e) => setConfig({ ...config, system_prompt: e.target.value })}
              />
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Leave blank to use default corporate guidelines, or provide custom persona, screening steps, and answers.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end pt-1">
        <Button
          onClick={handleSave}
          disabled={loading}
          className="px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-xs"
        >
          <Save className="mr-2 h-4 w-4" />
          {loading ? 'Saving Settings...' : 'Save AI Brain Settings'}
        </Button>
      </div>
    </div>
  );
};
