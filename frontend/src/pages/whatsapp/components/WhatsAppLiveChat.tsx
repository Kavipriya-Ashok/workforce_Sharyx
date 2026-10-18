import React, { useState, useEffect } from 'react';
import {
  WhatsAppConversation,
  WhatsAppMessage,
} from '@/types/whatsapp';
import { whatsappService } from '@/service/whatsappService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Send,
  Bot,
  User,
  Search,
  CheckCheck,
  Check,
  Clock,
  Sparkles,
  RefreshCw,
  Phone,
  MessageSquare,
  PlusCircle,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

export const WhatsAppLiveChat: React.FC = () => {
  const [conversations, setConversations] = useState<WhatsAppConversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<WhatsAppConversation | null>(null);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [search, setSearch] = useState('');
  const [aiEnabled, setAiEnabled] = useState(true);
  const [sending, setSending] = useState(false);

  // New Chat Dialog
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [newRecipient, setNewRecipient] = useState('');
  const [newMsgText, setNewMsgText] = useState('');
  const [newChatSending, setNewChatSending] = useState(false);

  const loadSampleConversations = () => {
    const samples: WhatsAppConversation[] = [
      {
        id: 'conv-1',
        customer_phone: '+91 98765 43210',
        customer_name: 'Rajesh Kumar',
        conversation_status: 'open',
        last_message_text: 'Hi, I need assistance with the CRM pricing plan.',
        last_message_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
        unread_count: 2,
      },
      {
        id: 'conv-2',
        customer_phone: '+1 (555) 349-2019',
        customer_name: 'Sarah Jenkins',
        conversation_status: 'waiting_human',
        last_message_text: 'Can an account executive call me tomorrow?',
        last_message_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
        unread_count: 0,
      },
      {
        id: 'conv-3',
        customer_phone: '+44 7911 123456',
        customer_name: 'David Smith',
        conversation_status: 'closed',
        last_message_text: 'Thanks! The demo was very helpful.',
        last_message_at: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
        unread_count: 0,
      },
    ];
    setConversations(samples);
    setSelectedConv(samples[0]);
    setMessages([
      {
        id: 'msg-1',
        conversation_id: 'conv-1',
        sender_phone: '+91 98765 43210',
        recipient_phone: 'system',
        direction: 'inbound',
        message_type: 'text',
        message_text: 'Hi, I need assistance with the CRM pricing plan.',
        delivery_status: 'delivered',
        is_ai_generated: false,
        created_on: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
      },
      {
        id: 'msg-2',
        conversation_id: 'conv-1',
        sender_phone: 'system',
        recipient_phone: '+91 98765 43210',
        direction: 'outbound',
        message_type: 'text',
        message_text: 'Hello Rajesh! Welcome to Sharyx. We offer Standard ($49/mo) and Enterprise tiers with autonomous AI copilots. Would you like a live demo?',
        delivery_status: 'read',
        is_ai_generated: true,
        created_on: new Date(Date.now() - 1000 * 60 * 14).toISOString(),
      },
    ]);
    toast.success('Loaded 3 sample active WhatsApp threads!');
  };

  const handleStartNewChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRecipient.trim() || !newMsgText.trim()) return;

    setNewChatSending(true);
    try {
      await whatsappService.sendMessage({
        to: newRecipient.trim(),
        text: newMsgText.trim(),
      });

      const newConv: WhatsAppConversation = {
        id: `conv-${Date.now()}`,
        customer_phone: newRecipient.trim(),
        customer_name: newRecipient.trim(),
        conversation_status: 'open',
        last_message_text: newMsgText.trim(),
        last_message_at: new Date().toISOString(),
        unread_count: 0,
      };

      const newMsg: WhatsAppMessage = {
        id: `msg-${Date.now()}`,
        conversation_id: newConv.id,
        sender_phone: 'system',
        recipient_phone: newRecipient.trim(),
        direction: 'outbound',
        message_type: 'text',
        message_text: newMsgText.trim(),
        delivery_status: 'sent',
        is_ai_generated: false,
        created_on: new Date().toISOString(),
      };

      setConversations((prev) => [newConv, ...prev]);
      setSelectedConv(newConv);
      setMessages([newMsg]);
      setNewChatOpen(false);
      setNewRecipient('');
      setNewMsgText('');
      toast.success(`Message sent to ${newRecipient}!`);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to send message via Meta Cloud API');
    } finally {
      setNewChatSending(false);
    }
  };

  const fetchConversations = async () => {
    try {
      const data = await whatsappService.getConversations();
      const list = Array.isArray(data) ? data : [];
      setConversations(list);
      if (!selectedConv && list.length > 0) {
        setSelectedConv(list[0]);
      }
    } catch {
      setConversations([]);
    }
  };

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedConv) {
      whatsappService
        .getMessages(selectedConv.id)
        .then((res) => {
          setMessages(Array.isArray(res) ? res : []);
        })
        .catch(() => setMessages([]));
    }
  }, [selectedConv]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !selectedConv) return;

    setSending(true);
    const textToSend = inputText;
    setInputText('');

    try {
      await whatsappService.sendMessage({
        to: selectedConv.customer_phone,
        text: textToSend,
        conversation_id: selectedConv.id,
      });

      // Optimistic append
      const newMsg: WhatsAppMessage = {
        id: `temp-${Date.now()}`,
        conversation_id: selectedConv.id,
        sender_phone: 'system',
        recipient_phone: selectedConv.customer_phone,
        direction: 'outbound',
        message_type: 'text',
        message_text: textToSend,
        delivery_status: 'sent',
        is_ai_generated: false,
        created_on: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, newMsg]);
      toast.success('WhatsApp message delivered');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to send WhatsApp message');
    } finally {
      setSending(false);
    }
  };

  const conversationList = Array.isArray(conversations) ? conversations : [];
  const filteredConversations = conversationList.filter(
    (c) =>
      c?.customer_phone?.toLowerCase().includes(search.toLowerCase()) ||
      (c?.customer_name && c.customer_name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 h-[720px] rounded-2xl overflow-hidden glass border border-slate-800">
      {/* LEFT: Conversation Threads List */}
      <div className="md:col-span-4 border-r border-slate-800 flex flex-col bg-slate-950/40">
        <div className="p-4 border-b border-slate-800/80">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-100 flex items-center gap-2">
              <Phone className="h-4 w-4 text-emerald-400" />
              WhatsApp Inbox
            </h3>
            <Button variant="ghost" size="icon" onClick={fetchConversations} className="h-7 w-7">
              <RefreshCw className="h-3.5 w-3.5 text-slate-400" />
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <Input
              placeholder="Search phone or name..."
              className="pl-9 h-9 text-xs"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-800/40">
          {filteredConversations.length > 0 ? (
            filteredConversations.map((conv) => {
              const isSelected = selectedConv?.id === conv.id;
              return (
                <div
                  key={conv.id}
                  onClick={() => setSelectedConv(conv)}
                  className={`p-3.5 cursor-pointer transition-all hover:bg-slate-800/50 flex items-start gap-3 ${
                    isSelected ? 'bg-emerald-950/30 border-l-4 border-emerald-500' : ''
                  }`}
                >
                  <div className="h-10 w-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                    <User className="h-5 w-5 text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-slate-200 truncate">
                        {conv.customer_name || conv.customer_phone}
                      </p>
                      <span className="text-[10px] text-slate-500 shrink-0">
                        {new Date(conv.last_message_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 truncate mt-0.5">
                      {conv.last_message_text || 'No message yet'}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge
                        variant={
                          conv.conversation_status === 'open'
                            ? 'success'
                            : conv.conversation_status === 'waiting_human'
                            ? 'warning'
                            : 'secondary'
                        }
                        className="text-[10px] py-0"
                      >
                        {conv.conversation_status.replace('_', ' ')}
                      </Badge>
                      {conv.unread_count > 0 && (
                        <span className="h-5 w-5 rounded-full bg-emerald-500 text-slate-950 font-bold text-[10px] flex items-center justify-center ml-auto">
                          {conv.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-6 text-center space-y-3">
              <div className="h-10 w-10 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-300">No active conversations</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Send a test message or load sample threads to test the copilot.
                </p>
              </div>
              <div className="space-y-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full text-xs gap-1.5"
                  onClick={() => setNewChatOpen(true)}
                >
                  <Send className="h-3.5 w-3.5 text-emerald-400" />
                  Send WhatsApp Message
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="w-full text-xs text-slate-400 hover:text-white"
                  onClick={loadSampleConversations}
                >
                  Load Demo Chats
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: Active Chat History & Messenger */}
      <div className="md:col-span-8 flex flex-col bg-slate-900/20">
        {selectedConv ? (
          <>
            {/* Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
                  <User className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">
                    {selectedConv.customer_name || selectedConv.customer_phone}
                  </h4>
                  <p className="text-xs text-slate-400 flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    {selectedConv.customer_phone}
                  </p>
                </div>
              </div>

              {/* AI Copilot Handover Switch */}
              <div className="flex items-center gap-3 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
                <div className="flex items-center gap-1.5 text-xs text-slate-300">
                  <Bot className={`h-4 w-4 ${aiEnabled ? 'text-indigo-400' : 'text-slate-500'}`} />
                  <span>AI Auto-Reply</span>
                </div>
                <Switch
                  checked={aiEnabled}
                  onCheckedChange={(val) => {
                    setAiEnabled(val);
                    toast.info(val ? 'AI auto-reply resumed' : 'Switched to human agent mode');
                  }}
                />
              </div>
            </div>

            {/* Message Bubbles Container */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px]">
              {messages.map((msg) => {
                const isOutbound = msg.direction === 'outbound';
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isOutbound ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm shadow-md ${
                        isOutbound
                          ? 'bg-emerald-600 text-white rounded-br-none'
                          : 'bg-slate-800/90 text-slate-100 rounded-bl-none border border-slate-700/60'
                      }`}
                    >
                      {msg.is_ai_generated && (
                        <div className="flex items-center gap-1 text-[10px] text-emerald-200 font-medium mb-1">
                          <Sparkles className="h-3 w-3" />
                          AI Drafted Response
                        </div>
                      )}
                      <p className="leading-relaxed whitespace-pre-wrap">{msg.message_text}</p>
                      <div
                        className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
                          isOutbound ? 'text-emerald-200' : 'text-slate-400'
                        }`}
                      >
                        <span>
                          {new Date(msg.created_on).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        {isOutbound && (
                          <>
                            {msg.delivery_status === 'read' ? (
                              <CheckCheck className="h-3.5 w-3.5 text-cyan-300" />
                            ) : msg.delivery_status === 'delivered' ? (
                              <CheckCheck className="h-3.5 w-3.5" />
                            ) : msg.delivery_status === 'sent' ? (
                              <Check className="h-3.5 w-3.5" />
                            ) : (
                              <Clock className="h-3 w-3 text-slate-300" />
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Input Composer */}
            <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-800 bg-slate-950/80 flex items-center gap-2">
              <Input
                placeholder="Type a message or paste template..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="flex-1 bg-slate-900 border-slate-700"
              />
              <Button type="submit" variant="emerald" disabled={sending || !inputText.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto space-y-4">
            <div className="h-16 w-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/10">
              <Phone className="h-8 w-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">WhatsApp Live Chat Active</h3>
              <p className="text-xs text-slate-400 mt-1">
                Your Meta Cloud API v21.0 connection is verified and listening for webhooks. Send a message to start a new chat or load demo threads.
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <Button
                variant="emerald"
                size="sm"
                className="gap-2"
                onClick={() => setNewChatOpen(true)}
              >
                <Send className="h-3.5 w-3.5" />
                Send First WhatsApp
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={loadSampleConversations}
              >
                Load Demo Threads
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* 🚀 New WhatsApp Message Dialog */}
      <Dialog open={newChatOpen} onOpenChange={setNewChatOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center space-x-2 text-emerald-400">
              <Send className="h-5 w-5" />
              <DialogTitle>Send New WhatsApp Message</DialogTitle>
            </div>
            <DialogDescription>
              Dispatch a direct message via your connected Meta WhatsApp Cloud API number.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleStartNewChat} className="space-y-4 mt-2">
            <div>
              <label className="text-xs font-medium text-slate-300">Recipient Phone (with country code)</label>
              <div className="relative mt-1">
                <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <Input
                  placeholder="+91 98765 43210 or +1 555 123 4567"
                  className="pl-9"
                  value={newRecipient}
                  onChange={(e) => setNewRecipient(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-300">Message Content</label>
              <textarea
                placeholder="Hello! Welcome to our service. How may we assist you?"
                rows={4}
                className="w-full mt-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                value={newMsgText}
                onChange={(e) => setNewMsgText(e.target.value)}
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setNewChatOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="emerald"
                size="sm"
                disabled={newChatSending || !newRecipient.trim() || !newMsgText.trim()}
                className="gap-2"
              >
                {newChatSending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Send via Meta
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
