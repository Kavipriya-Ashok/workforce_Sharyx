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
      <div className="flex items-center justify-between p-6 rounded-2xl glass border border-slate-800 bg-gradient-to-r from-indigo-950/20 via-purple-950/20 to-slate-900/50">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <Bot className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              Autonomous Email Responder
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            </h2>
            <p className="text-xs text-slate-400">
              Drafts and replies to customer emails automatically using your corporate knowledge base.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-slate-300">
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
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Sliders className="h-4 w-4 text-indigo-400" />
              Response Tone & Persona
            </CardTitle>
            <CardDescription>Tailor the writing style of email replies</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-300">Tone of Voice</label>
              <div className="mt-1">
                <Select
                  value={config.tone}
                  onValueChange={(val: any) => setConfig({ ...config, tone: val })}
                >
                  <SelectTrigger>
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
                <label className="text-xs font-medium text-slate-300">LLM Provider</label>
                <Input
                  className="mt-1"
                  value={config.llm_provider || 'openai'}
                  onChange={(e) => setConfig({ ...config, llm_provider: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-300">Model</label>
                <Input
                  className="mt-1"
                  value={config.llm_model || 'gpt-4o-mini'}
                  onChange={(e) => setConfig({ ...config, llm_model: e.target.value })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Master Prompt */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-400" />
              System Context & Guidelines
            </CardTitle>
            <CardDescription>Provide business context and FAQs</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-300">System Instruction Prompt</label>
              <Textarea
                rows={5}
                className="mt-1 font-mono text-xs"
                placeholder="You are an executive email assistant for Sharyx. Answer questions about our CRM and workforce management solutions..."
                value={config.system_prompt || ''}
                onChange={(e) => setConfig({ ...config, system_prompt: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} variant="emerald" disabled={loading} className="px-6">
          <Save className="mr-2 h-4 w-4" />
          {loading ? 'Saving Settings...' : 'Save AI Settings'}
        </Button>
      </div>
    </div>
  );
};
