import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { whatsappService } from '@/service/whatsappService';
import { WhatsAppAIConfig } from '@/types/whatsapp';
import { Bot, Save, Sparkles, Clock, ShieldAlert, Cpu } from 'lucide-react';
import { toast } from 'sonner';

export const WhatsAppAIBrainPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<WhatsAppAIConfig>({
    is_ai_enabled: true,
    ai_mode: 'hybrid',
    system_prompt: '',
    welcome_message: '',
    fallback_message: '',
    llm_provider: 'openai',
    llm_model: 'gpt-4o-mini',
    auto_followup_enabled: true,
    followup_delay_minutes: 60,
    followup_message: '',
    stop_words: ['STOP', 'UNSUBSCRIBE'],
  });

  useEffect(() => {
    whatsappService.getAIConfig().then((data) => {
      if (data) setConfig((prev) => ({ ...prev, ...data }));
    });
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      await whatsappService.saveAIConfig(config);
      toast.success('WhatsApp AI Copilot settings updated successfully!');
    } catch {
      toast.error('Failed to update AI settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Top Banner */}
      <div className="flex items-center justify-between p-6 rounded-2xl glass border border-slate-800 bg-gradient-to-r from-emerald-950/20 via-indigo-950/20 to-slate-900/50">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Bot className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              Autonomous WhatsApp Copilot
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            </h2>
            <p className="text-xs text-slate-400">
              Configure system instructions, intent detection, and automated follow-up sequences.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-slate-300">
            {config.is_ai_enabled ? 'AI Active' : 'AI Paused'}
          </span>
          <Switch
            checked={config.is_ai_enabled}
            onCheckedChange={(val) => setConfig({ ...config, is_ai_enabled: val })}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Model & System Prompt */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Cpu className="h-4 w-4 text-indigo-400" />
              Intelligence & Persona
            </CardTitle>
            <CardDescription>Select LLM engine and prompt behavior</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-300">AI Operating Mode</label>
              <div className="mt-1">
                <Select
                  value={config.ai_mode}
                  onValueChange={(val: any) => setConfig({ ...config, ai_mode: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fully_automated">Fully Autonomous (Instant Reply)</SelectItem>
                    <SelectItem value="hybrid">Hybrid (AI Suggestion & Human Takeover)</SelectItem>
                    <SelectItem value="manual">Manual Mode (Human Only)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-300">LLM Provider</label>
                <div className="mt-1">
                  <Select
                    value={config.llm_provider || 'openai'}
                    onValueChange={(val: string) => {
                      const defaultModel = val === 'gemini' ? 'gemini-1.5-flash' : 'gpt-4o-mini';
                      setConfig({ ...config, llm_provider: val, llm_model: defaultModel });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="openai">OpenAI (ChatGPT)</SelectItem>
                      <SelectItem value="gemini">Google Gemini</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-300">Model Name</label>
                <div className="mt-1">
                  <Select
                    value={config.llm_model || (config.llm_provider === 'gemini' ? 'gemini-1.5-flash' : 'gpt-4o-mini')}
                    onValueChange={(val: string) => setConfig({ ...config, llm_model: val })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {config.llm_provider === 'gemini' ? (
                        <>
                          <SelectItem value="gemini-1.5-flash">gemini-1.5-flash (Fast & Free Tier)</SelectItem>
                          <SelectItem value="gemini-1.5-pro">gemini-1.5-pro (High Reasoning)</SelectItem>
                          <SelectItem value="gemini-2.0-flash">gemini-2.0-flash (Next Gen)</SelectItem>
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
                <label className="text-xs font-medium text-slate-300">
                  {config.llm_provider === 'gemini' ? 'Google Gemini API Key' : 'OpenAI API Key'}
                </label>
                <span className="text-[10px] text-emerald-400 font-medium">Saved in Database</span>
              </div>
              <Input
                type="password"
                placeholder={config.llm_provider === 'gemini' ? 'AIzaSy...' : 'sk-proj-...'}
                className="font-mono text-xs"
                value={config.api_key || ''}
                onChange={(e) => setConfig({ ...config, api_key: e.target.value })}
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Paste your API key directly in this UI. Your WhatsApp AI will use it immediately to reply to customers.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-200">
                  Master System Prompt (AI Brain Instructions)
                </label>
                <span className="text-[10px] text-emerald-400 font-medium">
                  Directs how AI responds
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mb-2">
                The AI reads this prompt for every incoming WhatsApp message to know your business, tone, and answers.
              </p>

              {/* 1-Click Prompt Presets */}
              <div className="space-y-1.5 mb-2.5">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Quick Prompt Templates:
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 text-[11px] justify-start text-left truncate"
                    onClick={() => {
                      setConfig({
                        ...config,
                        system_prompt:
                          'You are the Senior Sales AI Copilot for our business. Your goal is to be polite, energetic, and qualify inbound leads on WhatsApp. Ask for their name, specific requirements, and budget. Always offer to schedule a 15-minute phone consultation or live demo. Format replies with short bullet points, friendly emojis, and keep replies under 60 words.',
                        welcome_message:
                          'Hello! 👋 Welcome to our official WhatsApp channel. I am your autonomous AI assistant. How can our team help grow your business today?',
                        fallback_message:
                          'I have alerted our senior account manager. A human team member will reach out to you directly on this chat within a few minutes!',
                      });
                      toast.success('Applied Sales & Lead Qualification template!');
                    }}
                  >
                    🎯 Sales & Lead Gen
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 text-[11px] justify-start text-left truncate"
                    onClick={() => {
                      setConfig({
                        ...config,
                        system_prompt:
                          'You are an E-Commerce Support Specialist on WhatsApp. Assist customers with order status tracking, shipping questions, product recommendations, and return policies. Be cheerful, helpful, and concise. If an order number is given, confirm it. If they ask about discounts, mention our current 15% welcome code: WELCOME15.',
                        welcome_message:
                          'Hi there! 🛍️ Thank you for messaging our store. Do you have an order question or are you looking for product recommendations?',
                        fallback_message:
                          'I am transferring your query to our dispatch support supervisor. Please hold on for just a moment!',
                      });
                      toast.success('Applied E-Commerce & Orders template!');
                    }}
                  >
                    🛍️ E-Commerce & Orders
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 text-[11px] justify-start text-left truncate"
                    onClick={() => {
                      setConfig({
                        ...config,
                        system_prompt:
                          'You are a Professional Clinic & Appointment Coordinator. Greet patients warmly, ask for their preferred day and time (morning or afternoon), and the service they need. Confirm their contact number. Maintain a caring, respectful, and reassuring tone. Never give medical diagnoses.',
                        welcome_message:
                          'Hello! 🏥 Thank you for contacting our clinic. Would you like to schedule an appointment or inquire about our doctor timings?',
                        fallback_message:
                          'Our receptionist is notified and will confirm your appointment slot shortly on this number.',
                      });
                      toast.success('Applied Appointment & Booking template!');
                    }}
                  >
                    📅 Clinic & Booking
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 text-[11px] justify-start text-left truncate"
                    onClick={() => {
                      setConfig({
                        ...config,
                        system_prompt:
                          'You are a 24/7 Technical & Customer Support Agent. Answer customer questions clearly, troubleshoot common problems step-by-step, and provide direct help. If the customer expresses frustration or the issue cannot be resolved via chat, gracefully offer to transfer to a human specialist.',
                        welcome_message:
                          'Hello! ⚙️ You have reached 24/7 Customer Support. Please describe your issue and I will resolve it immediately.',
                        fallback_message:
                          'Connecting you to our Tier-2 technical support engineer right now. Thank you for your patience!',
                      });
                      toast.success('Applied 24/7 Support template!');
                    }}
                  >
                    🛠️ 24/7 Support Agent
                  </Button>
                </div>
              </div>

              <Textarea
                rows={6}
                className="mt-1 font-mono text-xs leading-relaxed"
                placeholder="Enter system prompt instructions for your AI agent..."
                value={config.system_prompt || ''}
                onChange={(e) => setConfig({ ...config, system_prompt: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Right: Greetings & Fallback */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-400" />
              Greetings & Failover
            </CardTitle>
            <CardDescription>Initial response and fallback triggers</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-300">Instant Welcome Message</label>
              <Textarea
                rows={3}
                className="mt-1"
                placeholder="Hello! Welcome to Sharyx..."
                value={config.welcome_message || ''}
                onChange={(e) => setConfig({ ...config, welcome_message: e.target.value })}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-300">Human Handover / Fallback Message</label>
              <Textarea
                rows={3}
                className="mt-1"
                placeholder="Let me connect you with a human specialist..."
                value={config.fallback_message || ''}
                onChange={(e) => setConfig({ ...config, fallback_message: e.target.value })}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-300 flex items-center gap-1">
                <ShieldAlert className="h-3.5 w-3.5 text-amber-400" />
                Opt-Out Keywords (Comma separated)
              </label>
              <Input
                className="mt-1"
                placeholder="STOP, UNSUBSCRIBE, CANCEL"
                value={config.stop_words?.join(', ') || ''}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    stop_words: e.target.value.split(',').map((s) => s.trim()),
                  })
                }
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Auto Follow-up Sequence */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-cyan-400" />
                Automated Lead Follow-up Drip
              </CardTitle>
              <CardDescription>
                Sends a nudge if customer goes silent after an initial inquiry
              </CardDescription>
            </div>
            <Switch
              checked={config.auto_followup_enabled}
              onCheckedChange={(val) => setConfig({ ...config, auto_followup_enabled: val })}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-300">Delay Time (Minutes)</label>
              <Input
                type="number"
                className="mt-1"
                value={config.followup_delay_minutes || 60}
                onChange={(e) =>
                  setConfig({ ...config, followup_delay_minutes: Number(e.target.value) })
                }
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-medium text-slate-300">Follow-up Message</label>
              <Input
                className="mt-1"
                placeholder="Hi! Just following up to see if you have any questions about our pricing."
                value={config.followup_message || ''}
                onChange={(e) => setConfig({ ...config, followup_message: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} variant="emerald" disabled={loading} className="px-6">
          <Save className="mr-2 h-4 w-4" />
          {loading ? 'Saving Brain...' : 'Save AI Configuration'}
        </Button>
      </div>
    </div>
  );
};
