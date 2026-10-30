import React, { useState, useEffect, useRef } from 'react';
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
  Calendar,
  Building2,
  Database,
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
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // New Chat Dialog
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [newRecipient, setNewRecipient] = useState('');
  const [newMsgText, setNewMsgText] = useState('');
  const [newChatSending, setNewChatSending] = useState(false);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const data = await whatsappService.getConversations();
      const list = Array.isArray(data) ? data : [];
      setConversations(list);

      // Select first conversation if none selected yet or previous one not found
      if (list.length > 0) {
        setSelectedConv((prev) => {
          if (!prev) return list[0];
          const matched = list.find((c) => c.id === prev.id);
          return matched || list[0];
        });
      }
    } catch (err: any) {
      toast.error('Could not fetch conversations from database');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 8000);
    return () => clearInterval(interval);
  }, []);

  // Fetch real messages for selected conversation
  useEffect(() => {
    if (selectedConv?.id) {
      whatsappService
        .getMessages(selectedConv.id)
        .then((res) => {
          setMessages(Array.isArray(res) ? res : []);
          setTimeout(() => scrollToBottom('auto'), 50);
        })
        .catch(() => setMessages([]));
    } else {
      setMessages([]);
    }
  }, [selectedConv?.id]);

  // Auto-scroll to bottom whenever messages list updates
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Live polling for new incoming messages every 3s
  useEffect(() => {
    if (!selectedConv?.id) return;
    const interval = setInterval(() => {
      whatsappService
        .getMessages(selectedConv.id)
        .then((res) => {
          if (Array.isArray(res) && res.length !== messages.length) {
            setMessages(res);
          }
        })
        .catch(() => {});
    }, 3000);
    return () => clearInterval(interval);
  }, [selectedConv?.id, messages.length]);

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
      toast.success('WhatsApp message delivered!');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to send WhatsApp message');
    } finally {
      setSending(false);
    }
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

  const conversationList = Array.isArray(conversations) ? conversations : [];
  const filteredConversations = conversationList.filter(
    (c) =>
      c?.customer_phone?.toLowerCase().includes(search.toLowerCase()) ||
      (c?.customer_name && c.customer_name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-0 h-[calc(100vh-140px)] min-h-[580px] rounded-2xl overflow-hidden border border-blue-150 bg-white shadow-xs">
      {/* LEFT: Conversation Threads List */}
      <div className="md:col-span-4 border-r border-blue-100 flex flex-col h-full bg-slate-50/70 overflow-hidden">
        {/* Search & Actions Bar */}
        <div className="p-4 border-b border-blue-100 bg-white">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                <MessageSquare className="h-3.5 w-3.5" />
              </div>
              <h3 className="font-bold text-sm text-slate-900">
                WhatsApp Inbox
              </h3>
              <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] px-1.5 py-0 font-bold">
                {conversationList.length} Active
              </Badge>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={fetchConversations}
                disabled={loading}
                title="Sync from Database"
                className="h-8 w-8 text-slate-500 hover:text-blue-600 hover:bg-blue-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
              </Button>
              <Button
                size="sm"
                onClick={() => setNewChatOpen(true)}
                className="h-8 px-2.5 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-1 shadow-xs"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                <span>New</span>
              </Button>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <Input
              placeholder="Search phone or customer name..."
              className="pl-9 h-9 text-xs bg-slate-50 border-slate-200 focus:bg-white text-slate-900 placeholder:text-slate-400"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto divide-y divide-blue-50">
          {filteredConversations.length > 0 ? (
            filteredConversations.map((conv) => {
              const isSelected = selectedConv?.id === conv.id;
              const formattedDate = conv.last_message_at
                ? new Date(conv.last_message_at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : '';

              return (
                <div
                  key={conv.id}
                  onClick={() => setSelectedConv(conv)}
                  className={`p-3.5 cursor-pointer transition-all flex items-start gap-3 ${
                    isSelected
                      ? 'bg-blue-50/90 border-l-4 border-blue-600 shadow-xs'
                      : 'hover:bg-slate-100/70 bg-transparent'
                  }`}
                >
                  <div
                    className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 font-bold text-xs ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-blue-100/70 text-blue-700 border border-blue-200'
                    }`}
                  >
                    {conv.customer_name ? conv.customer_name[0].toUpperCase() : 'W'}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className={`text-xs font-bold truncate ${isSelected ? 'text-blue-950' : 'text-slate-800'}`}>
                        {conv.customer_name || `+${conv.customer_phone}`}
                      </p>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {formattedDate}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] font-mono text-blue-700 font-medium">
                        +{conv.customer_phone}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 truncate mt-1">
                      {conv.last_message_text || 'Active WhatsApp inquiry'}
                    </p>

                    <div className="flex items-center gap-2 mt-2">
                      <Badge
                        variant="outline"
                        className={`text-[9px] py-0 px-1.5 font-semibold uppercase ${
                          conv.conversation_status === 'open'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {conv.conversation_status || 'open'}
                      </Badge>

                      {conv.unread_count > 0 && (
                        <span className="h-4 min-w-[16px] px-1 rounded-full bg-blue-600 text-white font-bold text-[9px] flex items-center justify-center ml-auto">
                          {conv.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center space-y-3">
              <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center mx-auto text-blue-600">
                <Database className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">No conversations found</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Click Sync to pull live threads from the database.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={fetchConversations}
                className="text-xs font-semibold text-blue-700 border-blue-200 hover:bg-blue-50"
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                Sync Database
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: Active Chat History & Messenger */}
      <div className="md:col-span-8 flex flex-col h-full bg-[#f8fafc] overflow-hidden">
        {selectedConv ? (
          <>
            {/* Header */}
            <div className="shrink-0 p-3.5 sm:px-5 border-b border-blue-100 flex items-center justify-between bg-white shadow-xs">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                  {selectedConv.customer_name ? selectedConv.customer_name[0].toUpperCase() : 'C'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-slate-900">
                      {selectedConv.customer_name || `Customer (+${selectedConv.customer_phone})`}
                    </h4>
                    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] py-0 font-semibold">
                      Connected
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                    <Phone className="h-3 w-3 text-emerald-600" />
                    <span className="font-mono font-medium text-slate-700">+{selectedConv.customer_phone}</span>
                    <span className="text-slate-300">•</span>
                    <span>Thread ID: <code className="text-slate-500 font-mono text-[10px]">{selectedConv.id?.slice(0, 8)}</code></span>
                  </p>
                </div>
              </div>

              {/* AI Copilot Handover Switch */}
              <div className="flex items-center gap-2.5 bg-blue-50/70 px-3 py-1.5 rounded-xl border border-blue-200/80">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-900">
                  <Bot className={`h-4 w-4 ${aiEnabled ? 'text-blue-600' : 'text-slate-400'}`} />
                  <span className="hidden sm:inline">AI Auto-Reply</span>
                </div>
                <Switch
                  checked={aiEnabled}
                  onCheckedChange={(val) => {
                    setAiEnabled(val);
                    toast.info(val ? 'AI copilot auto-reply enabled' : 'Switched to human agent mode');
                  }}
                />
              </div>
            </div>

            {/* Message Bubbles Container */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 min-h-0">
              {messages.length > 0 ? (
                messages.map((msg) => {
                  const isOutbound = msg.direction === 'outbound';
                  const msgTime = msg.created_on
                    ? new Date(msg.created_on).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '';

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isOutbound ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-xs shadow-xs leading-relaxed ${
                          isOutbound
                            ? 'bg-blue-600 text-white rounded-br-xs'
                            : 'bg-white text-slate-800 border border-slate-200/90 rounded-bl-xs'
                        }`}
                      >
                        {msg.is_ai_generated && (
                          <div className="flex items-center gap-1 text-[10px] text-blue-100 font-semibold mb-1">
                            <Sparkles className="h-3 w-3 text-amber-300" />
                            AI Copilot Drafted
                          </div>
                        )}
                        <p className="whitespace-pre-wrap">{msg.message_text}</p>
                        <div
                          className={`flex items-center justify-end gap-1 mt-1 text-[9px] ${
                            isOutbound ? 'text-blue-100' : 'text-slate-400'
                          }`}
                        >
                          <span>{msgTime}</span>
                          {isOutbound && (
                            <>
                              {msg.delivery_status === 'read' ? (
                                <CheckCheck className="h-3 w-3 text-cyan-200" />
                              ) : msg.delivery_status === 'delivered' ? (
                                <CheckCheck className="h-3 w-3 text-white" />
                              ) : msg.delivery_status === 'sent' ? (
                                <Check className="h-3 w-3 text-white" />
                              ) : (
                                <Clock className="h-3 w-3 text-blue-200" />
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 space-y-2">
                  <MessageSquare className="h-8 w-8 text-slate-300 mx-auto" />
                  <p className="text-xs font-semibold text-slate-600">No messages in this thread yet</p>
                  <p className="text-[11px] text-slate-400">Type a message below to begin chatting with this customer.</p>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Composer */}
            <form onSubmit={handleSendMessage} className="shrink-0 p-3 border-t border-blue-100 bg-white flex items-center gap-2">
              <Input
                placeholder={`Reply to ${selectedConv.customer_name || selectedConv.customer_phone}...`}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="flex-1 bg-slate-50 border-slate-200 focus:bg-white text-xs text-slate-900 placeholder:text-slate-400 h-10"
              />
              <Button
                type="submit"
                disabled={sending || !inputText.trim()}
                className="h-10 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs gap-1.5 shadow-sm shadow-blue-500/20"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                <span className="hidden sm:inline">Send</span>
              </Button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto space-y-4">
            <div className="h-16 w-16 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-sm shadow-blue-500/10">
              <Phone className="h-8 w-8" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">WhatsApp Live Inbox Ready</h3>
              <p className="text-xs text-slate-500 mt-1">
                Connected to Meta Cloud API. Select an active conversation from the left to read messages or start a new outbound message.
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <Button
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-1.5 shadow-xs"
                onClick={() => setNewChatOpen(true)}
              >
                <Send className="h-3.5 w-3.5" />
                Start New Chat
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchConversations}
                className="text-slate-700 border-slate-200 hover:bg-slate-50"
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1" />
                Sync Database
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* 🚀 New WhatsApp Message Dialog */}
      <Dialog open={newChatOpen} onOpenChange={setNewChatOpen}>
        <DialogContent className="max-w-md bg-white border border-blue-150 shadow-xl">
          <DialogHeader>
            <div className="flex items-center space-x-2 text-blue-600">
              <Send className="h-5 w-5" />
              <DialogTitle className="text-slate-900">Send New WhatsApp Message</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-500">
              Dispatch a direct message via your verified Meta WhatsApp Cloud API number.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleStartNewChat} className="space-y-4 mt-2">
            <div>
              <label className="text-xs font-semibold text-slate-700">Recipient Phone (with country code)</label>
              <div className="relative mt-1">
                <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="+91 98765 43210 or 919655509060"
                  className="pl-9 bg-slate-50 border-slate-200 focus:bg-white text-xs text-slate-900"
                  value={newRecipient}
                  onChange={(e) => setNewRecipient(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700">Message Content</label>
              <textarea
                placeholder="Hello! Welcome to Sharyx Workforce. How can we help you today?"
                rows={4}
                className="w-full mt-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                value={newMsgText}
                onChange={(e) => setNewMsgText(e.target.value)}
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setNewChatOpen(false)}
                className="text-slate-600 hover:text-slate-800"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={newChatSending || !newRecipient.trim() || !newMsgText.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-1.5 shadow-xs"
              >
                {newChatSending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Send Message
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
