import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { emailService } from '@/service/emailService';
import { EmailAIConfig } from '@/types/email';
import { Bot, Save, Sparkles, Sliders, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

export const EmailAISettingsView: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<EmailAIConfig>({
    auto_reply_enabled: true,
    tone: 'professional',
    system_prompt: '',
    llm_provider: 'openai',
    llm_model: 'gpt-4o-mini',
  });

  useEffect(() => {
    emailService.getAIConfig().then((data) => {
      if (data) setConfig(data);
    });
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      await emailService.saveAIConfig(config);
      toast.success('Email AI responder configuration saved!');
    } catch {
      toast.error('Failed to update email AI configuration');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Banner */}
      <div className="flex items-center justify-between p-6 rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-slate-50 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-600">
            <Bot className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              Autonomous Email Responder
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Drafts and replies to customer emails automatically using your corporate knowledge base.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-slate-700">
            {config.auto_reply_enabled ? 'Auto-Reply Active' : 'Auto-Reply Paused'}
          </span>
          <Switch
            checked={config.auto_reply_enabled}
            onCheckedChange={(val) => setConfig({ ...config, auto_reply_enabled: val })}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Model & Tone Card */}
        <Card className="bg-white border-slate-200 shadow-xs rounded-2xl">
          <CardHeader>
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Sliders className="h-4 w-4 text-blue-600" />
              Response Tone & Persona
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">Tailor the writing style of email replies</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-700">Tone of Voice</label>
              <div className="mt-1">
                <Select
                  value={config.tone}
                  onValueChange={(val: any) => setConfig({ ...config, tone: val })}
                >
                  <SelectTrigger className="bg-slate-50 border-slate-200 text-xs text-slate-900 focus:bg-white rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200">
                    <SelectItem value="professional">Professional & Polished</SelectItem>
                    <SelectItem value="friendly">Friendly & Approachable</SelectItem>
                    <SelectItem value="persuasive">Sales & Persuasive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700">LLM Provider</label>
                <Input
                  className="mt-1 bg-slate-50 border-slate-200 text-xs text-slate-900 focus:bg-white rounded-xl"
                  value={config.llm_provider || 'openai'}
                  onChange={(e) => setConfig({ ...config, llm_provider: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700">Model</label>
                <Input
                  className="mt-1 bg-slate-50 border-slate-200 text-xs text-slate-900 focus:bg-white rounded-xl"
                  value={config.llm_model || 'gpt-4o-mini'}
                  onChange={(e) => setConfig({ ...config, llm_model: e.target.value })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Master Prompt */}
        <Card className="bg-white border-slate-200 shadow-xs rounded-2xl">
          <CardHeader>
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-600" />
              System Context & Guidelines
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">Provide business context and FAQs</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-700">System Instruction Prompt</label>
              <Textarea
                rows={5}
                className="mt-1 font-mono text-xs bg-slate-50 border-slate-200 text-slate-900 focus:bg-white rounded-xl"
                placeholder="You are an executive email assistant for Sharyx. Answer questions about our CRM and workforce management solutions..."
                value={config.system_prompt || ''}
                onChange={(e) => setConfig({ ...config, system_prompt: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={loading}
          className="px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-sm"
        >
          <Save className="mr-2 h-4 w-4" />
          {loading ? 'Saving Settings...' : 'Save AI Settings'}
        </Button>
      </div>
    </div>
  );
};
